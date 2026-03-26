@echo off
setlocal
set "NODE20=E:\prdapp\tools\node20\node.exe"

if not exist "%NODE20%" (
  echo Portable Node 20 was not found at %NODE20%
  exit /b 1
)

cd /d "%~dp0"
"%NODE20%" ".\node_modules\hardhat\internal\cli\bootstrap.js" test
