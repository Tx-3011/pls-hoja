import React, { useEffect } from 'react';
import axios from 'axios';
import { Box, Container, CircularProgress, Typography } from '@mui/material';
import { 
    AppHeader, 
    TabNavigation, 
    DesignTab, 
    ViewTab, 
    AnalyticsTab 
} from './components';
import { TABS, ENDPOINTS } from './constants/appConstants';
import useDataManager from './hooks/useDataManager';
const Chart = ({ themeMode, toggleTheme }) => {
    const {
        state,
        setState,
        isGoClicked,
        setIsGoClicked,
        isGraphicWalkerReady,
        setIsGraphicWalkerReady,
        uploadedFile,
        setUploadedFile,
        isLoading,
        setIsLoading,
        fetchData,
        fetchAnalyticsData,
        handleDatasetChange,
        processExcelData,
        processStoredProcedureData
    } = useDataManager();

    useEffect(() => {
        fetchData(ENDPOINTS.DATASET);
    }, [fetchData]);

    useEffect(() => {
        if (state.activeTab === TABS.VIEW) {
            fetchData(ENDPOINTS.DASHBOARD);
        }
    }, [state.activeTab, fetchData]);

    const handleTabChange = (newTab) => {
        setState(prev => ({ ...prev, activeTab: newTab }));
    };

    const handleDashboardAction = async (dashboard, action) => {
        if (action === 'view') {
            setState(prev => ({
                ...prev,
                dashboard: { ...prev.dashboard, selected: dashboard }
            }));
            
            // Load dashboard data
            try {
                const response = await axios.get(`${ENDPOINTS.DATASET}/${dashboard.datasetName}`);
                const selectedDatasetObj = response.data;

                let processedData = null;
                if (selectedDatasetObj && selectedDatasetObj.isItFromExcel) {
                    processedData = await processExcelData(selectedDatasetObj);
                } else if (selectedDatasetObj && selectedDatasetObj.spName) {
                    processedData = await processStoredProcedureData(selectedDatasetObj);
                }

                setState(prev => ({ ...prev, gwData: processedData }));
            } catch (error) {
                console.error('Error loading dashboard data:', error);
            }
        } else if (action === 'delete') {
            if (window.confirm(`Are you sure you want to delete "${dashboard.dashboardName}"?`)) {
                try {
                    await axios.delete(`${ENDPOINTS.DASHBOARD}/${dashboard.dashboardName}`);
                    fetchData(ENDPOINTS.DASHBOARD);
                } catch (error) {
                    console.error('Error deleting dashboard:', error);
                    alert('Failed to delete dashboard');
                }
            }
        }
    };

    const resetDashboardView = () => {
        setState(prev => ({
            ...prev,
            dashboard: { ...prev.dashboard, selected: null }
        }));
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const fileType = file.name.split('.').pop().toLowerCase();
        if (!['xlsx', 'xls'].includes(fileType)) {
            alert(MESSAGES.EXCEL_ONLY);
            event.target.value = '';
            return;
        }
        const datasetName = file.name.replace(/\.[^/.]+$/, "");
        try {
            const existingDatasets = state.datasets.items;
            const datasetExists = existingDatasets.some(dataset => dataset.datasetName === datasetName);

            if (datasetExists) {
                alert(MESSAGES.DATASET_EXISTS);
                event.target.value = '';
                return;
            }
            const formData = new FormData();
            formData.append('file', file);
            formData.append('datasetName', datasetName);

            await axios.post(ENDPOINTS.DATASET_UPLOAD, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            await fetchData(ENDPOINTS.DATASET);

            setState(prev => ({
                ...prev,
                selectedDataset: datasetName
            }));

            setIsGraphicWalkerReady(false);
            setIsGoClicked(false);
            setState(prev => ({
                ...prev,
                gwData: null
            }));

            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const excelData = XLSX.utils.sheet_to_json(firstSheet, {
                    raw: false,
                    defval: null
                });

                if (excelData.length > 0) {
                    const fields = Object.keys(excelData[0]).map(key => ({
                        fid: key,
                        semanticType: !isNaN(excelData[0][key]) ? 'quantitative' : 'nominal',
                        analyticType: 'dimension',
                    }));

                    setTimeout(() => {
                        setState(prev => ({
                            ...prev,
                            gwData: {
                                fields,
                                dataSource: excelData.map(row => {
                                    const cleanRow = {};
                                    Object.keys(row).forEach(key => {
                                        cleanRow[key] = row[key] === null ? '' : row[key];
                                    });
                                    return cleanRow;
                                })
                            }
                        }));
                        setIsGraphicWalkerReady(true);
                        setIsGoClicked(true);
                        setUploadedFile(file);
                    }, 100);
                }
            };

            reader.readAsArrayBuffer(file);
            event.target.value = '';

        } catch (error) {
            if (error.response && error.response.data && error.response.data.errors) {
                const errorMessage = Object.values(error.response.data.errors)
                    .flat()
                    .join('\n');
                alert(errorMessage);
            } else {
                console.error('Error uploading dataset:', error);
                alert('Failed to upload dataset');
            }
            event.target.value = '';
            return;
        }
    };

    const handleGoClick = async () => {
        if (!state.selectedDataset) {
            alert('Please select a dataset');
            return;
        }

        setIsLoading(true);
        setIsGraphicWalkerReady(false);
        const selectedDatasetItem = state.datasets.items.find(dataset => dataset.datasetName === state.selectedDataset);
        if (selectedDatasetItem) {
            if (selectedDatasetItem.isItFromExcel) {
                try {
                    const response = await axios.get(`http://localhost:5246/api/excel/read?excelPath=${encodeURIComponent(selectedDatasetItem.excelPath)}`);
                    const excelData = response.data;

                    if (excelData.length > 0) {
                        const fields = Object.keys(excelData[0]).map(key => ({
                            fid: key,
                            semanticType: typeof excelData[0][key] === 'number' ? 'quantitative' : 'nominal',
                            analyticType: 'dimension',
                        }));

                        setState(prev => ({
                            ...prev,
                            gwData: {
                                fields,
                                dataSource: excelData
                            }
                        }));
                        setIsGraphicWalkerReady(true);
                    } else {
                        setState(prev => ({
                            ...prev,
                            gwData: null
                        }));
                    }
                } catch (error) {
                    console.error('Error fetching Excel data:', error);
                    alert('Failed to fetch data from Excel file.');
                    setState(prev => ({
                        ...prev,
                        gwData: null
                    }));
                }
            } else {
                try {
                    const response = await axios.get(`http://localhost:5246/api/storedprocedure/execute?storedProcedureName=${encodeURIComponent(selectedDatasetItem.sp)}`);
                    const spData = response.data;

                    if (spData.length > 0) {
                        const fields = Object.keys(spData[0]).map(key => ({
                            fid: key,
                            semanticType: typeof spData[0][key] === 'number' ? 'quantitative' : 'nominal',
                            analyticType: 'dimension',
                        }));

                        setState(prev => ({
                            ...prev,
                            gwData: {
                                fields,
                                dataSource: spData
                            }
                        }));
                        setIsGraphicWalkerReady(true);
                    } else {
                        setState(prev => ({
                            ...prev,
                            gwData: null
                        }));
                    }
                } catch (error) {
                    console.error('Error fetching stored procedure data:', error);
                    alert('Failed to fetch data from stored procedure.');
                    setState(prev => ({
                        ...prev,
                        gwData: null
                    }));
                }
            }

            setIsGoClicked(true);
        } else {
            alert('Selected dataset not found.');
            setIsGoClicked(false);
        }
        setIsLoading(false);
    };

    const exportChartConfigs = async () => {
        if (!gw.current) return;

        const dashboardName = prompt("Enter the name for the dashboard:");
        if (!dashboardName) return;

        try {
            const chartConfigList = gw.current.exportCode();
            const isMultiple = Array.isArray(chartConfigList) && chartConfigList.length > 1;
            const datasetNameToUse = state.selectedDataset ||
                (uploadedFile ? state.datasets.items.find(d => d.isItFromExcel)?.datasetName : '');

            if (!datasetNameToUse) {
                alert('No dataset selected');
                return;
            }

            await axios.post(ENDPOINTS.DASHBOARD, {
                dashboardName: dashboardName,
                datasetName: datasetNameToUse,
                jsonFormat: JSON.stringify(chartConfigList, null, 2),
                isMultiple,
            });

            alert(MESSAGES.SAVE_SUCCESS);
            // Always refresh dashboard list after saving
            await fetchData(ENDPOINTS.DASHBOARD);
            setUploadedFile(null);

        } catch (error) {
            console.error('Error saving dashboard:', error);
            alert(error.response?.data?.error || 'Failed to save dashboard');
        }
    };


    const handleDashboardAction = async (dashboard, action) => {
        if (action === 'view') {
            setState(prev => ({
                ...prev,
                dashboard: {
                    ...prev.dashboard,
                    loading: true
                }
            }));

            const selectedDatasetItem = state.datasets.items.find(
                dataset => dataset.datasetName === dashboard.datasetName
            );

            if (selectedDatasetItem) {
                try {
                    let responseData;
                    if (selectedDatasetItem.isItFromExcel) {
                        const response = await axios.get(`http://localhost:5246/api/excel/read?excelPath=${encodeURIComponent(selectedDatasetItem.excelPath)}`);
                        responseData = response.data;
                    } else {
                        const response = await axios.get(`http://localhost:5246/api/storedprocedure/execute?storedProcedureName=${encodeURIComponent(selectedDatasetItem.sp)}`);
                        responseData = response.data;
                    }

                    if (responseData.length > 0) {
                        const fields = Object.keys(responseData[0]).map(key => ({
                            fid: key,
                            semanticType: typeof responseData[0][key] === 'number' ? 'quantitative' : 'nominal',
                            analyticType: 'dimension',
                        }));

                        setState(prev => ({
                            ...prev,
                            dashboard: {
                                ...prev.dashboard,
                                selected: dashboard,
                                isClicked: true,
                                isMultiple: dashboard.isMultiple,
                                loading: false
                            },
                            chartConfig: JSON.parse(dashboard.jsonFormat),
                            gwData: {
                                fields,
                                dataSource: responseData
                            }
                        }));
                    } else {
                        setState(prev => ({
                            ...prev,
                            dashboard: {
                                ...prev.dashboard,
                                loading: false
                            }
                        }));
                        alert('No data available for this dashboard');
                    }
                } catch (error) {
                    console.error('Error fetching dataset data:', error);
                    setState(prev => ({
                        ...prev,
                        dashboard: {
                            ...prev.dashboard,
                            loading: false
                        }
                    }));
                    alert('Failed to fetch dataset data');
                }
            } else {
                setState(prev => ({
                    ...prev,
                    dashboard: {
                        ...prev.dashboard,
                        loading: false
                    }
                }));
                alert('Dataset not found');
            }
        } else {
            setState(prev => ({
                ...prev,
                dashboard: {
                    ...prev.dashboard,
                    selected: dashboard
                }
            }));
        }
    };


    const resetDashboardView = () => {
        setState(prev => ({
            ...prev,
            dashboard: {
                ...prev.dashboard,
                isClicked: false,
                isMultiple: false,
                selected: null
            }
        }));
    };



    const handleGraphicWalkerLoad = () => {
        setIsGraphicWalkerReady(true);
    };

    const curLang = 'english';
    if (state.datasets.loading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    gap: 2,
                }}
            >
                <CircularProgress size={60} />
                <Typography variant="h6" color="text.secondary">
                    {MESSAGES.LOADING}
                </Typography>
            </Box>
        );
    }

    if (state.datasets.error) {
        return (
            <Container maxWidth="md" sx={{ mt: 4 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    <Typography variant="h6">
                        {MESSAGES.ERROR}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        {state.datasets.error.message}
                    </Typography>
                </Alert>
            </Container>
        );
    }
    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Modern Header */}
            <AppBar position="static" elevation={0} sx={{ bgcolor: 'primary.main' }}>
                <Toolbar>
                    <AnalyticsIcon sx={{ mr: 2 }} />
                    <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
                        GraphicWalker Dashboard
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <LightIcon />
                        <Switch checked={themeMode === 'dark'} onChange={toggleTheme} />
                        <DarkIcon />
                    </Box>
                </Toolbar>
            </AppBar>

            <Container maxWidth="xl" sx={{ py: 3 }}>
                {/* Modern Tab Navigation */}
                <Card sx={{ mb: 3 }}>
                    <Tabs
                        value={state.activeTab}
                        onChange={(e, newValue) => setState(prev => ({ ...prev, activeTab: newValue }))}
                        variant="fullWidth"
                        sx={{
                            '& .MuiTab-root': {
                                textTransform: 'none',
                                fontWeight: 500,
                                fontSize: '1rem',
                            }
                        }}
                    >
                        <Tab 
                            value={TABS.DESIGN} 
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <DashboardIcon />
                                    Design Dashboards
                                </Box>
                            }
                        />
                        <Tab 
                            value={TABS.VIEW} 
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ViewIcon />
                                    View Dashboards
                                </Box>
                            }
                        />
                        <Tab 
                            value={TABS.WIDGETS} 
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <AnalyticsIcon />
                                    Analytics Overview
                                </Box>
                            }
                        />
                    </Tabs>
                </Card>

                {/* Content Area */}
                {state.activeTab === TABS.DESIGN && (
                    <Fade in={true}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <DatasetIcon color="primary" />
                                    Design New Dashboard
                                </Typography>
                                
                                {/* Dataset Selection Section */}
                                <Grid container spacing={3} alignItems="center" sx={{ mb: 3 }}>
                                    <Grid item xs={12} md={6}>
                                        <FormControl fullWidth variant="outlined">
                                            <InputLabel>Select Dataset</InputLabel>
                                            <Select
                                                value={state.selectedDataset}
                                                onChange={handleDatasetChange}
                                                label="Select Dataset"
                                                disabled={isLoading}
                                                startAdornment={<DatasetIcon sx={{ mr: 1, color: 'action.active' }} />}
                                            >
                                                <MenuItem value="">
                                                    <em>Choose a dataset...</em>
                                                </MenuItem>
                                                {state.datasets.items.map((dataset, idx) => (
                                                    <MenuItem key={dataset.id || idx} value={dataset.datasetName}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <DatasetIcon fontSize="small" />
                                                            {dataset.datasetName}
                                                            <Chip 
                                                                size="small" 
                                                                label={dataset.isItFromExcel ? 'Excel' : 'Database'} 
                                                                color={dataset.isItFromExcel ? 'success' : 'info'}
                                                                sx={{ ml: 1 }}
                                                            />
                                                        </Box>
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    
                                    <Grid item xs={12} md={3}>
                                        <Button
                                            variant="contained"
                                            startIcon={isLoading ? <CircularProgress size={20} /> : <PlayIcon />}
                                            onClick={handleGoClick}
                                            disabled={!state.selectedDataset || isLoading}
                                            fullWidth
                                            size="large"
                                        >
                                            {isLoading ? 'Loading...' : 'Load Data'}
                                        </Button>
                                    </Grid>
                                    
                                    <Grid item xs={12} md={3}>
                                        <input
                                            accept=".xlsx,.xls"
                                            style={{ display: 'none' }}
                                            id="upload-button"
                                            type="file"
                                            onChange={handleFileUpload}
                                            disabled={isLoading}
                                        />
                                        <label htmlFor="upload-button">
                                            <Button
                                                variant="outlined"
                                                component="span"
                                                startIcon={<UploadIcon />}
                                                disabled={isLoading}
                                                fullWidth
                                                size="large"
                                            >
                                                Upload Excel
                                            </Button>
                                        </label>
                                    </Grid>
                                </Grid>

                                {/* Export Button */}
                                {isGraphicWalkerReady && (
                                    <Box sx={{ mb: 2 }}>
                                        <Button
                                            variant="contained"
                                            color="secondary"
                                            startIcon={<SaveIcon />}
                                            onClick={exportChartConfigs}
                                            size="large"
                                        >
                                            Save Dashboard
                                        </Button>
                                    </Box>
                                )}

                                {/* Chart Visualization Area */}
                                <Card variant="outlined" sx={{ minHeight: 500, position: 'relative' }}>
                                    {isLoading && <LinearProgress />}
                                    <CardContent>
                                        {isGoClicked && state.gwData ? (
                                            <GraphicWalker
                                                fields={state.gwData.fields}
                                                data={state.gwData.dataSource}
                                                vizThemeConfig="default"
                                                storeRef={gw}
                                                i18nLang={curLang}
                                                i18nResources={MESSAGES}
                                                appearance='media'
                                                onLoad={handleGraphicWalkerLoad}
                                            />
                                        ) : (
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    height: 400,
                                                }}
                                            >
                                                <AnalyticsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                                                <Typography variant="h6" color="text.secondary" align="center">
                                                    {MESSAGES.NO_DATA}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                                                    Choose a dataset from the dropdown or upload an Excel file to get started
                                                </Typography>
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            </CardContent>
                        </Card>
                    </Fade>
                )}

                {state.activeTab === TABS.VIEW && (
                    <Fade in={true}>
                        <Card>
                            <CardContent>
                                {!state.dashboard.isClicked ? (
                                    <>
                                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <ViewIcon color="primary" />
                                            Saved Dashboards
                                        </Typography>
                                        
                                        {state.dashboard.items.length > 0 ? (
                                            <>
                                                <Paper variant="outlined" sx={{ mb: 3 }}>
                                                    <List>
                                                        <RadioGroup
                                                            value={state.dashboard.selected?.dashboardName || ''}
                                                            onChange={(e) => {
                                                                const selectedDashboard = state.dashboard.items.find(d => d.dashboardName === e.target.value);
                                                                if (selectedDashboard) {
                                                                    handleDashboardAction(selectedDashboard, 'select');
                                                                }
                                                            }}
                                                        >
                                                            {state.dashboard.items.map((dashboard, index) => (
                                                                <ListItem key={dashboard.dashboardName || index} divider>
                                                                    <ListItemIcon>
                                                                        <FormControlLabel
                                                                            value={dashboard.dashboardName}
                                                                            control={<Radio />}
                                                                            label=""
                                                                            sx={{ m: 0 }}
                                                                        />
                                                                    </ListItemIcon>
                                                                    <ListItemText
                                                                        primary={
                                                                            <Typography variant="h6">
                                                                                {dashboard.dashboardName}
                                                                            </Typography>
                                                                        }
                                                                        secondary={
                                                                            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                                                                <Chip 
                                                                                    size="small" 
                                                                                    label={dashboard.datasetName} 
                                                                                    color="primary" 
                                                                                    variant="outlined"
                                                                                />
                                                                                <Chip 
                                                                                    size="small" 
                                                                                    label={dashboard.isMultiple ? 'Multiple Charts' : 'Single Chart'} 
                                                                                    color={dashboard.isMultiple ? 'success' : 'info'}
                                                                                />
                                                                            </Box>
                                                                        }
                                                                    />
                                                                </ListItem>
                                                            ))}
                                                        </RadioGroup>
                                                    </List>
                                                </Paper>

                                                <Button
                                                    variant="contained"
                                                    size="large"
                                                    startIcon={state.dashboard.loading ? <CircularProgress size={20} /> : <ViewIcon />}
                                                    onClick={() => state.dashboard.selected && handleDashboardAction(state.dashboard.selected, 'view')}
                                                    disabled={!state.dashboard.selected || state.dashboard.loading}
                                                >
                                                    {state.dashboard.loading ? 'Loading...' : 'View Dashboard'}
                                                </Button>
                                            </>
                                        ) : (
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
                                                    No Dashboards Found
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                                                    Create your first dashboard in the Design tab
                                                </Typography>
                                            </Box>
                                        )}
                                    </>
                                ) : (
                                    state.chartConfig && state.gwData && (
                                        <>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                                <Typography variant="h6">
                                                    {state.dashboard.selected?.dashboardName}
                                                </Typography>
                                                <Button
                                                    variant="outlined"
                                                    startIcon={<BackIcon />}
                                                    onClick={resetDashboardView}
                                                >
                                                    Back to List
                                                </Button>
                                            </Box>

                                            <Card variant="outlined" sx={{ minHeight: 500 }}>
                                                {state.dashboard.loading && <LinearProgress />}
                                                <CardContent>
                                                    {state.dashboard.isMultiple ? (
                                                        <Grid container spacing={3}>
                                                            {state.chartConfig.map((chartConfig, i) => (
                                                                <Grid item xs={12} md={6} key={i}>
                                                                    <Card variant="outlined">
                                                                        <CardContent>
                                                                            <Typography variant="h6" gutterBottom>
                                                                                {chartConfig.name || `Chart ${i + 1}`}
                                                                            </Typography>
                                                                            <RenderMultipleCharts
                                                                                singleChartConfig={chartConfig}
                                                                                gwData={state.gwData}
                                                                                index={i}
                                                                            />
                                                                        </CardContent>
                                                                    </Card>
                                                                </Grid>
                                                            ))}
                                                        </Grid>
                                                    ) : (
                                                        <GraphicRenderer
                                                            data={state.gwData.dataSource}
                                                            fields={state.gwData.fields}
                                                            chart={state.chartConfig}
                                                        />
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </>
                                    )
                                )}
                            </CardContent>
                        </Card>
                    </Fade>
                )}

                {state.activeTab === TABS.WIDGETS && (
                    <Fade in={true}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                    <Box>
                                        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                                            Analytics Overview
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {state.selectedDataset ? 'Real-time analytics for selected dataset' : 'Select a dataset to view analytics'}
                                        </Typography>
                                    </Box>
                                    <Chip 
                                        label={state.selectedDataset ? "Live Data" : "No Dataset"} 
                                        color={state.selectedDataset ? "success" : "default"} 
                                        variant="outlined"
                                        sx={{ fontWeight: 500 }}
                                    />
                                </Box>

                                {!state.selectedDataset ? (
                                    <Box 
                                        sx={{ 
                                            textAlign: 'center', 
                                            py: 8, 
                                            color: 'text.secondary' 
                                        }}
                                    >
                                        <Typography variant="h6" gutterBottom>
                                            Select a dataset to view analytics
                                        </Typography>
                                        <Typography variant="body2">
                                            Choose a dataset from the dropdown above to see KPIs and data summaries
                                        </Typography>
                                    </Box>
                                ) : state.analytics.loading ? (
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
                                ) : state.analytics.error ? (
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
                                            {state.analytics.error.message || 'Failed to load analytics data'}
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Box>
                                    {/* KPI Cards Row */}
                                    <Grid container spacing={3} sx={{ mb: 4 }}>
                                        {state.analytics.kpis && state.analytics.kpis.map((kpi, index) => (
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
                                    {state.analytics.summary && (
                                        <Grid container spacing={3}>
                                            <Grid item xs={12}>
                                                <TableWidget
                                                    title={state.analytics.summary.title || "Data Summary"}
                                                    columns={state.analytics.summary.columns || []}
                                                    rows={state.analytics.summary.rows || []}
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
                )}
            </Container>
        </Box>
    );
};

export default Chart;
