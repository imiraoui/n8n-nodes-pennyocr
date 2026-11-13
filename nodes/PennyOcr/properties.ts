import type { INodeProperties } from 'n8n-workflow';

export const properties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				value: 'estimate',
				name: 'Estimate Cost',
				action: 'Estimate document cost',
				description: 'Estimate page count and cost without OCR billing',
			},
			{
				value: 'ocrFile',
				name: 'Extract From File',
				action: 'Extract text from a file',
				description: 'Extract text or Markdown from an incoming binary file',
			},
			{
				value: 'ocrUrl',
				name: 'Extract From URL',
				action: 'Extract text from a document URL',
				description: 'Extract text or Markdown from a document URL',
			},
			{
				name: 'Get Balance',
				value: 'balance',
				action: 'Get OCR credit balance',
				description: 'Get credit balance and free-page allowances without OCR billing',
			},
		],
		default: 'ocrUrl',
	},
	{
		displayName: 'Document URL',
		name: 'url',
		type: 'string',
		default: '',
		description: 'Public HTTPS URL of the document to process',
		displayOptions: {
			show: {
				operation: ['ocrUrl', 'estimate'],
			},
		},
		required: true,
		placeholder: 'https://example.com/report.pdf',
	},
	{
		displayName: 'Input Binary Field',
		name: 'binaryProperty',
		type: 'string',
		default: 'data',
		description: 'Name of the incoming binary field containing the document',
		displayOptions: {
			show: {
				operation: ['ocrFile'],
			},
		},
		required: true,
	},
	{
		displayName: 'Output Format',
		name: 'format',
		type: 'options',
		default: 'markdown',
		options: [
			{
				name: 'Markdown',
				value: 'markdown',
			},
			{
				name: 'Text',
				value: 'text',
			},
		],
		displayOptions: {
			show: {
				operation: ['ocrUrl', 'ocrFile'],
			},
		},
	},
	{
		displayName: 'Pages',
		name: 'pages',
		type: 'string',
		default: '',
		description: 'Optional page selection, for example 1-20,25',
		displayOptions: {
			show: {
				operation: ['ocrUrl', 'estimate'],
			},
		},
	},
	{
		displayName: 'Maximum Pages',
		name: 'maxPages',
		type: 'number',
		default: 10,
		description: 'Reject the request if the selected pages exceed this cap',
		displayOptions: {
			show: {
				operation: ['ocrUrl'],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
	},
	{
		displayName: 'Maximum Cost (USD)',
		name: 'maxCostUsd',
		type: 'number',
		default: 0.01,
		description: 'Reject the request if the estimated cost exceeds this cap',
		displayOptions: {
			show: {
				operation: ['ocrUrl'],
			},
		},
		typeOptions: {
			minValue: 0,
			numberPrecision: 5,
		},
	},
];
