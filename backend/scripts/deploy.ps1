# Deploy on your Mark! Backend
# Usage: .\scripts\deploy.ps1 [-Stage dev|staging|prod] [-Profile aws-profile]

param(
    [Parameter()]
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Stage = 'dev',
    
    [Parameter()]
    [string]$Profile = 'default'
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  on your Mark! Backend Deployment" -ForegroundColor Cyan
Write-Host "  Stage: $Stage" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is not installed. Please install Node.js 18+"
    exit 1
}

$nodeVersion = node --version
Write-Host "  Node.js: $nodeVersion" -ForegroundColor Green

# Check AWS CLI
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Error "AWS CLI is not installed. Please install AWS CLI"
    exit 1
}
Write-Host "  AWS CLI: installed" -ForegroundColor Green

# Check CDK
if (-not (Get-Command cdk -ErrorAction SilentlyContinue)) {
    Write-Host "Installing AWS CDK..." -ForegroundColor Yellow
    npm install -g aws-cdk
}
Write-Host "  AWS CDK: installed" -ForegroundColor Green

Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host ""
Write-Host "Installing Lambda shared dependencies..." -ForegroundColor Yellow
Push-Location lambda/shared
npm install
Pop-Location

Write-Host ""
Write-Host "Building Lambda shared library..." -ForegroundColor Yellow
Push-Location lambda/shared
npm run build
Pop-Location

Write-Host ""
Write-Host "Synthesizing CDK stacks..." -ForegroundColor Yellow
npx cdk synth -c stage=$Stage

if ($LASTEXITCODE -ne 0) {
    Write-Error "CDK synthesis failed"
    exit 1
}

Write-Host ""
Write-Host "Deploying to AWS..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Gray

$deployArgs = @(
    "deploy",
    "--all",
    "--require-approval", "never",
    "-c", "stage=$Stage"
)

if ($Profile -ne 'default') {
    $deployArgs += "--profile"
    $deployArgs += $Profile
}

npx cdk @deployArgs

if ($LASTEXITCODE -ne 0) {
    Write-Error "Deployment failed"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Copy the stack outputs to your Flutter app configuration"
Write-Host "  2. Update the Amplify configuration in the app"
Write-Host "  3. Test the GraphQL API in the AWS Console"
Write-Host ""
