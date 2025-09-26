# GraphicWalker Dashboard Application

## Architecture Overview
This is a data visualization application with a .NET 8 Web API backend and React frontend using the GraphicWalker library for interactive chart creation.

### Key Components
- **Backend**: ASP.NET Core 8 API in `backend/WebApplication1/`
- **Frontend**: React 18 with Material-UI and GraphicWalker in `frontend/`
- **Data Sources**: Excel files + SQL Server database via ODBC
- **Visualization**: Kanaries GraphicWalker library for chart creation

## Backend Patterns (.NET)

### Database Architecture
- Uses **ODBC connection** with SQL Server (not Entity Framework)
- Connection string in `appsettings.json` with Trusted_Connection
- Graceful degradation: returns mock data when DB unavailable
- Stored procedures called via `CommandType.StoredProcedure`

### Key Service Pattern
```csharp
// GraphicWalkerConnection is the main data service
builder.Services.AddScoped<GraphicWalkerConnection>();
```

### Excel Processing
- Uses **ClosedXML** library (not EPPlus in main code)
- Files uploaded to `uploads/` with timestamp prefix: `yyyyMMddHHmmss_filename.xlsx`
- Dynamic field type detection: numbers become 'quantitative', others 'nominal'
- Handles null values by converting to empty strings

### API Routing Convention
- RESTful endpoints without `[Route("api/[controller]")]`
- Dashboard CRUD: `GET/POST /Dashboard`
- Dataset CRUD: `GET/POST /Dataset` 
- Excel operations: `/api/excel/read`
- Stored procedures: `/api/storedprocedure/execute`
- File upload: `/Dataset/Upload` (FormData with file + datasetName)

## Frontend Patterns (React)

### State Management
Uses single complex state object with nested properties:
```javascript
const [state, setState] = useState({
    dashboard: { items: [], loading: true, selected: null },
    datasets: { items: [], loading: true },
    gwData: null, // GraphicWalker data format
    activeTab: TABS.DESIGN
});
```

### GraphicWalker Integration
- Data must be in specific format: `{ fields: [...], dataSource: [...] }`
- Fields require: `fid`, `semanticType` ('quantitative'/'nominal'), `analyticType`
- Uses `useRef(gw)` to access GraphicWalker instance for export
- Chart configs exported as JSON arrays (single chart = array with 1 item)

### Material-UI Theme Pattern
- Custom theme with light/dark mode toggle
- Consistent card-based layout with elevation and hover effects
- Uses MUI icons extensively: `@mui/icons-material`

### API Communication
- Hardcoded localhost URLs: `http://localhost:5246`
- Axios with FormData for file uploads
- Error handling shows alert() for user feedback (not toast notifications)

## Development Workflow

### Backend Development
```bash
cd backend/WebApplication1
dotnet run  # Runs on port 5246
```

### Frontend Development  
```bash
cd frontend
npm start   # Runs on port 3000, proxies to :5246
```

### Key Dependencies
- Backend: ClosedXML, System.Data.Odbc, Microsoft.AspNet.WebApi
- Frontend: @kanaries/graphic-walker, @mui/material, axios, xlsx

## Data Flow Patterns

### Dataset Creation
1. User uploads Excel → `/Dataset/Upload` → saves to `uploads/` + DB entry
2. OR admin creates dataset pointing to stored procedure name
3. Dataset marked as `IsItFromExcel: true/false`

### Dashboard Creation
1. Load dataset → transforms to GraphicWalker format
2. User designs charts in GraphicWalker UI
3. Export via `gw.current.exportCode()` → saves JSON to database
4. Dashboard metadata includes `isMultiple` flag for chart arrays

### Chart Rendering
- Design mode: Full GraphicWalker editor
- View mode: GraphicRenderer with read-only charts
- Multiple charts rendered in MUI Grid layout

## Critical Configuration
- CORS configured for `http://localhost:3000` in Program.cs
- ODBC connection requires "ODBC Driver 17 for SQL Server"
- File uploads limited to .xlsx/.xls extensions
- Database tables: `Dashboards`, `Dataset` (note: singular, not Datasets)

## Error Handling Philosophy
- Backend: Try-catch with logging, return mock data on DB failures
- Frontend: Alert-based user notifications, graceful loading states
- No global error boundaries or centralized error handling