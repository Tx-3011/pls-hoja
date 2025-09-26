import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Stack,
    Divider,
    Paper,
    IconButton
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import RefreshIcon from '@mui/icons-material/Refresh';

const ChatTab = ({ messages, onSendMessage, onReset, children }) => {
    const [draft, setDraft] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSend = () => {
        const trimmed = draft.trim();
        if (!trimmed) {
            return;
        }

        onSendMessage(trimmed);
        setDraft('');
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSend();
        }
    };

    return (
        <Paper sx={{ p: { xs: 2, md: 3 }, display: 'flex', minHeight: '70vh' }} elevation={3}>
            <Box
                sx={{
                    width: { xs: '100%', md: '28%' },
                    borderRight: {
                        xs: 'none',
                        md: (theme) => `1px solid ${theme.palette.divider}`
                    },
                    pr: { xs: 0, md: 3 },
                    mr: { xs: 0, md: 3 },
                    display: 'flex',
                    flexDirection: 'column',
                    mb: { xs: 3, md: 0 }
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            Chat Assistant
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Ask for charts using natural language.
                        </Typography>
                    </Box>
                    {onReset && (
                        <IconButton size="small" onClick={onReset}>
                            <RefreshIcon fontSize="small" />
                        </IconButton>
                    )}
                </Box>

                <Divider sx={{ mb: 2 }} />

                <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
                    <Stack spacing={1.5}>
                        {messages.map((message, index) => (
                            <Box
                                key={`${message.role}-${index}`}
                                sx={{
                                    alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                                    maxWidth: '100%'
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: 'text.secondary',
                                        display: 'block',
                                        mb: 0.5,
                                        textTransform: 'capitalize'
                                    }}
                                >
                                    {message.role}
                                </Typography>
                                <Box
                                    sx={{
                                        px: 2,
                                        py: 1.5,
                                        borderRadius: 2,
                                        backgroundColor:
                                            message.role === 'user'
                                                ? (theme) => theme.palette.primary.main
                                                : (theme) => theme.palette.action.hover,
                                        color:
                                            message.role === 'user'
                                                ? (theme) => theme.palette.primary.contrastText
                                                : 'text.primary',
                                        boxShadow: (theme) =>
                                            message.role === 'user'
                                                ? '0 6px 14px rgba(25,118,210,0.18)'
                                                : '0 4px 10px rgba(15,23,42,0.08)'
                                    }}
                                >
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                        {message.text}
                                    </Typography>
                                </Box>
                            </Box>
                        ))}
                        <span ref={messagesEndRef} />
                    </Stack>
                </Box>

                <Box sx={{ mt: 2 }}>
                    <TextField
                        label="Ask for a chart"
                        placeholder="e.g. Compare total revenue by region"
                        multiline
                        minRows={2}
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={handleKeyDown}
                        fullWidth
                    />
                    <Button
                        variant="contained"
                        endIcon={<SendIcon />}
                        onClick={handleSend}
                        disabled={!draft.trim()}
                        sx={{ mt: 1.5, borderRadius: 2 }}
                        fullWidth
                    >
                        Send
                    </Button>
                </Box>
            </Box>

            <Divider orientation="vertical" flexItem sx={{ mx: { xs: 0, md: 2 }, display: { xs: 'none', md: 'block' } }} />

            <Box
                sx={{
                    flex: 1,
                    mt: { xs: 3, md: 0 },
                    backgroundColor: (theme) => theme.palette.background.default,
                    borderRadius: 2,
                    border: (theme) => `1px dashed ${theme.palette.divider}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: { xs: 2, md: 4 },
                    minHeight: { xs: '40vh', md: 'auto' }
                }}
            >
                {children ? (
                    children
                ) : (
                    <Typography variant="body1" color="text.secondary" align="center">
                        Generated charts will appear here once the assistant has created them.
                    </Typography>
                )}
            </Box>
        </Paper>
    );
};

export default ChatTab;
