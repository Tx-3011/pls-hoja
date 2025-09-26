import React, { useEffect, useMemo } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    LinearProgress,
    Fade,
    Stack,
    Button
} from '@mui/material';
import {
    RocketLaunch as SimpleIcon,
    AutoAwesome as SparkleIcon,
    Timeline as TimelineIcon,
    Insights as InsightsIcon
} from '@mui/icons-material';
import { BarChart, LineChart } from '@mui/x-charts';
import { KpiWidget, TableWidget } from '../widgets';

const SimpleMode = ({
    datasets,
    selectedDataset,
    onDatasetChange,
    analytics,
    gwData,
    isLoading,
    onLoadDataset,
}) => {
    useEffect(() => {
        if (selectedDataset) {
            onLoadDataset(selectedDataset);
        }
    }, [selectedDataset, onLoadDataset]);

    const topCategoryData = useMemo(() => {
        if (!gwData || !gwData.fields || !gwData.dataSource) return null;

        const dimensionField = gwData.fields.find(
            (field) => field.analyticType === 'dimension' || field.semanticType === 'nominal'
        );
        const measureField = gwData.fields.find(
            (field) => field.analyticType === 'measure' || field.semanticType === 'quantitative'
        );

        if (!dimensionField || !measureField) return null;

        const aggregation = gwData.dataSource.slice(0, 5000).reduce((acc, row) => {
            const category = row[dimensionField.fid] ?? 'Unknown';
            const value = Number(row[measureField.fid]) || 0;
            acc[category] = (acc[category] || 0) + value;
            return acc;
        }, {});

        return Object.entries(aggregation)
            .map(([name, value]) => ({ name: String(name), value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);
    }, [gwData]);

    const trendData = useMemo(() => {
        if (!gwData || !gwData.fields || !gwData.dataSource) return null;

        const measureField = gwData.fields.find(
            (field) => field.analyticType === 'measure' || field.semanticType === 'quantitative'
        );

        if (!measureField) return null;

        return gwData.dataSource.slice(0, 20).map((row, index) => ({
            index: index + 1,
            value: Number(row[measureField.fid]) || 0,
        }));
    }, [gwData]);

    const handleDatasetSelect = (event) => {
        const value = event.target.value;
        onDatasetChange(value);
    };

    const renderEmptyState = () => (
        <Card sx={{ mt: 4 }}>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <SparkleIcon sx={{ fontSize: 56, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                    Choose a dataset to generate instant insights
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Select one of the available datasets and we'll automatically build KPI cards,
                    quick charts, and a ranked summary for you.
                </Typography>
            </CardContent>
        </Card>
    );

    return (
        <Fade in>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Card
                    sx={{
                        background: (theme) =>
                            theme.palette.mode === 'light'
                                ? 'linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, rgba(118, 0, 211, 0.1) 100%)'
                                : 'linear-gradient(135deg, rgba(144, 202, 249, 0.15) 0%, rgba(206, 147, 216, 0.15) 100%)',
                        borderRadius: 4,
                        overflow: 'hidden',
                        border: (theme) => `1px solid ${theme.palette.divider}`,
                    }}
                >
                    <CardContent sx={{ py: 4 }}>
                        <Grid container spacing={4} alignItems="center">
                            <Grid item xs={12} md={7}>
                                <Stack spacing={2}>
                                    <Chip
                                        icon={<SimpleIcon />}
                                        label="Simple mode: curated insights"
                                        color="primary"
                                        variant="outlined"
                                        sx={{ alignSelf: 'flex-start', fontWeight: 600 }}
                                    />
                                    <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                        Instantly explore your data with automatically generated highlights
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary">
                                        Select a dataset to view KPI cards, spotlight charts, and ranked tables designed
                                        to surface what matters most. Switch to Advanced mode whenever you want the full
                                        GraphicWalker experience.
                                    </Typography>
                                </Stack>
                            </Grid>
                            <Grid item xs={12} md={5}>
                                <FormControl fullWidth size="large">
                                    <InputLabel id="simple-mode-dataset-label">Choose Dataset</InputLabel>
                                    <Select
                                        labelId="simple-mode-dataset-label"
                                        value={selectedDataset}
                                        label="Choose Dataset"
                                        onChange={handleDatasetSelect}
                                        MenuProps={{
                                            PaperProps: {
                                                elevation: 4,
                                                sx: { borderRadius: 3 },
                                            },
                                        }}
                                    >
                                        {datasets.length === 0 && (
                                            <MenuItem disabled value="">
                                                No datasets available
                                            </MenuItem>
                                        )}
                                        {datasets.map((dataset) => (
                                            <MenuItem key={dataset.datasetName} value={dataset.datasetName}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="body1">{dataset.datasetName}</Typography>
                                                    <Chip
                                                        size="small"
                                                        label={dataset.isItFromExcel ? 'Excel' : 'Database'}
                                                        color={dataset.isItFromExcel ? 'success' : 'info'}
                                                        variant="outlined"
                                                    />
                                                </Box>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>

                {isLoading && <LinearProgress />}

                {!selectedDataset ? (
                    renderEmptyState()
                ) : (
                    <Fade in timeout={400}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {/* KPI Grid */}
                            {analytics?.kpis && analytics.kpis.length > 0 && (
                                <Grid container spacing={3}>
                                    {analytics.kpis.map((kpi) => (
                                        <Grid item xs={12} sm={6} lg={3} key={kpi.title}>
                                            <KpiWidget
                                                title={kpi.title}
                                                value={kpi.value}
                                                delta={kpi.delta}
                                                unit={kpi.unit}
                                                precision={kpi.precision}
                                            />
                                        </Grid>
                                    ))}
                                </Grid>
                            )}

                            {/* Spotlight Charts */}
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <Card
                                        sx={{
                                            height: '100%',
                                            borderRadius: 3,
                                            overflow: 'hidden',
                                            border: (theme) => `1px solid ${theme.palette.divider}`,
                                        }}
                                    >
                                        <CardContent>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <InsightsIcon color="primary" />
                                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                        Category spotlight
                                                    </Typography>
                                                </Stack>
                                                <Chip label="Top 6" size="small" color="secondary" variant="outlined" />
                                            </Stack>
                                            {topCategoryData && topCategoryData.length > 0 ? (
                                                <BarChart
                                                    height={300}
                                                    slotProps={{ legend: { hidden: true } }}
                                                    series={[{ data: topCategoryData.map((item) => item.value), label: 'Total' }]}
                                                    xAxis={[{ scaleType: 'band', data: topCategoryData.map((item) => item.name) }]}
                                                />
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    Not enough categorical data to build this insight yet.
                                                </Typography>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Card
                                        sx={{
                                            height: '100%',
                                            borderRadius: 3,
                                            overflow: 'hidden',
                                            border: (theme) => `1px solid ${theme.palette.divider}`,
                                        }}
                                    >
                                        <CardContent>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <TimelineIcon color="primary" />
                                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                        Quick value trend
                                                    </Typography>
                                                </Stack>
                                                <Chip label="First 20 rows" size="small" variant="outlined" />
                                            </Stack>
                                            {trendData && trendData.length > 0 ? (
                                                <LineChart
                                                    height={300}
                                                    xAxis={[{ data: trendData.map((item) => item.index), label: 'Row order' }]}
                                                    series={[{ data: trendData.map((item) => item.value), area: true }]}
                                                    slotProps={{ legend: { hidden: true } }}
                                                />
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    Select a dataset with quantitative data to view the automatic trend line.
                                                </Typography>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            {/* Ranked Summary Table */}
                            {analytics?.summary?.rows && analytics.summary.rows.length > 0 && (
                                <TableWidget
                                    title={analytics.summary.title || 'Ranked summary'}
                                    columns={analytics.summary.columns}
                                    rows={analytics.summary.rows}
                                    highlightFirstColumn
                                    showRowIndex
                                    maxHeight={420}
                                />
                            )}

                            <Card variant="outlined" sx={{ borderRadius: 3 }}>
                                <CardContent>
                                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems="center">
                                        <Stack spacing={1}>
                                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                Deep dive ready when you are
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Jump into Advanced mode to fine-tune encodings, build multi-chart dashboards,
                                                and export curated stories using the full GraphicWalker editor.
                                            </Typography>
                                        </Stack>
                                        <Button variant="contained" color="primary" href="#advanced-mode">
                                            Explore advanced builder
                                        </Button>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Box>
                    </Fade>
                )}
            </Box>
        </Fade>
    );
};

export default SimpleMode;
