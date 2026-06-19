@echo off
echo ==========================================
echo   WinTranslator Build Script (Windows)
echo ==========================================
echo.

:: Set Chinese mirrors to avoid GitHub download timeouts
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/

:: Disable code signing (no certificate)
set CSC_IDENTITY_AUTO_DISCOVERY=false

:: Clean old build artifacts
echo [1/4] Cleaning old artifacts...
if exist "release" rmdir /s /q "release"
if exist "dist" rmdir /s /q "dist"
if exist "dist-electron" rmdir /s /q "dist-electron"
echo       Done.

:: Build frontend + main process
echo [2/4] Building with Vite...
call npx vite build
if errorlevel 1 (
    echo ERROR: Vite build failed!
    pause
    exit /b 1
)
echo       Done.

:: Package with electron-builder (NSIS installer + portable)
echo [3/4] Packaging with electron-builder...
call npx electron-builder --win nsis portable --x64
if errorlevel 1 (
    echo ERROR: electron-builder failed!
    pause
    exit /b 1
)
echo       Done.

:: Summary
echo.
echo ==========================================
echo   Build Complete!
echo ==========================================
echo.
echo Output files in release/ :
dir /b "release\*.exe" 2>nul
echo.
echo Done.
pause
