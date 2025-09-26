import { useState, useCallback } from 'react';
import axios from 'axios';
import { ENDPOINTS } from '../constants/appConstants';

const useDataManager = () => {
    const [state, setState] = useState({
        dashboard: {
            items: [],
            loading: true,
            error: null,
            selected: null,
            isClicked: false,
            isMultiple: false,
            filteredItems: []
        },
        datasets: {
            items: [],
            loading: true,
            error: null
        },
        analytics: {
            kpis: null,
            summary: null,
            loading: false,
            error: null
        },
        gwData: null,
        chartConfig: null,
        activeTab: 'design',
        selectedDataset: '',
    });

    const [isGoClicked, setIsGoClicked] = useState(false);
    const [isGraphicWalkerReady, setIsGraphicWalkerReady] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchData = useCallback(async (endpoint, params = {}) => {
        try {
            const response = await axios.get(endpoint, { params });

            switch (endpoint) {
                case ENDPOINTS.DASHBOARD:
                    setState(prev => ({
                        ...prev,
                        dashboard: {
                            ...prev.dashboard,
                            items: response.data,
                            filteredItems: response.data,
                            loading: false,
                            error: null
                        }
                    }));
                    break;

                case ENDPOINTS.DATASET:
                    setState(prev => ({
                        ...prev,
                        datasets: {
                            items: response.data,
                            loading: false,
                            error: null
                        },
                    }));
                    break;

                case ENDPOINTS.ANALYTICS_KPIS:
                    // Transform raw KPI data into widget format
                    const formattedKpis = [
                        {
                            title: "Total Records",
                            value: response.data.totalRecords || 0,
                            delta: 5.2,
                            unit: ""
                        },
                        {
                            title: "Total Value",
                            value: response.data.totalValue || 0,
                            delta: -2.1,
                            unit: ""
                        },
                        {
                            title: "Average Value",
                            value: response.data.averageValue || 0,
                            delta: 8.3,
                            unit: "",
                            precision: 1
                        },
                        {
                            title: "Unique Items",
                            value: response.data.uniqueCount || 0,
                            delta: 12.5,
                            unit: ""
                        }
                    ];
                    
                    setState(prev => ({
                        ...prev,
                        analytics: {
                            ...prev.analytics,
                            kpis: formattedKpis,
                            loading: false,
                            error: null
                        }
                    }));
                    break;

                case ENDPOINTS.ANALYTICS_SUMMARY:
                    // Transform raw summary data into widget format
                    const formattedSummary = {
                        title: "Top Items",
                        columns: [
                            { key: 'name', label: 'Item Name' },
                            { key: 'value', label: 'Value', align: 'right' },
                            { key: 'status', label: 'Status', align: 'center' }
                        ],
                        rows: response.data.topItems?.map((item, index) => ({
                            id: item.id,
                            name: item.name?.substring(0, 20) + (item.name?.length > 20 ? '...' : '') || `Item ${index + 1}`,
                            value: item.value,
                            status: item.status
                        })) || []
                    };
                    
                    setState(prev => ({
                        ...prev,
                        analytics: {
                            ...prev.analytics,
                            summary: formattedSummary,
                            loading: false,
                            error: null
                        }
                    }));
                    break;

                default:
                    break;
            }

        } catch (err) {
            const errorState = {
                loading: false,
                error: err
            };

            switch (endpoint) {
                case ENDPOINTS.DASHBOARD:
                    setState(prev => ({
                        ...prev,
                        dashboard: { ...prev.dashboard, ...errorState }
                    }));
                    break;

                case ENDPOINTS.DATASET:
                    setState(prev => ({
                        ...prev,
                        datasets: { ...prev.datasets, ...errorState }
                    }));
                    break;

                case ENDPOINTS.ANALYTICS_KPIS:
                case ENDPOINTS.ANALYTICS_SUMMARY:
                    setState(prev => ({
                        ...prev,
                        analytics: { ...prev.analytics, ...errorState }
                    }));
                    break;

                default:
                    console.warn('Unknown endpoint:', endpoint);
                    break;
            }

            console.error(`Error fetching ${endpoint}:`, err);
        }
    }, []);

    const fetchAnalyticsData = useCallback(async (datasetName) => {
        if (!datasetName) return;

        setState(prev => ({
            ...prev,
            analytics: { ...prev.analytics, loading: true, error: null }
        }));

        try {
            // Fetch KPIs and summary data concurrently
            await Promise.all([
                fetchData(ENDPOINTS.ANALYTICS_KPIS, { datasetName }),
                fetchData(ENDPOINTS.ANALYTICS_SUMMARY, { datasetName })
            ]);
        } catch (error) {
            console.error('Error fetching analytics data:', error);
            setState(prev => ({
                ...prev,
                analytics: {
                    ...prev.analytics,
                    loading: false,
                    error: error
                }
            }));
        }
    }, [fetchData]);

    const handleDatasetChange = useCallback((value) => {
        setState(prev => ({
            ...prev,
            selectedDataset: value
        }));
        setIsGoClicked(false);
        setIsGraphicWalkerReady(false);
        
        // Fetch analytics data for the selected dataset
        if (value) {
            fetchAnalyticsData(value);
        }
    }, [fetchAnalyticsData]);

    const processExcelData = useCallback(async (dataset) => {
        try {
            const response = await axios.get(`${ENDPOINTS.EXCEL_READ}?excelPath=${encodeURIComponent(dataset.excelPath)}`);
            
            if (response.data && response.data.length > 0) {
                // Transform raw Excel data to GraphicWalker format
                const dataSource = response.data;
                const fields = Object.keys(dataSource[0] || {}).map(key => ({
                    fid: key,
                    name: key,
                    semanticType: typeof dataSource[0][key] === 'number' ? 'quantitative' : 'nominal',
                    analyticType: typeof dataSource[0][key] === 'number' ? 'measure' : 'dimension'
                }));

                const transformedData = { fields, dataSource };
                console.log("Excel data processed successfully:", transformedData);
                return transformedData;
            } else {
                throw new Error('No data found in Excel file');
            }
        } catch (error) {
            console.error('Error processing Excel data:', error);
            throw error;
        }
    }, []);

    const processStoredProcedureData = useCallback(async (dataset) => {
        try {
            const response = await axios.get(`${ENDPOINTS.STORED_PROCEDURE}?storedProcedureName=${encodeURIComponent(dataset.sp)}`);
            
            if (response.data && response.data.length > 0) {
                // Transform stored procedure data to GraphicWalker format
                const dataSource = response.data;
                const fields = Object.keys(dataSource[0] || {}).map(key => ({
                    fid: key,
                    name: key,
                    semanticType: typeof dataSource[0][key] === 'number' ? 'quantitative' : 'nominal',
                    analyticType: typeof dataSource[0][key] === 'number' ? 'measure' : 'dimension'
                }));

                return { fields, dataSource };
            } else {
                throw new Error('No data returned from stored procedure');
            }
        } catch (error) {
            console.error('Error processing stored procedure data:', error);
            throw error;
        }
    }, []);

    return {
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
    };
};

export default useDataManager;