'use strict';

const STOP_WORDS = new Set([
    'show',
    'make',
    'give',
    'please',
    'chart',
    'an',
    'a',
    'the',
    'of',
    'for',
    'with',
    'and',
    'all',
    'data',
    'records',
    'record',
    'rows',
    'row',
    'me',
    'compare',
    'display',
    'plot',
    'lets',
    "let's",
    'versus',
    'vs',
    'versus',
    'against'
]);

const AGGREGATOR_SYNONYMS = [
    { key: 'count', tokens: ['count', 'number of', 'how many', 'total rows'] },
    { key: 'sum', tokens: ['sum', 'total', 'add up'] },
    { key: 'mean', tokens: ['average', 'avg', 'mean'] },
    { key: 'max', tokens: ['maximum', 'max', 'highest'] },
    { key: 'min', tokens: ['minimum', 'min', 'lowest'] }
];

const AGGREGATOR_DISPLAY = {
    count: 'count of records',
    sum: 'sum of',
    mean: 'average of',
    max: 'maximum of',
    min: 'minimum of',
    none: ''
};

const AGGREGATOR_TO_AGGNAME = {
    count: 'count',
    sum: 'sum',
    mean: 'mean',
    max: 'max',
    min: 'min',
    none: undefined
};

const TEMPORAL_HINT_REGEX = /(date|time|year|month|day|week|quarter)/i;
const TREND_HINT_REGEX = /(over time|trend|timeline|progression)/i;

const SEPARATORS = [
    { key: 'vs', pattern: /\b(?:vs\.?|versus)\b/i },
    { key: 'by', pattern: /\bby\b/i },
    { key: 'per', pattern: /\bper\b/i },
    { key: 'over', pattern: /\bover\b/i },
    { key: 'against', pattern: /\bagainst\b/i }
];

function normalize(text) {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function toTokens(text) {
    return normalize(text)
        .split(' ')
        .filter((token) => token && !STOP_WORDS.has(token));
}

function preprocessFields(fields) {
    return fields.map((field) => {
        const name = field.name || field.fid;
        const normalized = normalize(name);
        const tokens = normalized.split(' ').filter(Boolean);
        const semantic = field.semanticType || (field.analyticType === 'measure' ? 'quantitative' : 'nominal');
        const analyticType = field.analyticType || (semantic === 'quantitative' ? 'measure' : 'dimension');
        const isTemporal = semantic === 'temporal' || TEMPORAL_HINT_REGEX.test(normalized);
        const isNumeric = semantic === 'quantitative' || analyticType === 'measure';
        return {
            field,
            normalized,
            tokens,
            isTemporal,
            isNumeric,
            analyticType,
            semantic
        };
    });
}

function detectAggregator(query) {
    const lowered = query.toLowerCase();
    for (const entry of AGGREGATOR_SYNONYMS) {
        for (const phrase of entry.tokens) {
            const phraseRegex = new RegExp(`\\b${phrase.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
            if (phraseRegex.test(lowered)) {
                return { key: entry.key, phrase };
            }
        }
    }
    return null;
}

function removeAggregatorPhrases(text, aggregatorInfo) {
    if (!aggregatorInfo) return text;
    let updated = text;
    for (const entry of AGGREGATOR_SYNONYMS) {
        for (const phrase of entry.tokens) {
            const phraseRegex = new RegExp(`\\b${phrase.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi');
            updated = updated.replace(phraseRegex, ' ');
        }
    }
    return updated;
}

function splitSegments(query) {
    for (const separator of SEPARATORS) {
        if (separator.pattern.test(query)) {
            const parts = query.split(separator.pattern).map((part) => part.trim()).filter(Boolean);
            if (parts.length >= 2) {
                return { segments: parts.slice(0, 3), separator: separator.key };
            }
        }
    }
    return { segments: [], separator: null };
}

function scoreFieldAgainstTokens(processedField, tokens) {
    if (!tokens.length) return 0;
    const { normalized, tokens: fieldTokens } = processedField;
    const normalizedSegment = tokens.join(' ');
    let score = 0;
    if (normalizedSegment === normalized) {
        score += 20;
    }
    if (normalized.includes(normalizedSegment) || normalizedSegment.includes(normalized)) {
        score += 10;
    }
    const overlap = fieldTokens.filter((token) => tokens.includes(token));
    score += overlap.length * 6;
    if (overlap.length === fieldTokens.length && overlap.length > 0) {
        score += 5;
    }
    return score;
}

function pickBestField(processedFields, tokens, options = {}) {
    const { prefer = 'any', used = new Set(), blacklist = new Set() } = options;
    let best = null;
    let bestScore = 0;
    for (const item of processedFields) {
        if (used.has(item.field.fid) || blacklist.has(item.field.fid)) continue;
        let score = scoreFieldAgainstTokens(item, tokens);
        if (prefer === 'dimension' && item.analyticType === 'dimension') {
            score += 6;
        }
        if (prefer === 'measure' && item.analyticType === 'measure') {
            score += 6;
        }
        if (prefer === 'temporal' && item.isTemporal) {
            score += 8;
        }
        if (score > bestScore) {
            best = item.field;
            bestScore = score;
        }
    }
    return { field: best, score: bestScore };
}

function pickTopFields(processedFields, tokens, limit = 3, excludeIds = new Set()) {
    const scored = processedFields
        .filter((item) => !excludeIds.has(item.field.fid))
        .map((item) => ({
            field: item.field,
            score: scoreFieldAgainstTokens(item, tokens)
        }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
}

function createEmptyState() {
    return {
        dimensions: [],
        measures: [],
        rows: [],
        columns: [],
        color: [],
        opacity: [],
        size: [],
        shape: [],
        radius: [],
        theta: [],
        longitude: [],
        latitude: [],
        geoId: [],
        details: [],
        filters: [],
        text: []
    };
}

function cloneField(field, overrides = {}) {
    return {
        fid: field.fid,
        name: field.name || field.fid,
        semanticType: field.semanticType || 'nominal',
        analyticType: field.analyticType || 'dimension',
        ...overrides
    };
}

function createCountMeasure() {
    const fid = 'gw_row_count';
    return {
        fid,
        name: 'Row Count',
        analyticType: 'measure',
        semanticType: 'quantitative',
        aggName: 'sum',
        computed: true,
        expression: {
            op: 'one',
            params: [],
            as: fid
        }
    };
}

function buildVisualConfig(geom, { aggregated, stacked }) {
    return {
        defaultAggregated: aggregated,
        geoms: [geom],
        showTableSummary: false,
        coordSystem: 'generic',
        stack: stacked ? 'stack' : 'none',
        showActions: false,
        interactiveScale: false,
        sorted: 'none',
        zeroScale: true,
        scaleIncludeUnmatchedChoropleth: false,
        background: undefined,
        size: {
            mode: 'fixed',
            width: 640,
            height: 420
        },
        format: {
            numberFormat: undefined,
            timeFormat: undefined,
            normalizedNumberFormat: undefined
        },
        geoKey: 'name',
        resolve: {
            x: false,
            y: false,
            color: false,
            opacity: false,
            shape: false,
            size: false
        },
        limit: -1
    };
}

function inferChartType({ aggregator, dimensionField, colorField, measureField, hasTrendHint }) {
    if (!dimensionField && measureField && aggregator === 'none') {
        return 'point';
    }
    const isTemporal = dimensionField && TEMPORAL_HINT_REGEX.test(normalize(dimensionField.name || dimensionField.fid));
    if (dimensionField && (isTemporal || hasTrendHint)) {
        return 'line';
    }
    if (colorField && aggregator === 'count') {
        return 'bar';
    }
    if (aggregator === 'none') {
        return 'point';
    }
    return 'bar';
}

function describeChart({
    chartType,
    aggregator,
    dimensionField,
    measureField,
    colorField
}) {
    if (chartType === 'point' && measureField && dimensionField && aggregator === 'none') {
        return `Plotting ${measureField.name} against ${dimensionField.name}.`;
    }
    if (chartType === 'point' && measureField) {
        return `Comparing ${measureField.name} across records.`;
    }
    const aggregatorText = AGGREGATOR_DISPLAY[aggregator] || 'summary of';
    if (dimensionField && measureField) {
        return `Showing the ${aggregatorText} ${aggregator === 'count' ? 'per ' : `of ${measureField.name} by `}${dimensionField.name}.`;
    }
    if (dimensionField && aggregator === 'count') {
        if (colorField) {
            return `Counting records by ${dimensionField.name} and highlighting ${colorField.name}.`;
        }
        return `Counting records by ${dimensionField.name}.`;
    }
    return `Generating a ${chartType} chart.`;
}

function ensureUniquePush(list, field) {
    if (!field) return;
    const exists = list.some((item) => item.fid === field.fid && item.aggName === field.aggName);
    if (!exists) {
        list.push(field);
    }
}

function parseQueryToRoles(query, fields) {
    const processedFields = preprocessFields(fields);
    const aggregatorInfo = detectAggregator(query);
    const cleanedQuery = removeAggregatorPhrases(query, aggregatorInfo);
    const { segments } = splitSegments(cleanedQuery);
    const used = new Set();

    const globalTokens = toTokens(cleanedQuery);
    const hasTrendHint = TREND_HINT_REGEX.test(query);

    let primaryDimension = null;
    let secondaryDimension = null;
    let measureField = null;
    let aggregator = aggregatorInfo ? aggregatorInfo.key : null;

    if (segments.length >= 2) {
        const firstTokens = toTokens(segments[0]);
        const secondTokens = toTokens(segments[1]);

        if (aggregator && aggregator !== 'count') {
            const firstMatch = pickBestField(processedFields, firstTokens, { prefer: 'measure', used });
            if (firstMatch.field && firstMatch.score > 0) {
                measureField = firstMatch.field;
                used.add(measureField.fid);
            }
            const secondMatch = pickBestField(processedFields, secondTokens, { prefer: 'dimension', used });
            if (secondMatch.field && secondMatch.score > 0) {
                primaryDimension = secondMatch.field;
                used.add(primaryDimension.fid);
            }
        } else {
            const firstMatch = pickBestField(processedFields, firstTokens, { prefer: 'dimension', used });
            if (firstMatch.field && firstMatch.score > 0) {
                primaryDimension = firstMatch.field;
                used.add(primaryDimension.fid);
            }
            const secondMatch = pickBestField(processedFields, secondTokens, { prefer: 'measure', used });
            if (secondMatch.field && secondMatch.score > 0) {
                measureField = secondMatch.field;
                used.add(measureField.fid);
            } else if (!aggregator || aggregator === 'count') {
                const secondDim = pickBestField(processedFields, secondTokens, { prefer: 'dimension', used });
                if (secondDim.field && secondDim.score > 0) {
                    secondaryDimension = secondDim.field;
                    used.add(secondaryDimension.fid);
                }
            }
        }

        if (!measureField) {
            const fallbackMeasure = pickBestField(processedFields, secondTokens, { prefer: 'measure', used });
            if (fallbackMeasure.field && fallbackMeasure.score > 0) {
                measureField = fallbackMeasure.field;
                used.add(measureField.fid);
            }
        }
    }

    if (!primaryDimension) {
        const bestDimension = pickBestField(processedFields, globalTokens, { prefer: 'dimension', used });
        if (bestDimension.field && bestDimension.score > 0) {
            primaryDimension = bestDimension.field;
            used.add(primaryDimension.fid);
        }
    }

    if (!measureField) {
        const bestMeasure = pickBestField(processedFields, globalTokens, { prefer: 'measure', used });
        if (bestMeasure.field && bestMeasure.score > 0) {
            measureField = bestMeasure.field;
            used.add(measureField.fid);
        }
    }

    if (!secondaryDimension) {
        const alternateTokens = globalTokens.filter((token) => !processedFields.some((item) => item.tokens.includes(token) && used.has(item.field.fid)));
        const secondDimensionCandidate = pickBestField(processedFields, alternateTokens, { prefer: 'dimension', used });
        if (secondDimensionCandidate.field && secondDimensionCandidate.score > 8) {
            secondaryDimension = secondDimensionCandidate.field;
            used.add(secondaryDimension.fid);
        }
    }

    if (!aggregator) {
        if (measureField && primaryDimension) {
            aggregator = 'sum';
        } else if (primaryDimension && secondaryDimension) {
            aggregator = 'count';
        } else if (measureField && !primaryDimension) {
            aggregator = 'none';
        } else {
            aggregator = 'count';
        }
    }

    if (aggregator !== 'count' && !measureField) {
        const bestMeasure = pickBestField(processedFields, globalTokens, { prefer: 'measure', used: new Set() });
        if (bestMeasure.field && bestMeasure.score > 0) {
            measureField = bestMeasure.field;
        }
    }

    if (aggregator === 'count') {
        measureField = measureField && processedFields.find((item) => item.field.fid === measureField.fid && item.isNumeric)
            ? measureField
            : null;
    }

    if (!primaryDimension && secondaryDimension) {
        primaryDimension = secondaryDimension;
        secondaryDimension = null;
    }

    return {
        aggregator,
        primaryDimension,
        secondaryDimension,
        measureField,
        processedFields,
        hasTrendHint
    };
}

function buildChartDefinition(query, fields) {
    const { aggregator, primaryDimension, secondaryDimension, measureField, processedFields, hasTrendHint } = parseQueryToRoles(query, fields);

    if (!primaryDimension && aggregator !== 'none') {
        return {
            success: false,
            message: "I couldn't identify which field should go on the axis. Try mentioning the category or dimension explicitly."
        };
    }

    if (aggregator !== 'count' && aggregator !== 'none' && !measureField) {
        return {
            success: false,
            message: "I couldn't find a numeric field to summarize. Try asking for the sum or average of a numeric column."
        };
    }

    const chartType = inferChartType({
        aggregator,
        dimensionField: primaryDimension,
        colorField: secondaryDimension,
        measureField,
        hasTrendHint
    });

    const isAggregated = aggregator !== 'none';
    const shouldStack = Boolean(secondaryDimension) && aggregator === 'count';
    const visualConfig = buildVisualConfig(chartType === 'point' ? 'point' : chartType, {
        aggregated: isAggregated,
        stacked: shouldStack
    });

    const state = createEmptyState();

    if (primaryDimension) {
        const dimView = cloneField(primaryDimension, {
            analyticType: 'dimension',
            semanticType: primaryDimension.semanticType || 'nominal'
        });
        ensureUniquePush(state.columns, dimView);
        ensureUniquePush(state.dimensions, cloneField(dimView));
    }

    let measureView = null;
    if (aggregator === 'count' && !measureField) {
        measureView = createCountMeasure();
    } else if (measureField) {
        const aggName = AGGREGATOR_TO_AGGNAME[aggregator] || undefined;
        measureView = cloneField(measureField, {
            analyticType: 'measure',
            semanticType: 'quantitative',
            aggName: aggName
        });
    }

    if (measureView) {
        ensureUniquePush(state.rows, cloneField(measureView));
        ensureUniquePush(state.measures, cloneField(measureView));
    }

    if (secondaryDimension) {
        const colorField = cloneField(secondaryDimension, {
            analyticType: 'dimension',
            semanticType: secondaryDimension.semanticType || 'nominal'
        });
        ensureUniquePush(state.color, colorField);
        ensureUniquePush(state.dimensions, cloneField(colorField));
    }

    if (chartType === 'point' && measureField && primaryDimension && aggregator === 'none') {
        const xField = cloneField(primaryDimension, {
            analyticType: 'measure',
            semanticType: 'quantitative'
        });
        const yField = cloneField(measureField, {
            analyticType: 'measure',
            semanticType: 'quantitative'
        });
        state.columns = [xField];
        state.rows = [yField];
        state.measures = [cloneField(xField), cloneField(yField)];
        state.dimensions = [];
    }

    const explanation = describeChart({
        chartType,
        aggregator,
        dimensionField: primaryDimension,
        measureField: measureField || measureView,
        colorField: secondaryDimension
    });

    const rendererChart = [{
        name: 'Chat Suggestion',
        visId: `chat-${Date.now()}`,
        config: visualConfig,
        layout: visualConfig,
        encodings: state
    }];

    return {
        success: true,
        chart: {
            type: chartType,
            aggregator,
            visualState: state,
            visualConfig,
            primaryDimension,
            secondaryDimension,
            measureField: measureField || measureView,
            rendererChart
        },
        explanation
    };
}

export function generateChatChart(query, gwData) {
    if (!gwData || !Array.isArray(gwData.fields) || gwData.fields.length === 0) {
        return {
            success: false,
            message: 'Load a dataset first so I know which fields to use.'
        };
    }

    const result = buildChartDefinition(query, gwData.fields);
    if (!result.success) {
        return result;
    }

    return {
        success: true,
        chart: result.chart,
        explanation: result.explanation
    };
}

export default generateChatChart;
