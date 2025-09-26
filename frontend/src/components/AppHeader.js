import React from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    Box,
    Switch,
    ToggleButtonGroup,
    ToggleButton,
    Paper,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    Analytics as AnalyticsIcon,
    Brightness4 as DarkIcon,
    Brightness7 as LightIcon,
    RocketLaunch as SimpleIcon,
    Science as AdvancedIcon,
    ChatBubbleOutline as ChatIcon
} from '@mui/icons-material';

const AppHeader = ({
    themeMode,
    toggleTheme,
    experienceMode,
    onModeChange,
    onOpenChat
}) => {
    return (
        <AppBar
            position="sticky"
            elevation={0}
            color="transparent"
            sx={{
                backdropFilter: 'blur(12px)',
                backgroundColor: (theme) =>
                    theme.palette.mode === 'light'
                        ? 'rgba(250, 250, 255, 0.88)'
                        : 'rgba(18, 18, 24, 0.88)',
                borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                zIndex: (theme) => theme.zIndex.drawer + 1
            }}
        >
            <Toolbar sx={{ py: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            width: 44,
                            height: 44,
                            display: 'grid',
                            placeItems: 'center',
                            borderRadius: 2,
                            background: (theme) =>
                                theme.palette.mode === 'light'
                                    ? 'linear-gradient(135deg, rgba(25,118,210,0.15) 0%, rgba(156,39,176,0.2) 100%)'
                                    : 'linear-gradient(135deg, rgba(144,202,249,0.18) 0%, rgba(206,147,216,0.18) 100%)'
                        }}
                    >
                        <AnalyticsIcon color="primary" />
                    </Paper>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            GraphicWalker Studio
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Build, explore, and share smart dashboards
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 'auto' }}>
                    <ToggleButtonGroup
                        value={experienceMode}
                        exclusive
                        onChange={(event, value) => value && onModeChange(value)}
                        size="small"
                        sx={{
                            '& .MuiToggleButton-root': {
                                textTransform: 'none',
                                fontWeight: 600,
                                px: 2.5,
                                borderRadius: 999,
                            },
                        }}
                    >
                        <ToggleButton value="simple">
                            <SimpleIcon sx={{ mr: 1 }} fontSize="small" />
                            Simple
                        </ToggleButton>
                        <ToggleButton value="advanced" id="advanced-mode">
                            <AdvancedIcon sx={{ mr: 1 }} fontSize="small" />
                            Advanced
                        </ToggleButton>
                    </ToggleButtonGroup>

                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <LightIcon sx={{ fontSize: 18, opacity: themeMode === 'dark' ? 0.4 : 1 }} />
                        <Switch
                            checked={themeMode === 'dark'}
                            onChange={toggleTheme}
                            sx={{ mx: 1 }}
                        />
                        <DarkIcon sx={{ fontSize: 18, opacity: themeMode === 'dark' ? 1 : 0.4 }} />
                    </Box>

                    {onOpenChat && (
                        <Tooltip title="Open Chat Assistant">
                            <IconButton
                                color="primary"
                                onClick={onOpenChat}
                                sx={{
                                    backgroundColor: (theme) =>
                                        theme.palette.mode === 'light'
                                            ? 'rgba(25,118,210,0.1)'
                                            : 'rgba(144,202,249,0.12)',
                                    borderRadius: 2,
                                    transition: 'transform 0.2s ease',
                                    '&:hover': {
                                        transform: 'translateY(-1px)'
                                    }
                                }}
                            >
                                <ChatIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default AppHeader;