import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    CircularProgress,
    Chip,
    Fade
} from '@mui/material';
import {
    Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import { KpiWidget, TableWidget } from '../widgets';

const AnalyticsTab = ({ 
    analytics, 
    selectedDataset 
}) => {
    return (
        <Fade in={true}>
            <Card>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                                Analytics Overview
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {selectedDataset ? 'Real-time analytics for selected dataset' : 'Select a dataset to view analytics'}
                            </Typography>
                        </Box>
                        <Chip 
                            label={selectedDataset ? "Live Data" : "No Dataset"} 
                            color={selectedDataset ? "success" : "default"} 
                            variant="outlined"
                            sx={{ fontWeight: 500 }}
                        />
                    </Box>

                    {!selectedDataset ? (
                        <Box 
                            sx={{ 
                                textAlign: 'center', 
                                py: 8, 
                                color: 'text.secondary' 
                            }}
                        >
                            <AnalyticsIcon sx={{ fontSize: 64, mb: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                Select a dataset to view analytics
                            </Typography>
                            <Typography variant="body2">
                                Choose a dataset from the dropdown above to see KPIs and data summaries
                            </Typography>
                        </Box>
                    ) : analytics.loading ? (
                        <Box 
                            sx={{ 
                                display: 'flex', 
                                justifyContent: 'center', 
                                alignItems: 'center', 
                                py: 8 
                            }}
                        >
                            <CircularProgress size={60} />
                            <Typography variant="h6" sx={{ ml: 2 }}>
                                Loading analytics...
                            </Typography>
                        </Box>
                    ) : analytics.error ? (
                        <Box 
                            sx={{ 
                                textAlign: 'center', 
                                py: 8, 
                                color: 'error.main' 
                            }}
                        >
                            <Typography variant="h6" gutterBottom>
                                Error loading analytics
                            </Typography>
                            <Typography variant="body2">
                                {analytics.error.message || 'Failed to load analytics data'}
                            </Typography>
                        </Box>
                    ) : (
                        <Box>
                            {/* KPI Cards Row */}
                            <Grid container spacing={3} sx={{ mb: 4 }}>
                                {analytics.kpis && analytics.kpis.map((kpi, index) => (
                                    <Grid item xs={12} sm={6} md={3} key={kpi.title || index}>
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

                            {/* Data Summary Section */}
                            {analytics.summary && (
                                <Grid container spacing={3}>
                                    <Grid item xs={12}>
                                        <TableWidget
                                            title={analytics.summary.title || "Data Summary"}
                                            columns={analytics.summary.columns || []}
                                            rows={analytics.summary.rows || []}
                                            highlightFirstColumn={true}
                                            maxHeight={400}
                                        />
                                    </Grid>
                                </Grid>
                            )}
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Fade>
    );
};

export default AnalyticsTab;