import React from 'react';
import { Card, Tabs, Tab, Box } from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Visibility as ViewIcon,
    Analytics as AnalyticsIcon,
    ChatBubbleOutline as ChatIcon,
} from '@mui/icons-material';
import { TABS } from '../constants/appConstants';

const TabNavigation = ({ activeTab, onTabChange }) => {
    return (
        <Card sx={{ mb: 3 }}>
            <Tabs
                value={activeTab}
                onChange={(e, newValue) => onTabChange(newValue)}
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
                <Tab 
                    value={TABS.CHAT} 
                    label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ChatIcon />
                            Chat Assistant
                        </Box>
                    }
                />
            </Tabs>
        </Card>
    );
};

export default TabNavigation;