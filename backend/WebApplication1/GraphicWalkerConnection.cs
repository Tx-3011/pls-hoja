using System.Data;
using System.Data.Odbc;
using ClosedXML.Excel;
using WebApplication1.Models;

namespace WebApplication1.Data
{
    public class GraphicWalkerConnection
    {
        private readonly string _connectionString;
        private readonly ILogger<GraphicWalkerConnection> _logger;
        private static readonly List<GraphicWalker.Dashboard> _inmemoryDashboards = new();
        private static readonly List<GraphicWalker.Dataset> _inmemoryDatasets = new();

        public GraphicWalkerConnection(IConfiguration configuration, ILogger<GraphicWalkerConnection> logger)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection") ??
                throw new ArgumentNullException("DefaultConnection", "Connection string not found in configuration");
            _logger = logger;
        }

        #region Dashboard Operations
        public async Task<List<GraphicWalker.Dashboard>> GetDashboards()
        {
            var dashboards = new List<GraphicWalker.Dashboard>();
            
            try
            {
                using var connection = new OdbcConnection(_connectionString);
                await connection.OpenAsync();
                string query = "SELECT DashboardName, JsonFormat, IsMultiple, DatasetName FROM Dashboards";

                using var command = new OdbcCommand(query, connection);
                using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    dashboards.Add(new GraphicWalker.Dashboard
                    {
                        DashboardName = reader.GetString(0),
                        JsonFormat = reader.GetString(1),
                        IsMultiple = reader.GetBoolean(2),
                        DatasetName = reader.GetString(3)
                    });
                }
                _logger.LogInformation($"Retrieved {dashboards.Count} dashboards from database");
                return dashboards;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving dashboards from database. Using in-memory storage.");
                _logger.LogInformation($"Returning {_inmemoryDashboards.Count} dashboards from in-memory storage");
                return new List<GraphicWalker.Dashboard>(_inmemoryDashboards);
            }
        }

        public async Task SaveDashboard(GraphicWalker.Dashboard dashboard)
        {
            try
            {
                using var connection = new OdbcConnection(_connectionString);
                await connection.OpenAsync();

                // Check for existing dashboard
                string checkQuery = "SELECT COUNT(*) FROM Dashboards WHERE DashboardName = ?";
                using (var checkCommand = new OdbcCommand(checkQuery, connection))
                {
                    checkCommand.Parameters.Add("@DashboardName", OdbcType.NVarChar, 255).Value = dashboard.DashboardName;
                    int count = Convert.ToInt32(await checkCommand.ExecuteScalarAsync());
                    if (count > 0)
                    {
                        throw new Exception("Dashboard name already exists");
                    }
                }

                // Insert new dashboard
                string insertQuery = @"INSERT INTO Dashboards 
                             (DashboardName, JsonFormat, IsMultiple, DatasetName) 
                             VALUES (?, ?, ?, ?)";

                using var command = new OdbcCommand(insertQuery, connection);

                // Set parameters with explicit types and sizes
                var p1 = command.Parameters.Add("@DashboardName", OdbcType.NVarChar, 255);
                p1.Value = dashboard.DashboardName;

                var p2 = command.Parameters.Add("@JsonFormat", OdbcType.NVarChar);
                p2.Value = dashboard.JsonFormat ?? (object)DBNull.Value;

                var p3 = command.Parameters.Add("@IsMultiple", OdbcType.Bit);
                p3.Value = dashboard.IsMultiple;

                var p4 = command.Parameters.Add("@DatasetName", OdbcType.NVarChar, 50);
                p4.Value = dashboard.DatasetName ?? (object)DBNull.Value;

                await command.ExecuteNonQueryAsync();
                
                _logger.LogInformation($"Dashboard '{dashboard.DashboardName}' saved successfully to database");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving dashboard to database. Using in-memory storage.");
                
                // Check for existing dashboard in memory
                if (_inmemoryDashboards.Any(d => d.DashboardName == dashboard.DashboardName))
                {
                    throw new Exception("Dashboard name already exists");
                }
                
                // Save to in-memory storage
                _inmemoryDashboards.Add(dashboard);
                _logger.LogInformation($"Dashboard '{dashboard.DashboardName}' saved successfully to in-memory storage");
            }
        }

        public async Task<bool> DeleteDashboard(string dashboardName)
        {
            try
            {
                using var connection = new OdbcConnection(_connectionString);
                await connection.OpenAsync();

                // Check if dashboard exists
                string checkQuery = "SELECT COUNT(*) FROM Dashboards WHERE DashboardName = ?";
                using (var checkCommand = new OdbcCommand(checkQuery, connection))
                {
                    checkCommand.Parameters.Add("@DashboardName", OdbcType.NVarChar, 255).Value = dashboardName;
                    int count = Convert.ToInt32(await checkCommand.ExecuteScalarAsync());
                    if (count == 0)
                    {
                        return false; // Dashboard not found
                    }
                }

                // Delete dashboard
                string deleteQuery = "DELETE FROM Dashboards WHERE DashboardName = ?";
                using var command = new OdbcCommand(deleteQuery, connection);
                command.Parameters.Add("@DashboardName", OdbcType.NVarChar, 255).Value = dashboardName;
                
                int rowsAffected = await command.ExecuteNonQueryAsync();
                _logger.LogInformation($"Dashboard '{dashboardName}' deleted successfully from database");
                return rowsAffected > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting dashboard from database. Using in-memory storage.");
                
                // Delete from in-memory storage
                var dashboard = _inmemoryDashboards.FirstOrDefault(d => d.DashboardName == dashboardName);
                if (dashboard != null)
                {
                    _inmemoryDashboards.Remove(dashboard);
                    _logger.LogInformation($"Dashboard '{dashboardName}' deleted successfully from in-memory storage");
                    return true;
                }
                return false;
            }
        }

        #endregion

        #region Dataset Operations
        public async Task<List<GraphicWalker.Dataset>> GetDatasets()
        {
            var datasets = new List<GraphicWalker.Dataset>();
            using var connection = new OdbcConnection(_connectionString);

            try
            {
                await connection.OpenAsync();
                string query = "SELECT DatasetName, SP, Excelpath, IsItFromExcel FROM Dataset WHERE DatasetName IS NOT NULL";

                using var command = new OdbcCommand(query, connection);
                using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    string datasetName = !reader.IsDBNull(0) ? reader.GetString(0) : string.Empty;
                    if (!string.IsNullOrEmpty(datasetName))
                    {
                        datasets.Add(new GraphicWalker.Dataset
                        {
                            DatasetName = datasetName,
                            SP = !reader.IsDBNull(1) ? reader.GetString(1) : string.Empty,
                            ExcelPath = !reader.IsDBNull(2) ? reader.GetString(2) : string.Empty,
                            IsItFromExcel = !reader.IsDBNull(3) && reader.GetBoolean(3)
                        });
                    }
                }
                _logger.LogInformation($"Retrieved {datasets.Count} datasets");
                return datasets;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving datasets. Returning mock data and in-memory datasets.");
                
                // Return mock data when database is not available
                datasets.Add(new GraphicWalker.Dataset
                {
                    DatasetName = "Sample Dataset",
                    SP = "GetShipmentDetails",
                    ExcelPath = "C:\\Users\\iamte\\Desktop\\HackyThon\\What they gave\\backend\\WebApplication1\\uploads\\20250520163905_Bcu.xlsx",
                    IsItFromExcel = true
                });
                
                // Add any in-memory datasets
                datasets.AddRange(_inmemoryDatasets);
                
                _logger.LogInformation($"Returned {datasets.Count} datasets (mock + in-memory)");
                return datasets;
            }
        }

        public async Task SaveDataset(GraphicWalker.Dataset dataset)
        {
            try
            {
                using var connection = new OdbcConnection(_connectionString);
                await connection.OpenAsync();

                string checkQuery = "SELECT COUNT(*) FROM Dataset WHERE DatasetName = ?";
                using (var checkCommand = new OdbcCommand(checkQuery, connection))
                {
                    checkCommand.Parameters.Add("@DatasetName", OdbcType.VarChar).Value = dataset.DatasetName;
                    int existingCount = Convert.ToInt32(await checkCommand.ExecuteScalarAsync());

                    if (existingCount > 0)
                    {
                        throw new Exception("Dataset name already exists");
                    }
                }

                string insertQuery = @"INSERT INTO Dataset (DatasetName, SP, ExcelPath, IsItFromExcel) 
                                     VALUES (?, ?, ?, ?)";

                using var command = new OdbcCommand(insertQuery, connection);
                command.Parameters.Add("@DatasetName", OdbcType.VarChar).Value = dataset.DatasetName;
                command.Parameters.Add("@SP", OdbcType.VarChar).Value = dataset.IsItFromExcel ? DBNull.Value : dataset.SP;
                command.Parameters.Add("@ExcelPath", OdbcType.VarChar).Value = dataset.ExcelPath;
                command.Parameters.Add("@IsItFromExcel", OdbcType.Bit).Value = dataset.IsItFromExcel;

                await command.ExecuteNonQueryAsync();
                _logger.LogInformation($"Dataset {dataset.DatasetName} saved successfully to database");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving dataset to database. Using in-memory storage.");
                
                // Check for existing dataset in memory
                if (_inmemoryDatasets.Any(d => d.DatasetName == dataset.DatasetName))
                {
                    throw new Exception("Dataset name already exists");
                }
                
                // Save to in-memory storage
                _inmemoryDatasets.Add(dataset);
                _logger.LogInformation($"Dataset '{dataset.DatasetName}' saved successfully to in-memory storage");
            }
        }
        #endregion

        #region Analytics Operations
        public async Task<object> CalculateKPIs(string datasetName)
        {
            try
            {
                var dataset = await GetDatasetByName(datasetName);
                if (dataset == null)
                {
                    throw new Exception("Dataset not found");
                }

                List<Dictionary<string, object>> data;
                
                if (dataset.IsItFromExcel)
                {
                    data = ReadExcelData(dataset.ExcelPath);
                }
                else
                {
                    data = await ExecuteStoredProcedure(dataset.SP, new Dictionary<string, object>());
                }

                if (data == null || data.Count == 0)
                {
                    return new
                    {
                        totalRecords = 0,
                        totalValue = 0,
                        averageValue = 0,
                        uniqueCount = 0
                    };
                }

                // Calculate basic KPIs from the data
                var totalRecords = data.Count;
                var numericColumns = GetNumericColumns(data);
                
                double totalValue = 0;
                double averageValue = 0;
                int uniqueCount = 0;

                if (numericColumns.Any())
                {
                    var firstNumericColumn = numericColumns.First();
                    var values = data
                        .Select(row => Convert.ToDouble(row[firstNumericColumn] ?? 0))
                        .Where(val => val > 0)
                        .ToList();
                    
                    totalValue = values.Sum();
                    averageValue = values.Any() ? values.Average() : 0;
                }

                // Count unique values in first column
                if (data.Any())
                {
                    var firstColumn = data.First().Keys.First();
                    uniqueCount = data.Select(row => row[firstColumn]?.ToString()).Distinct().Count();
                }

                return new
                {
                    totalRecords,
                    totalValue = Math.Round(totalValue, 2),
                    averageValue = Math.Round(averageValue, 2),
                    uniqueCount,
                    datasetName,
                    lastUpdated = DateTime.Now
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error calculating KPIs for dataset {datasetName}");
                throw;
            }
        }

        public async Task<object> GetAnalyticsSummary(string datasetName)
        {
            try
            {
                var dataset = await GetDatasetByName(datasetName);
                if (dataset == null)
                {
                    throw new Exception("Dataset not found");
                }

                List<Dictionary<string, object>> data;
                
                if (dataset.IsItFromExcel)
                {
                    data = ReadExcelData(dataset.ExcelPath);
                }
                else
                {
                    data = await ExecuteStoredProcedure(dataset.SP, new Dictionary<string, object>());
                }

                if (data == null || data.Count == 0)
                {
                    return new { topItems = new List<object>(), recentItems = new List<object>() };
                }

                // Get top items by first numeric column
                var numericColumns = GetNumericColumns(data);
                var topItems = new List<object>();
                var recentItems = new List<object>();

                if (numericColumns.Any() && data.Any())
                {
                    var firstNumericColumn = numericColumns.First();
                    var firstTextColumn = data.First().Keys.FirstOrDefault(k => !numericColumns.Contains(k));

                    topItems = data
                        .Where(row => row[firstNumericColumn] != null && Convert.ToDouble(row[firstNumericColumn]) > 0)
                        .OrderByDescending(row => Convert.ToDouble(row[firstNumericColumn]))
                        .Take(6)
                        .Select((row, index) => new
                        {
                            id = index + 1,
                            name = row[firstTextColumn]?.ToString() ?? $"Item {index + 1}",
                            value = Math.Round(Convert.ToDouble(row[firstNumericColumn ?? ""] ?? 0), 2),
                            status = index < 4 // First 4 are "active"
                        })
                        .ToList<object>();

                    // Get recent items (last 5 records)
                    recentItems = data
                        .TakeLast(5)
                        .Select((row, index) => new
                        {
                            id = $"REC-{index + 1:D3}",
                            name = row[firstTextColumn]?.ToString() ?? $"Record {index + 1}",
                            value = numericColumns.Any() ? Math.Round(Convert.ToDouble(row[firstNumericColumn ?? ""] ?? 0), 2) : 0,
                            timestamp = DateTime.Now.AddHours(-index).ToString("HH:mm")
                        })
                        .ToList<object>();
                }

                return new { topItems, recentItems };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting analytics summary for dataset {datasetName}");
                throw;
            }
        }

        private async Task<GraphicWalker.Dataset?> GetDatasetByName(string datasetName)
        {
            var datasets = await GetDatasets();
            return datasets.FirstOrDefault(d => d.DatasetName == datasetName);
        }

        private List<string> GetNumericColumns(List<Dictionary<string, object>> data)
        {
            if (!data.Any()) return new List<string>();

            var numericColumns = new List<string>();
            var firstRow = data.First();

            foreach (var kvp in firstRow)
            {
                if (kvp.Value != null && (IsNumericType(kvp.Value) || double.TryParse(kvp.Value.ToString(), out _)))
                {
                    numericColumns.Add(kvp.Key);
                }
            }

            return numericColumns;
        }

        private bool IsNumericType(object value)
        {
            return value is int || value is long || value is float || value is double || value is decimal;
        }
        #endregion

        #region Excel Operations
        public List<Dictionary<string, object>> ReadExcelData(string excelPath)
        {
            var dataList = new List<Dictionary<string, object>>();

            try
            {
                if (!File.Exists(excelPath))
                {
                    _logger.LogWarning($"Excel file does not exist: {excelPath}");
                    return dataList;
                }

                using var workbook = new XLWorkbook(excelPath);
                var worksheet = workbook.Worksheet(1);
                var rowCount = worksheet.RowsUsed().Count();
                var columnCount = worksheet.ColumnsUsed().Count();

                _logger.LogInformation($"Processing Excel file: Rows={rowCount}, Columns={columnCount}");

                // Get headers from first row
                var headers = new List<string>();
                for (int col = 1; col <= columnCount; col++)
                {
                    headers.Add(worksheet.Cell(1, col).GetValue<string>());
                }

                // Read data rows
                for (int row = 2; row <= rowCount; row++)
                {
                    var rowData = new Dictionary<string, object>();

                    for (int col = 1; col <= columnCount; col++)
                    {
                        var cell = worksheet.Cell(row, col);
                        var header = headers[col - 1];

                        if (cell.IsEmpty())
                        {
                            rowData[header] = "";
                            continue;
                        }

                        var value = cell.Value;
                        switch (cell.DataType)
                        {
                            case XLDataType.Number:
                                rowData[header] = cell.GetValue<double>();
                                break;
                            case XLDataType.DateTime:
                                rowData[header] = cell.GetValue<DateTime>();
                                break;
                            case XLDataType.Boolean:
                                rowData[header] = cell.GetValue<bool>();
                                break;
                            default:
                                rowData[header] = cell.GetValue<string>();
                                break;
                        }
                    }

                    dataList.Add(rowData);
                }

                _logger.LogInformation($"Successfully read {dataList.Count} rows from Excel file");
                return dataList;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error reading Excel file: {excelPath}");
                throw;
            }
        }
        #endregion

        #region StoredProcedure Operations
        public async Task<List<Dictionary<string, object>>> ExecuteStoredProcedure(string storedProcedureName, Dictionary<string, object> parameters)
        {
            var dataList = new List<Dictionary<string, object>>();
            using var connection = new OdbcConnection(_connectionString);

            try
            {
                await connection.OpenAsync();
                using var command = new OdbcCommand(storedProcedureName, connection)
                {
                    CommandType = CommandType.StoredProcedure
                };

                foreach (var param in parameters)
                {
                    command.Parameters.AddWithValue(param.Key, param.Value ?? DBNull.Value);
                }

                using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var rowData = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        var columnName = reader.GetName(i);
                        rowData[columnName] = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                    }
                    dataList.Add(rowData);
                }

                _logger.LogInformation($"Stored procedure {storedProcedureName} executed successfully, returned {dataList.Count} rows");
                return dataList;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error executing stored procedure {storedProcedureName}");
                throw;
            }
        }
        #endregion
    }
}
