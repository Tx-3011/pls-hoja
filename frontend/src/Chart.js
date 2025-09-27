import React, { useEffect, useState, useCallback } from 'react';
import { Box, Container, CircularProgress, Typography } from '@mui/material';
import { 
    AppHeader, 
    TabNavigation, 
    DesignTab, 
    ViewTab, 
    AnalyticsTab,
    SimpleMode,
    ChatTab
} from './components';
import { TABS, ENDPOINTS, MESSAGES } from './constants/appConstants';
import useDataManager from './hooks/useDataManager';
import generateChatChart from './utils/chatRuleEngine';

const Chart = ({ themeMode, toggleTheme }) => {
    const {
        state,
        setState,
        isGraphicWalkerReady,
        setIsGraphicWalkerReady,
        isLoading,
        setIsLoading,
        fetchData,
        handleDatasetChange: updateDatasetSelection,
        processExcelData,
        processStoredProcedureData
    } = useDataManager();

    const [experienceMode, setExperienceMode] = useState('simple');
    const [chatState, setChatState] = useState({
        messages: [
            {
                id: 'welcome',
                role: 'assistant',
                content: 'Select a dataset and ask for a chart. I will translate your request into a visualization.'
            }
        ],
        preferredChartType: 'auto',
        isProcessing: false,
        activeChart: null,
        notes: [],
        explanation: ''
    });

    const handleDatasetChange = useCallback((value) => {
        updateDatasetSelection(value);
        setChatState(prev => ({
            ...prev,
            activeChart: null,
            notes: [],
            explanation: '',
            isProcessing: false
        }));
    }, [updateDatasetSelection]);

    useEffect(() => {
        fetchData(ENDPOINTS.DATASET);
    }, [fetchData]);

    useEffect(() => {
        if (state.activeTab === TABS.VIEW) {
            fetchData(ENDPOINTS.DASHBOARD);
        }
    }, [state.activeTab, fetchData]);

    const loadDataset = useCallback(async (datasetName, options = { updateSelection: false }) => {
        if (!datasetName) return null;

        const selectedDatasetObj = state.datasets.items.find(
            dataset => dataset.datasetName === datasetName
        );

        if (!selectedDatasetObj) {
            throw new Error('Selected dataset not found');
        }

        setIsLoading(true);

        try {
            const processedData = selectedDatasetObj.isItFromExcel
                ? await processExcelData(selectedDatasetObj)
                : await processStoredProcedureData(selectedDatasetObj);

            setState(prev => ({
                ...prev,
                gwData: processedData,
                selectedDataset: options.updateSelection ? datasetName : prev.selectedDataset,
            }));

            return processedData;
        } finally {
            setIsLoading(false);
        }
    }, [state.datasets.items, processExcelData, processStoredProcedureData, setIsLoading, setState]);

    const handleChatTypeSelect = useCallback((type) => {
        setChatState(prev => ({
            ...prev,
            preferredChartType: type
        }));
    }, []);

    const handleSendChatMessage = useCallback(async (message) => {
        const trimmed = message.trim();
        if (!trimmed) {
            return;
        }

        const userMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: trimmed
        };

        setChatState(prev => ({
            ...prev,
            messages: [...prev.messages, userMessage],
            isProcessing: true
        }));

        try {
            const datasetName = state.selectedDataset;
            if (!datasetName) {
                throw new Error('Please select a dataset before asking for a chart.');
            }

            let workingData = state.gwData;
            if (!workingData) {
                workingData = await loadDataset(datasetName, { updateSelection: false });
            }

            if (!workingData) {
                throw new Error('I could not load the dataset. Try again after loading it manually.');
            }

            const options = {};
            if (chatState.preferredChartType && chatState.preferredChartType !== 'auto') {
                options.preferredChartType = chatState.preferredChartType;
            }

            const result = generateChatChart(trimmed, workingData, options);

            if (!result.success) {
                const assistantMessage = {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: result.message
                };

                setChatState(prev => ({
                    ...prev,
                    messages: [...prev.messages, assistantMessage],
                    isProcessing: false,
                    activeChart: prev.activeChart,
                    notes: [],
                    explanation: ''
                }));
                return;
            }

            const assistantMessage = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: result.explanation
            };

            setChatState(prev => ({
                ...prev,
                messages: [...prev.messages, assistantMessage],
                isProcessing: false,
                activeChart: result.chart,
                notes: result.notes || [],
                explanation: result.explanation
            }));
        } catch (error) {
            console.error('Chat assistant error:', error);
            const assistantMessage = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: error.message || 'Something went wrong while generating the chart. Please try again.'
            };

            setChatState(prev => ({
                ...prev,
                messages: [...prev.messages, assistantMessage],
                isProcessing: false
            }));
        }
    }, [chatState.preferredChartType, loadDataset, state.gwData, state.selectedDataset]);

    const handleTabChange = (newTab) => {
        setState(prev => ({ ...prev, activeTab: newTab }));
    };

    const handleExperienceModeChange = (mode) => {
        setExperienceMode(mode);
        if (mode === 'advanced') {
            setState(prev => ({ ...prev, activeTab: TABS.DESIGN }));
        }
    };

    const handleDashboardAction = async (dashboard, action) => {
        if (action === 'view') {
            setState(prev => ({
                ...prev,
                dashboard: { ...prev.dashboard, selected: dashboard }
            }));
            
            // Load dashboard data
            try {
                await loadDataset(dashboard.datasetName, { updateSelection: true });
            } catch (error) {
                console.error('Error loading dashboard data:', error);
            }
        } else if (action === 'delete') {
            if (window.confirm(`Are you sure you want to delete "${dashboard.dashboardName}"?`)) {
                try {
                    const response = await fetch(`${ENDPOINTS.DASHBOARD_DELETE}/${encodeURIComponent(dashboard.dashboardName)}`, {
                        method: 'DELETE'
                    });
                    
                    if (response.ok) {
                        alert('Dashboard deleted successfully');
                        fetchData(ENDPOINTS.DASHBOARD); // Refresh the list
                    } else {
                        const error = await response.json();
                        alert(error.error || 'Failed to delete dashboard');
                    }
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

    const refreshDashboards = () => {
        fetchData(ENDPOINTS.DASHBOARD);
    };

    // Loading state
    if (state.datasets.loading) {
        return (
            <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
                <AppHeader 
                    themeMode={themeMode} 
                    toggleTheme={toggleTheme}
                    experienceMode={experienceMode}
                    onModeChange={handleExperienceModeChange}
                />
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '60vh',
                        gap: 2,
                    }}
                >
                    <CircularProgress size={60} />
                    <Typography variant="h6" color="text.secondary">
                        {MESSAGES.LOADING}
                    </Typography>
                </Box>
            </Box>
        );
    }

    // Error state
    if (state.datasets.error) {
        return (
            <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
                <AppHeader 
                    themeMode={themeMode} 
                    toggleTheme={toggleTheme}
                    experienceMode={experienceMode}
                    onModeChange={handleExperienceModeChange}
                />
                <Container maxWidth="xl" sx={{ py: 3 }}>
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                        <Typography variant="h6" color="error" gutterBottom>
                            {MESSAGES.ERROR}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {state.datasets.error.message || MESSAGES.FETCH_ERROR}
                        </Typography>
                    </Box>
                </Container>
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            <AppHeader 
                themeMode={themeMode} 
                toggleTheme={toggleTheme}
                experienceMode={experienceMode}
                onModeChange={handleExperienceModeChange}
            />

            <Container maxWidth="xl" sx={{ py: 3 }}>
                {experienceMode === 'simple' ? (
                    <SimpleMode
                        datasets={state.datasets.items}
                        selectedDataset={state.selectedDataset}
                        onDatasetChange={handleDatasetChange}
                        analytics={state.analytics}
                        gwData={state.gwData}
                        isLoading={isLoading}
                        onLoadDataset={loadDataset}
                    />
                ) : (
                    <>
                        <TabNavigation 
                            activeTab={state.activeTab} 
                            onTabChange={handleTabChange} 
                        />

                        {state.activeTab === TABS.DESIGN && (
                            <DesignTab
                                datasets={state.datasets.items}
                                selectedDataset={state.selectedDataset}
                                onDatasetChange={handleDatasetChange}
                                gwData={state.gwData}
                                isGraphicWalkerReady={isGraphicWalkerReady}
                                onGraphicWalkerReady={setIsGraphicWalkerReady}
                                isLoading={isLoading}
                                setIsLoading={setIsLoading}
                                onRefreshDashboards={refreshDashboards}
                                onLoadDataset={loadDataset}
                            />
                        )}

                        {state.activeTab === TABS.VIEW && (
                            <ViewTab
                                dashboards={state.dashboard.items}
                                loading={state.dashboard.loading}
                                error={state.dashboard.error}
                                selectedDashboard={state.dashboard.selected}
                                gwData={state.gwData}
                                onDashboardAction={handleDashboardAction}
                                onBackToList={resetDashboardView}
                            />
                        )}

                        {state.activeTab === TABS.WIDGETS && (
                            <AnalyticsTab
                                analytics={state.analytics}
                                selectedDataset={state.selectedDataset}
                            />
                        )}

                        {state.activeTab === TABS.CHAT && (
                            <ChatTab
                                datasets={state.datasets.items}
                                selectedDataset={state.selectedDataset}
                                onDatasetChange={handleDatasetChange}
                                onLoadDataset={loadDataset}
                                isLoading={isLoading}
                                gwData={state.gwData}
                                chatState={chatState}
                                onPreferredChartChange={handleChatTypeSelect}
                                onSendMessage={handleSendChatMessage}
                            />
                        )}
                    </>
                )}
            </Container>
        </Box>
    );
};

export default Chart;