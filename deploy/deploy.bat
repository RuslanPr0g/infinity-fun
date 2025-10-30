@echo off
echo Starting Angular deployment...

ng deploy --base-href=/infinity-fun/
if %ERRORLEVEL% NEQ 0 (
    echo Deployment failed with exit code %ERRORLEVEL%.
    exit /b %ERRORLEVEL%
)

echo Deployment completed successfully.
