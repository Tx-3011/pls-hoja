import React, { useMemo, useState } from 'react';
import { GraphicRenderer } from '@kanaries/graphic-walker';
import {
	Box,
	Card,
	CardContent,
	Typography,
	Stack,
	TextField,
	IconButton,
	ToggleButtonGroup,
	ToggleButton,
	Chip,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Button,
	Divider,
	Paper,
	Alert,
	CircularProgress,
	Tooltip,
} from '@mui/material';
import {
	Send as SendIcon,
	AutoAwesome as AutoIcon,
	BarChart as BarIcon,
	ShowChart as LineIcon,
	ScatterPlot as ScatterIcon,
	StackedBarChart as StackedIcon,
	Timeline as AreaIcon,
} from '@mui/icons-material';

const chartTypeOptions = [
	{ value: 'auto', label: 'Auto', icon: <AutoIcon fontSize="small" /> },
	{ value: 'bar', label: 'Bar', icon: <BarIcon fontSize="small" /> },
	{ value: 'line', label: 'Line', icon: <LineIcon fontSize="small" /> },
	{ value: 'area', label: 'Area', icon: <AreaIcon fontSize="small" /> },
	{ value: 'point', label: 'Scatter', icon: <ScatterIcon fontSize="small" /> },
	{ value: 'stacked', label: 'Stacked', icon: <StackedIcon fontSize="small" /> },
];

const MessageBubble = ({ role, content }) => {
	const isUser = role === 'user';
	return (
		<Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
			<Paper
				elevation={0}
				sx={{
					px: 2,
					py: 1.5,
					maxWidth: '80%',
					bgcolor: isUser ? 'primary.main' : 'background.paper',
					color: isUser ? 'primary.contrastText' : 'text.primary',
					borderRadius: 3,
					borderTopRightRadius: isUser ? 0 : 24,
					borderTopLeftRadius: isUser ? 24 : 0,
					border: (theme) => `1px solid ${isUser ? theme.palette.primary.dark : theme.palette.divider}`,
					whiteSpace: 'pre-wrap'
				}}
			>
				{content}
			</Paper>
		</Box>
	);
};

const ChatTab = ({
	datasets,
	selectedDataset,
	onDatasetChange,
	onLoadDataset,
	isLoading,
	gwData,
	chatState,
	onPreferredChartChange,
	onSendMessage
}) => {
	const [draft, setDraft] = useState('');

	const handleSubmit = async (event) => {
		event.preventDefault();
		const trimmed = draft.trim();
		if (!trimmed || chatState?.isProcessing) return;
		await onSendMessage(trimmed);
		setDraft('');
	};

	const handleChartPreferenceChange = (_, value) => {
		if (!value) return;
		onPreferredChartChange(value);
	};

	const hasDataset = Boolean(selectedDataset);

	const chartAvailable = useMemo(() => {
		return Boolean(chatState?.activeChart && gwData && gwData.dataSource && gwData.fields);
	}, [chatState?.activeChart, gwData]);

	return (
		<Stack spacing={3}>
			<Card>
				<CardContent>
					<Stack spacing={2}>
						<Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							Chat with your data
							<Chip label={chatState?.preferredChartType === 'auto' ? 'Auto chart type' : `Prefers ${chatState?.preferredChartType}`} size="small" color="primary" variant="outlined" />
						</Typography>

						<Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
							<FormControl fullWidth size="small">
								<InputLabel id="chat-dataset-label">Dataset</InputLabel>
								<Select
									labelId="chat-dataset-label"
									label="Dataset"
									value={selectedDataset}
									onChange={(event) => onDatasetChange(event.target.value)}
								>
									<MenuItem value="">
										<em>Select a dataset</em>
									</MenuItem>
									{datasets.map((dataset) => (
										<MenuItem key={dataset.datasetName} value={dataset.datasetName}>
											{dataset.datasetName}
										</MenuItem>
									))}
								</Select>
							</FormControl>

							<Tooltip title={hasDataset ? 'Reload the dataset into memory' : 'Choose a dataset first'}>
								<span>
									<Button
										variant="outlined"
										onClick={async () => {
											if (!hasDataset || isLoading) return;
											try {
												await onLoadDataset(selectedDataset, { updateSelection: true });
											} catch (error) {
												console.error('Failed to load dataset for chat tab:', error);
											}
										}}
										disabled={!hasDataset || isLoading}
									>
										{isLoading ? 'Loading…' : 'Load dataset'}
									</Button>
								</span>
							</Tooltip>

							<ToggleButtonGroup
								exclusive
								size="small"
								value={chatState?.preferredChartType || 'auto'}
								onChange={handleChartPreferenceChange}
								aria-label="Preferred chart type"
							>
								{chartTypeOptions.map((option) => (
									<ToggleButton key={option.value} value={option.value} aria-label={option.label}>
										<Stack direction="row" spacing={1} alignItems="center">
											{option.icon}
											<Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
												{option.label}
											</Box>
										</Stack>
									</ToggleButton>
								))}
							</ToggleButtonGroup>
						</Stack>
					</Stack>
				</CardContent>
			</Card>

			<Card sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 2 }}>
				<CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
					<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
						Conversation
					</Typography>
					<Divider />

					<Stack spacing={1.5} sx={{ flex: 1, overflowY: 'auto', maxHeight: 320, pr: 1 }}>
						{(chatState?.messages || []).map((message) => (
							<MessageBubble key={message.id} role={message.role} content={message.content} />
						))}
					</Stack>

					{chatState?.notes && chatState.notes.length > 0 && (
						<Alert severity="info" variant="outlined">
							<Stack spacing={1}>
								<Typography variant="subtitle2">Adjustments I made</Typography>
								<ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
									{chatState.notes.map((note, index) => (
										<li key={index}>{note}</li>
									))}
								</ul>
							</Stack>
						</Alert>
					)}

					<Box component="form" onSubmit={handleSubmit} sx={{ mt: 'auto' }}>
						<TextField
							fullWidth
							value={draft}
							onChange={(event) => setDraft(event.target.value)}
							placeholder={hasDataset ? 'Ask for a chart, e.g. “Compare revenue by region”' : 'Select a dataset to start chatting'}
							multiline
							minRows={2}
							disabled={chatState?.isProcessing}
							InputProps={{
								endAdornment: (
									<IconButton
										type="submit"
										color="primary"
										disabled={!draft.trim() || chatState?.isProcessing}
										sx={{ alignSelf: 'flex-end' }}
									>
										{chatState?.isProcessing ? <CircularProgress size={20} /> : <SendIcon />}
									</IconButton>
								)
							}}
						/>
					</Box>
				</CardContent>

				<Divider flexItem orientation="vertical" sx={{ display: { xs: 'none', lg: 'block' } }} />

				<CardContent sx={{ flex: 1 }}>
					<Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
						Chart Preview
					</Typography>
					{chatState?.isProcessing && !gwData && (
						<Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
							<CircularProgress />
						</Box>
					)}
					{chartAvailable ? (
						<Box sx={{ height: 360 }}>
							<GraphicRenderer
								data={gwData.dataSource}
								fields={gwData.fields}
								chart={chatState.activeChart.rendererChart}
							/>
						</Box>
					) : (
						<Box
							sx={{
								border: (theme) => `1px dashed ${theme.palette.divider}`,
								borderRadius: 2,
								minHeight: 320,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								textAlign: 'center',
								px: 3
							}}
						>
							<Typography variant="body2" color="text.secondary">
								{hasDataset
									? 'Ask the assistant for a visualization to see it appear here.'
									: 'Select a dataset and ask for a chart to see the preview.'}
							</Typography>
						</Box>
					)}
				</CardContent>
			</Card>
		</Stack>
	);
};

export default ChatTab;
