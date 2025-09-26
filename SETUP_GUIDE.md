# 🚀 GraphicWalker Dashboard - Setup Guide

## 📋 What's Excluded from Git (Won't be pushed)

### 🗄️ **Large Database Files**
- `PyGWalkerDB` - Your local database file
- Any `.db`, `.sqlite`, `.mdb` files
- Database backup files (`.bak`)

### 🏗️ **.NET Backend Build Files** 
- `backend/WebApplication1/bin/` - Compiled assemblies
- `backend/WebApplication1/obj/` - Build intermediate files
- `backend/WebApplication1/.vs/` - Visual Studio files
- Debug/Release folders
- User-specific project files (`.user`, `.suo`)

### 📁 **Uploaded Files**
- `backend/WebApplication1/uploads/` - User uploaded Excel files
- All `.xlsx`, `.xls`, `.csv` files

### ⚛️ **Frontend Dependencies**
- `frontend/node_modules/` - NPM packages (very large!)
- `frontend/build/` - Production build files
- Package lock files
- Coverage reports

### 🖥️ **System & IDE Files**
- `.DS_Store` (Mac), `Thumbs.db` (Windows)
- `.vscode/`, `.idea/` - IDE configuration
- Log files, temp files

---

## 🔧 What You Need to Download/Install on Your Other Laptop

### 📥 **Required Software**
1. **Node.js** (v14 or higher)
   - Download from: https://nodejs.org/
   - Includes NPM package manager

2. **.NET 8 SDK**
   - Download from: https://dotnet.microsoft.com/download/dotnet/8.0
   - For running the backend API

3. **Git** (if not already installed)
   - Download from: https://git-scm.com/

### 🔧 **Setup Steps on New Laptop**

#### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd "What they gave"
```

#### 2. Setup Frontend
```bash
cd frontend
npm install          # Downloads all packages to node_modules/
```

#### 3. Setup Backend
```bash
cd backend/WebApplication1
dotnet restore       # Downloads NuGet packages
dotnet build         # Compiles the application
```

#### 4. Create Required Directories
```bash
# Backend uploads directory (for Excel files)
mkdir -p backend/WebApplication1/uploads
```

### 📊 **Database Setup**
- The app works **without a database** (uses in-memory storage)
- If you want the full database functionality:
  - Install SQL Server or SQL Server Express
  - Update connection string in `appsettings.json`
  - Run any database migration scripts

### 📝 **Configuration Files You'll Need**
- `backend/WebApplication1/appsettings.json` ✅ (included)
- `backend/WebApplication1/appsettings.Development.json` ✅ (included)
- `frontend/package.json` ✅ (included)

---

## 🎯 **Quick Start Commands**

### Start Backend (Terminal 1)
```bash
cd backend/WebApplication1
dotnet run
# Server runs on: http://localhost:5246
```

### Start Frontend (Terminal 2)  
```bash
cd frontend
npm start
# App opens on: http://localhost:3000
```

---

## 💾 **File Sizes Saved**

By excluding these files, you're saving approximately:
- **node_modules/**: ~200-500MB (varies by dependencies)
- **bin/obj folders**: ~50-100MB
- **PyGWalkerDB**: Size varies (could be very large)
- **uploads/**: Depends on uploaded Excel files
- **build/**: ~10-50MB

**Total savings: Potentially 500MB-1GB+ per repository!**

---

## ⚠️ **Important Notes**

1. **First time setup** on new laptop will take longer due to package downloads
2. **Internet connection required** for initial `npm install` and `dotnet restore`
3. **Development files** are excluded - production builds may need different configurations
4. **Database is optional** - app gracefully falls back to in-memory storage
5. **Uploaded Excel files** won't transfer - you'll need to re-upload test files

---

## 🤝 **Team Development**

When multiple developers work on this:
- Everyone needs to run `npm install` after pulling changes
- Backend packages auto-restore on build
- Share database connection strings securely (not in git)
- Test files and uploads are local to each developer