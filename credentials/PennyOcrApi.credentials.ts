import type {
	IAuthenticateGeneric,
	ICredentialType,
	Icon,
	ICredentialTestRequest,
	INodeProperties,
} from 'n8n-workflow';

export class PennyOcrApi implements ICredentialType {
	name = 'pennyOcrApi';
	displayName = 'PennyOCR API';
	icon: Icon = { light: 'file:pennyocr.svg', dark: 'file:pennyocr.dark.svg' };
	documentationUrl = 'https://pennyocr.com/docs';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
			description: 'API key issued by PennyOCR',
			typeOptions: {
				password: true,
			},
			required: true,
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: { Authorization: '={{$credentials.apiKey ? "Bearer " + $credentials.apiKey : ""}}' },
		},
	};

	test: ICredentialTestRequest = {
		request: { baseURL: 'https://api.pennyocr.com', url: '/v1/balance', method: 'GET' },
	};
}
