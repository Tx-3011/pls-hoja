import generateChatChart from './chatRuleEngine';

const buildSampleData = () => ({
	fields: [
		{ fid: 'TemperatureUOM', name: 'TemperatureUOM', semanticType: 'nominal', analyticType: 'dimension' },
		{ fid: 'PressureUOM', name: 'PressureUOM', semanticType: 'nominal', analyticType: 'dimension' },
		{ fid: 'ReadingValue', name: 'ReadingValue', semanticType: 'quantitative', analyticType: 'measure' },
		{ fid: 'NodeAddress', name: 'NodeAddress', semanticType: 'nominal', analyticType: 'dimension' }
	],
	dataSource: [
		{ TemperatureUOM: 'F', PressureUOM: 'PSI', ReadingValue: 10, NodeAddress: 'A-1' },
		{ TemperatureUOM: 'C', PressureUOM: 'BAR', ReadingValue: 12, NodeAddress: 'A-2' }
	]
});

describe('chatRuleEngine field selection', () => {
	it('prefers exact identifier matches over other dimensions', () => {
		const gwData = buildSampleData();
		const result = generateChatChart('compare TemperatureUOM vs PressureUOM', gwData);

		expect(result.success).toBe(true);
		expect(result.chart.primaryDimension).toBeTruthy();
		expect(result.chart.primaryDimension.name).toBe('TemperatureUOM');
		expect(result.chart.secondaryDimension).toBeTruthy();
		expect(result.chart.secondaryDimension.name).toBe('PressureUOM');
		expect(result.chart.type).toBe('bar');
		expect(result.chart.primaryDimension.name).not.toBe('NodeAddress');
		expect(result.chart.secondaryDimension?.name).not.toBe('NodeAddress');
	});

	it('returns helpful message when no matching fields are found', () => {
		const gwData = buildSampleData();
		const result = generateChatChart('make something totally unrelated', gwData);

		expect(result.success).toBe(false);
		expect(result.message).toMatch(/mention the category/i);
	});
});
