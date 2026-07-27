@echo off
title Digidex Server
cd /d "%~dp0"

echo ============================================
echo    DIGIDEX - Digimon Evolution Viewer
echo ============================================
echo.

REM --- Liberar el puerto 8000 si ya hay un servidor corriendo ---
echo Comprobando el puerto 8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 " ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo.
echo Iniciando servidor en http://localhost:8000
echo NOTA: "Starting httpd server..." significa que YA esta funcionando.
echo Deja esta ventana abierta. Cierrala para detener el servidor.
echo.

REM --- Abrir el navegador cuando el servidor este listo ---
start "" /b cmd /c "timeout /t 2 >nul & start http://localhost:8000/index.html"

REM --- Arrancar el servidor: intenta python y si no, py ---
where python >nul 2>&1
if %errorlevel%==0 (
    python server.py
) else (
    py server.py
)

echo.
echo El servidor se detuvo. Pulsa una tecla para cerrar.
pause >nul
