@echo off
echo ==========================================
echo        CivicFix Clean Setup
echo ==========================================
echo.

REM Kill all Node processes
taskkill /f /im node.exe 2>nul
echo ✅ Stopped all Node processes

REM Clean up
echo Cleaning up old files...
del package-lock.json 2>nul
rmdir /s /q node_modules 2>nul
del vite.config.js 2>nul
del tailwind.config.js 2>nul
del postcss.config.js 2>nul

echo Creating fresh package.json...
echo {
echo   "name": "civicfix-frontend",
echo   "private": true,
echo   "version": "0.0.0",
echo   "type": "module",
echo   "scripts": {
echo     "dev": "vite",
echo     "build": "vite build",
echo     "preview": "vite preview"
echo   },
echo   "dependencies": {
echo     "react": "^18.2.0",
echo     "react-dom": "^18.2.0",
echo     "react-router-dom": "^6.20.0",
echo     "axios": "^1.6.0"
echo   },
echo   "devDependencies": {
echo     "@vitejs/plugin-react": "^4.0.0",
echo     "vite": "^5.0.0"
echo   }
echo } > package.json

echo Creating vite.config.js...
echo import { defineConfig } from 'vite' > vite.config.js
echo import react from '@vitejs/plugin-react' >> vite.config.js
echo. >> vite.config.js
echo export default defineConfig({ >> vite.config.js
echo   plugins: [react()], >> vite.config.js
echo   server: { >> vite.config.js
echo     port: 3000, >> vite.config.js
echo     open: true >> vite.config.js
echo   } >> vite.config.js
echo }) >> vite.config.js

echo Ensuring src folder structure...
if not exist "src" mkdir "src"
if not exist "src\components" mkdir "src\components"
if not exist "src\pages" mkdir "src\pages"

echo Creating main.jsx...
echo import React from 'react' > src\main.jsx
echo import ReactDOM from 'react-dom/client' >> src\main.jsx
echo import App from './App.jsx' >> src\main.jsx
echo. >> src\main.jsx
echo ReactDOM.createRoot(document.getElementById('root')).render( >> src\main.jsx
echo   ^<React.StrictMode^> >> src\main.jsx
echo     ^<App /^> >> src\main.jsx
echo   ^</React.StrictMode^>, >> src\main.jsx
echo ) >> src\main.jsx

echo Creating App.jsx...
echo function App() { > src\App.jsx
echo   return ( >> src\App.jsx
echo     ^<div style={{ padding: '50px', textAlign: 'center', background: 'linear-gradient(to right, #2563eb, #1d4ed8)', color: 'white', minHeight: '100vh' }}^> >> src\App.jsx
echo       ^<h1 style={{ fontSize: '3rem', marginBottom: '20px' }}^>🚀 CivicFix Frontend^</h1^> >> src\App.jsx
echo       ^<p style={{ fontSize: '1.2rem', marginBottom: '30px' }}^>Clean setup complete!^</p^> >> src\App.jsx
echo       ^<div style={{ background: 'white', color: '#2563eb', padding: '20px', borderRadius: '10px', display: 'inline-block' }}^> >> src\App.jsx
echo         ^<p^>Run: npm install^</p^> >> src\App.jsx
echo         ^<p^>Then: npm run dev^</p^> >> src\App.jsx
echo       ^</div^> >> src\App.jsx
echo     ^</div^> >> src\App.jsx
echo   ); >> src\App.jsx
echo } >> src\App.jsx

echo.
echo ==========================================
echo        Installation Instructions
echo ==========================================
echo.
echo 1. Run: npm install
echo 2. Run: npm run dev
echo 3. Open: http://localhost:3000
echo.
echo ==========================================
pause