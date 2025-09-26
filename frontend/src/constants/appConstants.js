export const TABS = {
    DESIGN: 'design',
    VIEW: 'view',
    WIDGETS: 'widgets',
    CHAT: 'chat'
};

export const ENDPOINTS = {
    DASHBOARD: 'http://localhost:5246/Dashboard',
    DASHBOARD_DELETE: 'http://localhost:5246/Dashboard',
    DATASET: 'http://localhost:5246/Dataset',
    DATASET_UPLOAD: 'http://localhost:5246/Dataset/Upload', 
    ANALYTICS_KPIS: 'http://localhost:5246/api/analytics/kpis',
    ANALYTICS_SUMMARY: 'http://localhost:5246/api/analytics/summary',
    EXCEL_READ: 'http://localhost:5246/api/excel/read',
    STORED_PROCEDURE: 'http://localhost:5246/api/storedprocedure/execute'
};

export const MESSAGES = {
    NO_DATA: 'Select a dataset from the dropdown or upload from excel',
    LOADING: 'Loading...',
    ERROR: 'An error occurred',
    NO_DASHBOARDS: 'No dashboards saved',
    UPLOAD_SUCCESS: 'File uploaded successfully',
    SAVE_SUCCESS: 'Dashboard saved successfully',
    DATASET_EXISTS: 'Dataset already exists. Please select dataset from dropdown',
    FETCH_ERROR: 'Failed to fetch data',
    EXCEL_ONLY: 'Please upload only Excel files (.xlsx or .xls)',
    DATASET_PATH_EXISTS: 'Excel file with this path already exists. Please select dataset from dropdown',
    UPLOAD_ERROR: 'Failed to upload file',
    INVALID_FILE: 'Invalid file format'
};