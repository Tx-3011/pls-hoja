import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon
} from '@mui/icons-material';

const KpiWidget = ({ title, value, delta, unit = '', precision = 0 }) => {
  // Format the value with appropriate precision
  const formatValue = (val) => {
    if (typeof val === 'number') {
      return val.toLocaleString(undefined, {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision
      });
    }
    return val;
  };

  // Determine delta color and icon
  const getDeltaProps = (deltaValue) => {
    if (deltaValue > 0) {
      return {
        color: 'success',
        icon: <TrendingUpIcon fontSize="small" />,
        prefix: '+'
      };
    } else if (deltaValue < 0) {
      return {
        color: 'error',
        icon: <TrendingDownIcon fontSize="small" />,
        prefix: ''
      };
    } else {
      return {
        color: 'default',
        icon: null,
        prefix: ''
      };
    }
  };

  const deltaProps = delta !== undefined ? getDeltaProps(delta) : null;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: (theme) => theme.shadows[8],
        },
      }}
    >
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Title */}
        <Typography
          variant="subtitle2"
          color="text.secondary"
          gutterBottom
          sx={{
            fontSize: '0.875rem',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          {title}
        </Typography>

        {/* Main Value */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              fontSize: { xs: '1.75rem', sm: '2.5rem' },
              lineHeight: 1,
            }}
          >
            {formatValue(value)}
            {unit && (
              <Typography
                component="span"
                variant="h5"
                sx={{
                  fontWeight: 400,
                  color: 'text.secondary',
                  ml: 1,
                  fontSize: { xs: '1rem', sm: '1.25rem' }
                }}
              >
                {unit}
              </Typography>
            )}
          </Typography>
        </Box>

        {/* Delta */}
        {deltaProps && delta !== undefined && delta !== null && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Chip
              icon={deltaProps.icon}
              label={`${deltaProps.prefix}${Math.abs(delta).toFixed(1)}%`}
              color={deltaProps.color}
              size="small"
              variant="outlined"
              sx={{
                fontWeight: 600,
                fontSize: '0.75rem',
                '& .MuiChip-icon': {
                  fontSize: '1rem'
                }
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default KpiWidget;