import React, { useEffect, useState, useCallback } from 'react';
import { Box, Container, CircularProgress, Typography } from '@mui/material';
import { GraphicRenderer } from '@kanaries/graphic-walker';
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
        handleDatasetChange,
        processExcelData,
        processStoredProcedureData
    } = useDataManager();

    const [experienceMode, setExperienceMode] = useState('simple');
    const [chatMessages, setChatMessages] = useState(() => ([
        {
            role: 'bot',
            text: "Hi there! Ask me for a chart and I'll get right on it."
        }
    ]));
    const [chatPreview, setChatPreview] = useState(null);
    const [isGeneratingChat, setIsGeneratingChat] = useState(false);

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

    const handleTabChange = (newTab) => {
        setState(prev => ({ ...prev, activeTab: newTab }));
    };

    const handleExperienceModeChange = (mode) => {
        setExperienceMode(mode);
        if (mode === 'advanced') {
            setState(prev => ({ ...prev, activeTab: TABS.DESIGN }));
        }
    };

    const handleOpenChatTab = () => {
        setExperienceMode('advanced');
        setState(prev => ({ ...prev, activeTab: TABS.CHAT }));
    };

    const handleSendChatMessage = useCallback(async (messageText) => {
        const trimmed = messageText.trim();
        if (!trimmed) return;

        if (isGeneratingChat) {
            return;
        }

        setChatMessages(prev => ([
            ...prev,
            { role: 'user', text: trimmed }
        ]));

        setIsGeneratingChat(true);

        try {
            let gwData = state.gwData;
            if (!gwData && state.selectedDataset) {
                gwData = await loadDataset(state.selectedDataset);
            }

            if (!gwData) {
                setChatMessages(prev => ([
                    ...prev,
                    {
                        role: 'bot',
                        text: 'I need a dataset loaded before I can draft a chart. Try loading one from the Design tab first.'
                    }
                ]));
                return;
            }

            const result = generateChatChart(trimmed, gwData);

            if (result.success) {
                setChatPreview(result.chart);
                setChatMessages(prev => ([
                    ...prev,
                    { role: 'bot', text: result.explanation }
                ]));
            } else {
                setChatMessages(prev => ([
                    ...prev,
                    { role: 'bot', text: result.message }
                ]));
            }
        } catch (error) {
            console.error('Failed to generate chat chart:', error);
            setChatMessages(prev => ([
                ...prev,
                {
                    role: 'bot',
                    text: "Something went wrong while I was building that chart. Please try again or tweak the request."
                }
            ]));
        } finally {
            setIsGeneratingChat(false);
        }
    }, [isGeneratingChat, state.gwData, state.selectedDataset, loadDataset]);

    const handleResetChat = useCallback(() => {
        setChatPreview(null);
        setChatMessages([
            {
                role: 'bot',
                text: "Hi there! Ask me for a chart and I'll get right on it."
            }
        ]);
    }, []);

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

    const renderMainContent = () => {
        if (experienceMode === 'simple') {
            return (
                <SimpleMode
                    datasets={state.datasets.items}
                    selectedDataset={state.selectedDataset}
                    onDatasetChange={handleDatasetChange}
                    analytics={state.analytics}
                    gwData={state.gwData}
                    isLoading={isLoading}
                    onLoadDataset={loadDataset}
                />
            );
        }

        return (
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
                        messages={chatMessages}
                        onSendMessage={handleSendChatMessage}
                        onReset={handleResetChat}
                        isBusy={isGeneratingChat}
                    >
                        {chatPreview && state.gwData ? (
                            <Box sx={{ width: '100%', maxWidth: '100%' }}>
                                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                                    Suggested chart: {chatPreview.type === 'point' ? 'Scatter plot' : chatPreview.type.charAt(0).toUpperCase() + chatPreview.type.slice(1)}
                                </Typography>
                                <Box sx={{ width: '100%', height: 420 }}>
                                    <GraphicRenderer
                                        data={state.gwData.dataSource}
                                        fields={state.gwData.fields}
                                        chart={chatPreview.rendererChart}
                                    />
                                </Box>
                            </Box>
                        ) : null}
                    </ChatTab>
                )}
            </>
        );
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
                onOpenChat={handleOpenChatTab}
            />

            <Container maxWidth="xl" sx={{ py: 3 }}>
                {renderMainContent()}
            </Container>
        </Box>
    );
};

export default Chart;