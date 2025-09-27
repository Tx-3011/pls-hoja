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

const SUPPORTED_CHART_TYPES = ['bar', 'line', 'area', 'point', 'stacked'];

const CHART_TYPE_ALIASES = {
    bar: 'bar',
    column: 'bar',
    histogram: 'bar',
    line: 'line',
    trend: 'line',
    area: 'area',
    'area chart': 'area',
    scatter: 'point',
    scatterplot: 'point',
    'scatter plot': 'point',
    point: 'point',
    dots: 'point',
    bubble: 'point',
    stacked: 'stacked',
    'stacked bar': 'stacked',
    'stacked column': 'stacked'
};

const TEMPORAL_HINT_REGEX = /(date|time|year|month|day|week|quarter)/i;
const TREND_HINT_REGEX = /(over time|trend|timeline|progression)/i;
const MIN_FIELD_SCORE = 6;

const SEPARATORS = [
    { key: 'vs', pattern: /\b(?:vs\.?|versus)\b/i },
    { key: 'by', pattern: /\bby\b/i },
    { key: 'per', pattern: /\bper\b/i },
    { key: 'over', pattern: /\bover\b/i },
    { key: 'against', pattern: /\bagainst\b/i }
];

function normalizePreferredChartType(preference) {
    if (!preference) return null;
    const key = preference.toLowerCase().trim();
    const normalized = CHART_TYPE_ALIASES[key] || key;
    if (SUPPORTED_CHART_TYPES.includes(normalized)) {
        return normalized;
    }
    if (normalized === 'stacked') {
        return 'stacked';
    }
    return null;
}

function makeProcessedFieldMap(processedFields) {
    const map = new Map();
    for (const item of processedFields) {
        map.set(item.field.fid, item);
    }
    return map;
}

function isNumericField(field, processedMap) {
    if (!field) return false;
    const meta = processedMap.get(field.fid);
    return Boolean(meta && meta.isNumeric);
}

function normalize(text) {
    if (!text) return '';
    const withSpaces = text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ');
    return withSpaces
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
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
        const baseScore = scoreFieldAgainstTokens(item, tokens);
        let score = baseScore;
        if (baseScore > 0) {
            if (prefer === 'dimension' && item.analyticType === 'dimension') {
                score += 6;
            }
            if (prefer === 'measure' && item.analyticType === 'measure') {
                score += 6;
            }
            if (prefer === 'temporal' && item.isTemporal) {
                score += 8;
            }
        }
        if (score > bestScore) {
            best = item.field;
            bestScore = score;
        }
    }
    return { field: bestScore >= MIN_FIELD_SCORE ? best : null, score: bestScore };
}

function pickBestNumericField(processedFields, tokens, used = new Set()) {
    const scored = processedFields
        .filter((item) => item.isNumeric && !used.has(item.field.fid))
        .map((item) => ({
            field: item.field,
            score: scoreFieldAgainstTokens(item, tokens)
        }))
        .sort((a, b) => b.score - a.score);
    return scored[0]?.field || null;
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
    colorField,
    axes
}) {
    if (chartType === 'point' && axes?.xField && axes?.yField) {
        const xName = axes.xField.name || axes.xField.fid;
        const yName = axes.yField.name || axes.yField.fid;
        if (colorField) {
            return `Plotting ${yName} versus ${xName} and coloring by ${colorField.name}.`;
        }
        return `Plotting ${yName} versus ${xName}.`;
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
    const chartLabel = chartType === 'point' ? 'scatter' : chartType;
    return `Generating a ${chartLabel} chart.`;
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

    const getMeta = (field) => {
        if (!field) return null;
        return processedFields.find((item) => item.field.fid === field.fid) || null;
    };

    const globalTokens = toTokens(cleanedQuery);
    const hasTrendHint = TREND_HINT_REGEX.test(query);

    let primaryDimension = null;
    let secondaryDimension = null;
    let measureField = null;
    let primarySource = null;
    let secondarySource = null;
    let measureSource = null;
    let aggregator = aggregatorInfo ? aggregatorInfo.key : null;

    if (segments.length >= 2) {
        const firstTokens = toTokens(segments[0]);
        const secondTokens = toTokens(segments[1]);

        if (aggregator && aggregator !== 'count') {
            const firstMatch = pickBestField(processedFields, firstTokens, { prefer: 'measure', used });
            if (firstMatch.field) {
                measureField = firstMatch.field;
                measureSource = 'segment1';
                used.add(measureField.fid);
            }
            const secondMatch = pickBestField(processedFields, secondTokens, { prefer: 'dimension', used });
            if (secondMatch.field) {
                primaryDimension = secondMatch.field;
                primarySource = 'segment2';
                used.add(primaryDimension.fid);
            }
        } else {
            const firstMatch = pickBestField(processedFields, firstTokens, { prefer: 'dimension', used });
            if (firstMatch.field) {
                primaryDimension = firstMatch.field;
                primarySource = 'segment1';
                used.add(primaryDimension.fid);
            }
            const secondMatch = pickBestField(processedFields, secondTokens, { prefer: 'measure', used });
            if (secondMatch.field) {
                const meta = getMeta(secondMatch.field);
                if (meta?.isNumeric || meta?.analyticType === 'measure') {
                    measureField = secondMatch.field;
                    measureSource = 'segment2';
                    used.add(measureField.fid);
                } else {
                    secondaryDimension = secondMatch.field;
                    secondarySource = 'segment2';
                    used.add(secondaryDimension.fid);
                }
            } else if (!aggregator || aggregator === 'count') {
                const secondDim = pickBestField(processedFields, secondTokens, { prefer: 'dimension', used });
                if (secondDim.field) {
                    secondaryDimension = secondDim.field;
                    secondarySource = 'segment2';
                    used.add(secondaryDimension.fid);
                }
            }
        }

        if (!measureField) {
            const fallbackMeasure = pickBestField(processedFields, secondTokens, { prefer: 'measure', used });
            if (fallbackMeasure.field) {
                measureField = fallbackMeasure.field;
                measureSource = measureSource ?? 'segment2-fallback';
                used.add(measureField.fid);
            }
        }
    }

    if (!primaryDimension) {
        const bestDimension = pickBestField(processedFields, globalTokens, { prefer: 'dimension', used });
        if (bestDimension.field) {
            primaryDimension = bestDimension.field;
            primarySource = primarySource ?? 'global';
            used.add(primaryDimension.fid);
        }
    }

    if (!measureField) {
        const bestMeasure = pickBestField(processedFields, globalTokens, { prefer: 'measure', used });
        if (bestMeasure.field) {
            const meta = getMeta(bestMeasure.field);
            if (meta?.isNumeric || meta?.analyticType === 'measure') {
                measureField = bestMeasure.field;
                measureSource = measureSource ?? 'global';
                used.add(measureField.fid);
            }
        }
    }

    if (!secondaryDimension) {
        const alternateTokens = globalTokens.filter((token) => !processedFields.some((item) => item.tokens.includes(token) && used.has(item.field.fid)));
        const secondDimensionCandidate = pickBestField(processedFields, alternateTokens, { prefer: 'dimension', used });
        if (secondDimensionCandidate.field) {
            secondaryDimension = secondDimensionCandidate.field;
            secondarySource = secondarySource ?? 'global';
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
        if (bestMeasure.field) {
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
        if (!primarySource) primarySource = secondarySource;
        secondarySource = null;
    }

    return {
        aggregator,
        primaryDimension,
        secondaryDimension,
        measureField,
        processedFields,
        hasTrendHint,
        tokens: globalTokens,
        primarySource,
        secondarySource,
        measureSource
    };
}

function resolveScatterFields({
    primaryDimension,
    measureField,
    secondaryDimension,
    processedFields,
    processedMap,
    tokens
}) {
    const used = new Set();
    const candidates = [];

    const addCandidate = (field) => {
        if (!field) return;
        if (used.has(field.fid)) return;
        if (!isNumericField(field, processedMap)) return;
        used.add(field.fid);
        candidates.push(field);
    };

    addCandidate(primaryDimension);
    addCandidate(measureField);
    addCandidate(secondaryDimension);

    if (candidates.length < 2) {
        const scored = processedFields
            .filter((item) => item.isNumeric && !used.has(item.field.fid))
            .map((item) => ({
                field: item.field,
                score: scoreFieldAgainstTokens(item, tokens)
            }))
            .sort((a, b) => b.score - a.score);

        for (const entry of scored) {
            addCandidate(entry.field);
            if (candidates.length >= 2) break;
        }
    }

    if (candidates.length < 2) {
        return null;
    }

    return {
        xField: candidates[0],
        yField: candidates[1]
    };
}

function buildChartDefinition(query, fields, options = {}) {
    const parsed = parseQueryToRoles(query, fields);
    const notes = [];
    const processedMap = makeProcessedFieldMap(parsed.processedFields);

    const preferredChartType = normalizePreferredChartType(options.preferredChartType);
    const originalAggregator = parsed.aggregator;
    let aggregator = parsed.aggregator;
    let primaryDimension = parsed.primaryDimension;
    let secondaryDimension = parsed.secondaryDimension;
    let measureField = parsed.measureField && isNumericField(parsed.measureField, processedMap)
        ? parsed.measureField
        : null;
    let primarySource = parsed.primarySource;
    let secondarySource = parsed.secondarySource;
    let measureSource = parsed.measureSource;

    const usedIds = new Set();
    if (primaryDimension) usedIds.add(primaryDimension.fid);
    if (secondaryDimension) usedIds.add(secondaryDimension.fid);
    if (measureField) usedIds.add(measureField.fid);

    if (aggregator !== 'count' && aggregator !== 'none' && !measureField) {
        const fallbackMeasure = pickBestNumericField(parsed.processedFields, parsed.tokens, usedIds);
        if (fallbackMeasure) {
            measureField = fallbackMeasure;
            usedIds.add(measureField.fid);
        }
    }

    if (preferredChartType === 'stacked') {
        aggregator = measureField ? 'sum' : 'count';
    } else if (preferredChartType === 'point') {
        aggregator = 'none';
    } else if (preferredChartType && ['bar', 'line', 'area'].includes(preferredChartType)) {
        if (aggregator === 'none') {
            aggregator = measureField ? 'sum' : 'count';
        }
    }

    if (aggregator !== 'count' && aggregator !== 'none' && !measureField) {
        return {
            success: false,
            message: "I couldn't find a numeric field to summarize. Try asking for the sum or average of a numeric column."
        };
    }

    if (aggregator !== 'none' && !primaryDimension) {
        const fallbackDimension = pickBestField(parsed.processedFields, parsed.tokens, {
            prefer: 'dimension',
            used: usedIds
        });
        if (fallbackDimension.field) {
            primaryDimension = fallbackDimension.field;
            usedIds.add(primaryDimension.fid);
            primarySource = primarySource ?? 'inferred';
        }
    }

    if (aggregator !== 'none' && !primaryDimension) {
        return {
            success: false,
            message: "I couldn't identify which field should go on the axis. Try to mention the category or dimension explicitly."
        };
    }

    let chartType = inferChartType({
        aggregator,
        dimensionField: primaryDimension,
        colorField: secondaryDimension,
        measureField,
        hasTrendHint: parsed.hasTrendHint
    });

    if (preferredChartType) {
        if (preferredChartType === 'stacked') {
            chartType = 'bar';
        } else if (preferredChartType === 'point') {
            chartType = 'point';
        } else {
            chartType = preferredChartType;
        }
    }

    if (chartType === 'point') {
        aggregator = 'none';
    }

    let scatterAxes = null;
    if (chartType === 'point') {
        scatterAxes = resolveScatterFields({
            primaryDimension,
            measureField,
            secondaryDimension,
            processedFields: parsed.processedFields,
            processedMap,
            tokens: parsed.tokens
        });

        if (!scatterAxes) {
            if (preferredChartType === 'point') {
                return {
                    success: false,
                    message: "I couldn't find two numeric fields for a scatterplot. Try mentioning the numeric columns you want to compare."
                };
            }
            chartType = 'bar';
            aggregator = measureField ? 'sum' : 'count';
            notes.push('I switched to a bar chart because I could not locate two numeric fields for a scatter plot.');
        }
    }

    const isAggregated = aggregator !== 'none';
    let shouldStack = Boolean(secondaryDimension) && isAggregated && aggregator === 'count';
    if (preferredChartType === 'stacked') {
        shouldStack = true;
    }

    const geom = chartType === 'point' ? 'point' : chartType;
    const visualConfig = buildVisualConfig(geom, {
        aggregated: isAggregated,
        stacked: shouldStack
    });

    const state = createEmptyState();
    let effectiveMeasureField = measureField;

    if (chartType === 'point' && scatterAxes) {
        const xField = cloneField(scatterAxes.xField, {
            analyticType: 'measure',
            semanticType: 'quantitative'
        });
        const yField = cloneField(scatterAxes.yField, {
            analyticType: 'measure',
            semanticType: 'quantitative'
        });
        state.columns = [xField];
        state.rows = [yField];
        state.measures = [cloneField(xField), cloneField(yField)];
        state.dimensions = [];
        effectiveMeasureField = scatterAxes.yField;
        primaryDimension = scatterAxes.xField;
        primarySource = primarySource ?? 'scatter';
        measureSource = measureSource ?? 'scatter';

        if (secondaryDimension && !isNumericField(secondaryDimension, processedMap)) {
            const colorField = cloneField(secondaryDimension, {
                analyticType: 'dimension',
                semanticType: secondaryDimension.semanticType || 'nominal'
            });
            ensureUniquePush(state.color, colorField);
            ensureUniquePush(state.dimensions, cloneField(colorField));
        }
    } else {
        if (primaryDimension) {
            const dimView = cloneField(primaryDimension, {
                analyticType: 'dimension',
                semanticType: primaryDimension.semanticType || 'nominal'
            });
            ensureUniquePush(state.columns, dimView);
            ensureUniquePush(state.dimensions, cloneField(dimView));
        }

        let measureView = null;
        if (aggregator === 'count' && !effectiveMeasureField) {
            measureView = createCountMeasure();
            effectiveMeasureField = measureView;
            measureSource = measureSource ?? 'generated';
        } else if (effectiveMeasureField) {
            const aggName = AGGREGATOR_TO_AGGNAME[aggregator] || undefined;
            measureView = cloneField(effectiveMeasureField, {
                analyticType: 'measure',
                semanticType: 'quantitative',
                aggName
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
    }

    if (primaryDimension && primarySource && !primarySource.startsWith('segment')) {
        notes.push(`I used ${primaryDimension.name} for the main axis because it was the closest field I found.`);
    }

    if (secondaryDimension && secondarySource && !secondarySource.startsWith('segment')) {
        notes.push(`I used ${secondaryDimension.name} for grouping because other fields were a weaker match.`);
    }

    if (effectiveMeasureField && measureSource && !measureSource.startsWith('segment')) {
        notes.push(`I summarized ${effectiveMeasureField.name} because I couldn't find a better numeric field in your request.`);
    }

    if (aggregator !== originalAggregator) {
        if (originalAggregator === 'none' && aggregator !== 'none') {
            notes.push('I applied aggregation so the chart has something to measure.');
        } else if (originalAggregator && aggregator === 'none') {
            notes.push('I removed aggregation to build a scatter plot.');
        }
    }

    const explanation = describeChart({
        chartType,
        aggregator,
        dimensionField: primaryDimension,
        measureField: effectiveMeasureField,
        colorField: secondaryDimension,
        axes: scatterAxes
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
            measureField: effectiveMeasureField,
            rendererChart,
            axes: scatterAxes
        },
        explanation,
        notes
    };
}

export function generateChatChart(query, gwData, options = {}) {
    if (!gwData || !Array.isArray(gwData.fields) || gwData.fields.length === 0) {
        return {
            success: false,
            message: 'Load a dataset first so I know which fields to use.'
        };
    }

    const result = buildChartDefinition(query, gwData.fields, options);
    if (!result.success) {
        return result;
    }

    return {
        success: true,
        chart: result.chart,
        explanation: result.explanation,
        notes: result.notes
    };
}

export default generateChatChart;
