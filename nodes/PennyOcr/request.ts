import type { IDataObject, IHttpRequestOptions } from 'n8n-workflow';

export interface RequestPlan {
	options: IHttpRequestOptions;
	rpc: boolean;
	binaryProperty?: string;
}

function required(p: IDataObject, key: string): string {
	const value = String(p[key] ?? '').trim();
	if (!value) throw new Error(`${key} is required`);
	return value;
}

function bounded(p: IDataObject, key: string, fallback: number, min: number, max: number): number {
	const value = Number(p[key] ?? fallback);
	if (!Number.isInteger(value) || value < min || value > max)
		throw new Error(`${key} must be an integer between ${min} and ${max}`);
	return value;
}

function pick(p: IDataObject, keys: string[]): IDataObject {
	return Object.fromEntries(
		keys
			.filter((key) => p[key] !== '' && p[key] !== undefined && p[key] !== null)
			.map((key) => [key, p[key]]),
	);
}

function enumValue(p: IDataObject, key: string, allowed: string[], fallback: string): string {
	const value = String(p[key] ?? fallback);
	if (!allowed.includes(value)) throw new Error(`Invalid ${key}`);
	return value;
}

export function buildRequest(base: string, operation: string, p: IDataObject): RequestPlan {
	const options: IHttpRequestOptions = {
		method: 'POST',
		url: base,
		json: true,
		timeout: 120000,
		disableFollowRedirect: true,
		headers: { Accept: 'application/json' },
	};
	const plan: RequestPlan = { options, rpc: false };
	const body: IDataObject = {};
	{
		if (operation === 'balance') {
			options.url += '/v1/balance';
			options.method = 'GET';
			return plan;
		}
		if (!['ocrUrl', 'ocrFile', 'estimate'].includes(operation))
			throw new Error('Unknown PennyOCR operation');
		options.url +=
			operation === 'estimate'
				? '/v1/estimate'
				: operation === 'ocrFile'
					? '/v1/ocr'
					: '/v1/ocr/url';
		options.timeout = 300000;
		if (operation === 'ocrFile') {
			plan.binaryProperty = required(p, 'binaryProperty');
			options.qs = { format: enumValue(p, 'format', ['markdown', 'text'], 'markdown') };
			return plan;
		}
		const url = required(p, 'url');
		if (!/^https:\/\//i.test(url)) throw new Error('Document URL must use HTTPS');
		body.url = url;
		Object.assign(body, pick(p, ['pages']));
		if (operation === 'ocrUrl') {
			body.format = enumValue(p, 'format', ['markdown', 'text'], 'markdown');
			body.max_pages = bounded(p, 'maxPages', 10, 1, 500);
			const cap = Number(p.maxCostUsd ?? 0.01);
			if (!Number.isFinite(cap) || cap < 0)
				throw new Error('Maximum cost must be a nonnegative number');
			body.max_cost_usd = cap;
		}
	}
	options.body = body;
	return plan;
}

export function unwrapResponse(response: unknown, rpc: boolean): IDataObject {
	if (!rpc)
		return Array.isArray(response)
			? { results: response }
			: response && typeof response === 'object'
				? (response as IDataObject)
				: { data: response as string };
	const envelope = response as {
		error?: { message?: string };
		result?: {
			isError?: boolean;
			structuredContent?: IDataObject;
			content?: Array<{ type: string; text?: string }>;
		};
	};
	if (envelope.error) throw new Error(envelope.error.message || 'Remote procedure call failed');
	if (!envelope.result) throw new Error('The API returned an invalid MCP response');
	const result = envelope.result;
	const text = (result.content ?? [])
		.filter((c) => c.type === 'text')
		.map((c) => c.text ?? '')
		.join('\n');
	if (result.isError) throw new Error(text || 'The API tool failed');
	if (result.structuredContent) return result.structuredContent;
	try {
		const parsed: unknown = JSON.parse(text);
		return Array.isArray(parsed)
			? { results: parsed }
			: parsed && typeof parsed === 'object'
				? (parsed as IDataObject)
				: { data: parsed as string };
	} catch {
		return { text };
	}
}

export function multipartDocument(
	data: Buffer,
	filename: string,
	mimeType: string,
): { body: Buffer; contentType: string } {
	let boundary = 'n8nPennyOcrDocumentBoundary';
	while (data.includes(Buffer.from(boundary))) boundary += 'X';
	const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_') || 'document.pdf';
	const safeType = /^[a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+$/.test(mimeType)
		? mimeType
		: 'application/octet-stream';
	const head = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${safeName}"\r\nContent-Type: ${safeType}\r\n\r\n`;
	return {
		body: Buffer.concat([Buffer.from(head), data, Buffer.from(`\r\n--${boundary}--\r\n`)]),
		contentType: `multipart/form-data; boundary=${boundary}`,
	};
}
