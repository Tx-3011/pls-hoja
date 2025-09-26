import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Chip
} from '@mui/material';

const TableWidget = ({ 
  title, 
  columns, 
  rows, 
  maxHeight = 400,
  showRowIndex = false,
  highlightFirstColumn = false 
}) => {
  // Render cell content with smart formatting
  const renderCellContent = (value, column) => {
    // Handle null/undefined values
    if (value === null || value === undefined) {
      return (
        <Typography variant="body2" color="text.secondary" fontStyle="italic">
          N/A
        </Typography>
      );
    }

    // Handle numeric values
    if (typeof value === 'number') {
      // If column has a format function, use it
      if (column?.format) {
        return column.format(value);
      }
      
      // Default number formatting
      return value.toLocaleString();
    }

    // Handle boolean values as chips
    if (typeof value === 'boolean') {
      return (
        <Chip
          label={value ? 'Yes' : 'No'}
          color={value ? 'success' : 'default'}
          size="small"
          variant="outlined"
        />
      );
    }

    // Handle arrays (join with commas)
    if (Array.isArray(value)) {
      return value.join(', ');
    }

    // Default string rendering
    return value.toString();
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: (theme) => theme.shadows[4],
        },
      }}
    >
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', pb: 1 }}>
        {/* Title */}
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            fontWeight: 600,
            color: 'text.primary',
            mb: 2
          }}
        >
          {title}
        </Typography>

        {/* Table Container */}
        <TableContainer 
          sx={{ 
            flex: 1, 
            maxHeight: maxHeight,
            '& .MuiTable-root': {
              minWidth: 'unset'
            }
          }}
        >
          <Table stickyHeader size="small">
            {/* Table Header */}
            <TableHead>
              <TableRow>
                {showRowIndex && (
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      backgroundColor: 'grey.50',
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                      width: '50px'
                    }}
                  >
                    #
                  </TableCell>
                )}
                {columns.map((column, index) => (
                  <TableCell
                    key={column.key || column.label || index}
                    align={column.align || 'left'}
                    sx={{
                      fontWeight: 600,
                      backgroundColor: 'grey.50',
                      color: 'text.secondary',
                      fontSize: '0.875rem',
                      minWidth: column.minWidth || 'auto',
                      ...(column.headerStyle || {})
                    }}
                  >
                    {column.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            {/* Table Body */}
            <TableBody>
              {rows.map((row, rowIndex) => (
                <TableRow
                  key={row.id || rowIndex}
                  sx={{
                    '&:nth-of-type(odd)': {
                      backgroundColor: 'action.hover',
                    },
                    '&:hover': {
                      backgroundColor: 'primary.light',
                      '& .MuiTableCell-root': {
                        color: 'primary.contrastText'
                      }
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  {showRowIndex && (
                    <TableCell
                      sx={{
                        fontWeight: 500,
                        color: 'text.secondary',
                        fontSize: '0.75rem'
                      }}
                    >
                      {rowIndex + 1}
                    </TableCell>
                  )}
                  {columns.map((column, colIndex) => {
                    const cellValue = row[column.key] || row[column.field] || '';
                    const isFirstColumn = colIndex === 0 && highlightFirstColumn;

                    return (
                      <TableCell
                        key={column.key || column.field || colIndex}
                        align={column.align || 'left'}
                        sx={{
                          fontSize: '0.875rem',
                          ...(isFirstColumn && {
                            fontWeight: 600,
                            color: 'primary.main'
                          }),
                          ...(column.cellStyle || {})
                        }}
                      >
                        {renderCellContent(cellValue, column)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Empty State */}
        {(!rows || rows.length === 0) && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              py: 4,
              color: 'text.secondary'
            }}
          >
            <Typography variant="body2" fontStyle="italic">
              No data available
            </Typography>
          </Box>
        )}

        {/* Row Count Footer */}
        {rows && rows.length > 0 && (
          <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              Showing {rows.length} {rows.length === 1 ? 'item' : 'items'}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TableWidget;