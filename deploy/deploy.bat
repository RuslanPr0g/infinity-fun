@echo off
echo Starting Angular deployment...

echo Minifying group JSON files...

node minify-json.js
if %ERRORLEVEL% NEQ 0 (
    echo JSON minification failed with exit code %ERRORLEVEL%.
    exit /b %ERRORLEVEL%
)

echo JSON minification completed.

ng deploy --base-href=/infinity-fun/
if %ERRORLEVEL% NEQ 0 (
    echo Deployment failed with exit code %ERRORLEVEL%.
    exit /b %ERRORLEVEL%
)

echo Deployment completed successfully.
