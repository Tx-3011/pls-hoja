import React, { useRef, useEffect } from 'react';
import { GraphicWalker } from '@kanaries/graphic-walker';
import axios from 'axios';

import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Grid,
    Chip,
    CircularProgress,
    LinearProgress,
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    PlayArrow as PlayIcon,
    Save as SaveIcon,
    Analytics as AnalyticsIcon,
    Folder as DatasetIcon,
} from '@mui/icons-material';
import { ENDPOINTS, MESSAGES } from '../constants/appConstants';

const DesignTab = ({ 
    datasets, 
    selectedDataset, 
    onDatasetChange, 
    gwData,
    isGraphicWalkerReady,
    onGraphicWalkerReady,
    isLoading,
    setIsLoading,
    onRefreshDashboards,
    onLoadDataset
}) => {
    const gw = useRef(null);

    // Set GraphicWalker as ready when gwData is available
    useEffect(() => {
        if (gwData && gwData.fields && gwData.dataSource) {
            onGraphicWalkerReady(true);
        }
    }, [gwData, onGraphicWalkerReady]);

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type);

        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            alert(MESSAGES.EXCEL_ONLY);
            return;
        }

        // Check file size (limit to 50MB)
        if (file.size > 50 * 1024 * 1024) {
            alert('File is too large. Please select a file smaller than 50MB.');
            return;
        }

        const datasetName = prompt("Enter the name for the dataset:");
        if (!datasetName || datasetName.trim() === '') {
            alert('Dataset name is required.');
            return;
        }

        setIsLoading(true);

        try {
            // Check if dataset already exists
            const existingDataset = datasets.find(d => d.datasetName === datasetName);
            if (existingDataset) {
                alert(MESSAGES.DATASET_EXISTS);
                setIsLoading(false);
                return;
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('datasetName', datasetName.trim());

            console.log('Uploading file:', file.name, 'with dataset name:', datasetName.trim());
            console.log('Upload URL:', ENDPOINTS.DATASET_UPLOAD);

            const response = await axios.post(ENDPOINTS.DATASET_UPLOAD, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.status === 200) {
                alert(MESSAGES.UPLOAD_SUCCESS);
                // Refresh datasets and select the newly uploaded one
                window.location.reload();
            }
        } catch (error) {
            console.error('Upload error:', error);
            console.error('Error response:', error.response);
            console.error('Error message:', error.message);
            
            let errorMessage = MESSAGES.UPLOAD_ERROR;
            
            if (error.response) {
                // Server responded with error status
                errorMessage = `Upload failed: ${error.response.data?.error || error.response.statusText || 'Unknown server error'}`;
            } else if (error.request) {
                // Request was made but no response received
                errorMessage = 'Upload failed: No response from server. Please check if the backend is running.';
            } else {
                // Something else happened
                errorMessage = `Upload failed: ${error.message}`;
            }
            
            alert(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoClick = async () => {
        if (!selectedDataset) {
            alert('Please select a dataset first');
            return;
        }
        
        try {
            await onLoadDataset(selectedDataset);
        } catch (error) {
            console.error('Error loading dataset:', error);
            alert('Error loading dataset: ' + error.message);
        }
    };

    const exportChartConfigs = async () => {
        if (!gw.current) {
            alert('GraphicWalker is not ready');
            return;
        }

        const dashboardName = prompt("Enter the name for the dashboard:");
        if (!dashboardName) return;

        try {
            const chartConfigList = gw.current.exportCode();
            const isMultiple = Array.isArray(chartConfigList) && chartConfigList.length > 1;

            if (!selectedDataset) {
                alert('No dataset selected');
                return;
            }

            await axios.post(ENDPOINTS.DASHBOARD, {
                dashboardName: dashboardName,
                datasetName: selectedDataset,
                jsonFormat: JSON.stringify(chartConfigList, null, 2),
                isMultiple,
            });

            alert(MESSAGES.SAVE_SUCCESS);
            onRefreshDashboards();

        } catch (error) {
            console.error('Error saving dashboard:', error);
            if (error.response && error.response.data && error.response.data.error) {
                alert(error.response.data.error);
            } else {
                alert('Failed to save dashboard');
            }
        }
    };

    const handleGraphicWalkerLoad = () => {
        onGraphicWalkerReady(true);
    };

    return (
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
                                value={selectedDataset}
                                onChange={(e) => onDatasetChange(e.target.value)}
                                label="Select Dataset"
                                disabled={isLoading}
                                startAdornment={<DatasetIcon sx={{ mr: 1, color: 'action.active' }} />}
                            >
                                <MenuItem value="">
                                    <em>Choose a dataset...</em>
                                </MenuItem>
                                {datasets.map((dataset, idx) => (
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
                            disabled={!selectedDataset || isLoading}
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
                <Box sx={{ mb: 2 }}>
                    <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<SaveIcon />}
                        onClick={exportChartConfigs}
                        size="large"
                        disabled={!isGraphicWalkerReady}
                    >
                        Save Dashboard
                    </Button>
                </Box>

                {/* Chart Visualization Area */}
                <Card variant="outlined" sx={{ minHeight: 500, position: 'relative' }}>
                    {isLoading && <LinearProgress />}
                    <CardContent>
                        {gwData ? (
                            <GraphicWalker
                                fields={gwData.fields}
                                data={gwData.dataSource}
                                vizThemeConfig="default"
                                storeRef={gw}
                                i18nLang="english"
                                appearance='media'
                                onMount={handleGraphicWalkerLoad}
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
    );
};

export default DesignTab;