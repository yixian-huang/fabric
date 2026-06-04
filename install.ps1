#Requires -Version 5.1
# Fabric 全栈一键安装（Windows + Docker Desktop）
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Write-Info($msg) { Write-Host "[fabric] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[fabric] $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "[fabric] $msg" -ForegroundColor Red }

function New-RandomSecret {
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return ([BitConverter]::ToString($bytes) -replace '-', '').ToLower()
}

function Ensure-Env {
    if (-not (Test-Path ".env")) {
        Write-Info "创建 .env（来自 .env.example）"
        Copy-Item ".env.example" ".env"
    }

    $envContent = Get-Content ".env" -Raw
    $vars = @{}
    foreach ($line in (Get-Content ".env")) {
        if ($line -match '^\s*#' -or $line -notmatch '=') { continue }
        $parts = $line -split '=', 2
        $vars[$parts[0].Trim()] = $parts[1].Trim()
    }

    $changed = $false
    if (-not $vars['POSTGRES_PASSWORD'] -or $vars['POSTGRES_PASSWORD'] -eq 'change-me-postgres') {
        $vars['POSTGRES_PASSWORD'] = New-RandomSecret
        $changed = $true
    }
    if (-not $vars['MINIO_ROOT_PASSWORD'] -or $vars['MINIO_ROOT_PASSWORD'] -eq 'change-me-minio') {
        $vars['MINIO_ROOT_PASSWORD'] = New-RandomSecret
        $changed = $true
    }
    if (-not $vars['JWT_SECRET'] -or $vars['JWT_SECRET'] -eq 'change-me-jwt-secret') {
        $vars['JWT_SECRET'] = New-RandomSecret
        $changed = $true
    }

    if ($changed) {
        Write-Info "已自动生成随机密钥，写入 .env"
        $httpPort = if ($vars.ContainsKey('HTTP_PORT') -and $vars['HTTP_PORT']) { $vars['HTTP_PORT'] } else { '8088' }
        $pgDb = if ($vars.ContainsKey('POSTGRES_DB') -and $vars['POSTGRES_DB']) { $vars['POSTGRES_DB'] } else { 'fabric' }
        $pgUser = if ($vars.ContainsKey('POSTGRES_USER') -and $vars['POSTGRES_USER']) { $vars['POSTGRES_USER'] } else { 'fabric' }
        $minioUser = if ($vars.ContainsKey('MINIO_ROOT_USER') -and $vars['MINIO_ROOT_USER']) { $vars['MINIO_ROOT_USER'] } else { 'fabric' }
        $minioBucket = if ($vars.ContainsKey('MINIO_BUCKET') -and $vars['MINIO_BUCKET']) { $vars['MINIO_BUCKET'] } else { 'fabric' }
        @"
HTTP_PORT=$httpPort
POSTGRES_DB=$pgDb
POSTGRES_USER=$pgUser
POSTGRES_PASSWORD=$($vars['POSTGRES_PASSWORD'])
MINIO_ROOT_USER=$minioUser
MINIO_ROOT_PASSWORD=$($vars['MINIO_ROOT_PASSWORD'])
MINIO_BUCKET=$minioBucket
JWT_SECRET=$($vars['JWT_SECRET'])
"@ | Set-Content ".env" -Encoding UTF8
    }
}

function Get-ComposeCmd {
    docker compose version 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { return @("docker", "compose") }
    if (Get-Command docker-compose -ErrorAction SilentlyContinue) { return @("docker-compose") }
    throw "需要 Docker Compose v2（docker compose）"
}

function Wait-ForApi($port) {
    Write-Info "等待 API 就绪..."
    for ($i = 0; $i -lt 60; $i++) {
        try {
            Invoke-WebRequest -Uri "http://127.0.0.1:$port/healthz" -UseBasicParsing -TimeoutSec 3 | Out-Null
            return
        } catch {
            Start-Sleep -Seconds 2
        }
    }
    Write-Warn "健康检查超时，请查看 docker compose logs api gateway"
}

# --- main ---
try {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw "未找到 Docker，请先安装 Docker Desktop"
    }
    docker info 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Docker 未运行，请启动 Docker Desktop" }

    Ensure-Env
    $envVars = @{}
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
        $p = $_ -split '=', 2
        $envVars[$p[0].Trim()] = $p[1].Trim()
    }
    $port = if ($envVars['HTTP_PORT']) { $envVars['HTTP_PORT'] } else { '8088' }

    $compose = Get-ComposeCmd
    Write-Info "构建并启动服务..."
    & $compose[0] $compose[1..($compose.Length-1)] up -d --build
    if ($LASTEXITCODE -ne 0) { throw "docker compose up 失败" }

    Wait-ForApi $port

    Write-Host ""
    Write-Info "部署完成"
    Write-Host "  管理端:  http://127.0.0.1:$port/"
    Write-Host "  表格端:  http://127.0.0.1:$port/grid/"
    Write-Host "  健康检查: http://127.0.0.1:$port/healthz"
    Write-Host ""
    Write-Host "  首次使用请在 Web 端注册账号。"
}
catch {
    Write-Err $_.Exception.Message
    exit 1
}
