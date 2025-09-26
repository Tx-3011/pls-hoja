import React from 'react';
import { GraphicRenderer } from '@kanaries/graphic-walker';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Grid,
    CircularProgress,
    Chip,

    IconButton,
    Fade
} from '@mui/material';
import {
    Visibility as ViewIcon,
    ArrowBack as BackIcon,
    Dashboard as DashboardIcon,
    Delete as DeleteIcon,
    Edit as EditIcon
} from '@mui/icons-material';
import { MESSAGES } from '../constants/appConstants';

const RenderMultipleCharts = ({ singleChartConfig, gwData, index }) => {
    if (!singleChartConfig) {
        return <div>No chart configuration found</div>;
    }
    const chartConfig = Array.isArray(singleChartConfig) ? singleChartConfig : [singleChartConfig];

    return (
        <Box sx={{ height: 400 }}>
            <GraphicRenderer
                data={gwData.dataSource}
                fields={gwData.fields}
                chart={chartConfig}
            />
        </Box>
    );
};

const ViewTab = ({ 
    dashboards, 
    loading, 
    error,
    selectedDashboard,
    gwData,
    onDashboardAction,
    onBackToList
}) => {
    if (loading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 400,
                }}
            >
                <CircularProgress size={60} />
                <Typography variant="h6" sx={{ mt: 2 }}>
                    {MESSAGES.LOADING}
                </Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent>
                    <Typography variant="h6" color="error" align="center">
                        {MESSAGES.ERROR}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                        {error.message || MESSAGES.FETCH_ERROR}
                    </Typography>
                </CardContent>
            </Card>
        );
    }

    // If a dashboard is selected, show its details
    if (selectedDashboard) {
        const chartConfigs = selectedDashboard.jsonFormat ? JSON.parse(selectedDashboard.jsonFormat) : [];
        const isMultiple = selectedDashboard.isMultiple;

        return (
            <Card>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <DashboardIcon color="primary" />
                                {selectedDashboard.dashboardName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Dataset: {selectedDashboard.datasetName}
                            </Typography>
                        </Box>
                        <Button
                            variant="outlined"
                            startIcon={<BackIcon />}
                            onClick={onBackToList}
                        >
                            Back to List
                        </Button>
                    </Box>

                    {gwData ? (
                        <Box>
                            {isMultiple ? (
                                <Grid container spacing={3}>
                                    {chartConfigs.map((config, index) => (
                                        <Grid item xs={12} md={6} key={index}>
                                            <Card variant="outlined">
                                                <CardContent>
                                                    <Typography variant="h6" gutterBottom>
                                                        Chart {index + 1}
                                                    </Typography>
                                                    <RenderMultipleCharts 
                                                        singleChartConfig={config} 
                                                        gwData={gwData} 
                                                        index={index} 
                                                    />
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                            ) : (
                                <Card variant="outlined">
                                    <CardContent>
                                        <RenderMultipleCharts 
                                            singleChartConfig={chartConfigs[0]} 
                                            gwData={gwData} 
                                            index={0} 
                                        />
                                    </CardContent>
                                </Card>
                            )}
                        </Box>
                    ) : (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <CircularProgress />
                            <Typography variant="body1" sx={{ mt: 2 }}>
                                Loading dashboard data...
                            </Typography>
                        </Box>
                    )}
                </CardContent>
            </Card>
        );
    }

    // Show list of dashboards
    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ViewIcon color="primary" />
                    Saved Dashboards
                </Typography>
                
                {dashboards.length === 0 ? (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            py: 8,
                        }}
                    >
                        <DashboardIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" align="center">
                            {MESSAGES.NO_DASHBOARDS}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                            Create your first dashboard in the Design tab
                        </Typography>
                    </Box>
                ) : (
                    <Grid container spacing={3}>
                        {dashboards.map((dashboard, index) => (
                            <Grid item xs={12} md={6} lg={4} key={dashboard.dashboardName || index}>
                                <Fade in={true} timeout={300 + index * 100}>
                                    <Card
                                        variant="outlined"
                                        sx={{
                                            height: '100%',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease-in-out',
                                            '&:hover': {
                                                elevation: 4,
                                                transform: 'translateY(-2px)',
                                                borderColor: 'primary.main'
                                            }
                                        }}
                                        onClick={() => onDashboardAction(dashboard, 'view')}
                                    >
                                        <CardContent>
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                                        {dashboard.dashboardName}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                        Dataset: {dashboard.datasetName}
                                                    </Typography>
                                                    <Chip 
                                                        size="small" 
                                                        label={dashboard.isMultiple ? 'Multiple Charts' : 'Single Chart'} 
                                                        color={dashboard.isMultiple ? 'secondary' : 'primary'}
                                                        variant="outlined"
                                                    />
                                                </Box>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Add edit functionality if needed
                                                        }}
                                                        sx={{ color: 'primary.main' }}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDashboardAction(dashboard, 'delete');
                                                        }}
                                                        sx={{ color: 'error.main' }}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Box>
                                            </Box>
                                            
                                            <Button
                                                variant="contained"
                                                startIcon={<ViewIcon />}
                                                fullWidth
                                                onClick={() => onDashboardAction(dashboard, 'view')}
                                            >
                                                View Dashboard
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </Fade>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </CardContent>
        </Card>
    );
};

export default ViewTab;