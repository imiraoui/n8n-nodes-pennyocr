import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { properties } from './properties';
import { buildRequest, multipartDocument, unwrapResponse } from './request';

export class PennyOcr implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PennyOCR',
		name: 'pennyOcr',
		icon: { light: 'file:pennyocr.svg', dark: 'file:pennyocr.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Extract document text and Markdown and estimate OCR cost',
		defaults: { name: 'PennyOCR' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'pennyOcrApi', required: true }],
		properties,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const output: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				const params: IDataObject = {};
				for (const property of properties) {
					const operations = property.displayOptions?.show?.operation;
					if (property.name !== 'operation' && (!operations || operations.includes(operation)))
						params[property.name] = this.getNodeParameter(
							property.name,
							itemIndex,
							property.default,
						) as IDataObject[string];
				}
				const plan = buildRequest('https://api.pennyocr.com', operation, params);
				if (plan.binaryProperty) {
					const binary = this.helpers.assertBinaryData(itemIndex, plan.binaryProperty);
					const data = await this.helpers.getBinaryDataBuffer(itemIndex, plan.binaryProperty);
					const multipart = multipartDocument(
						data,
						binary.fileName ?? 'document.pdf',
						binary.mimeType,
					);
					plan.options.body = multipart.body;
					plan.options.headers = { ...plan.options.headers, 'Content-Type': multipart.contentType };
				}
				const response = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'pennyOcrApi',
					plan.options,
				);
				output.push({ json: unwrapResponse(response, plan.rpc), pairedItem: { item: itemIndex } });
			} catch (error) {
				if (this.continueOnFail())
					output.push({ json: { error: error.message }, pairedItem: { item: itemIndex } });
				else throw new NodeOperationError(this.getNode(), error, { itemIndex });
			}
		}
		return [output];
	}
}
