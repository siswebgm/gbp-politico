# Script PowerShell para build Docker com variáveis de ambiente injetadas
# Uso: .\build-with-env.ps1 [tag] [env-file]

param(
    [string]$Tag = "latest",
    [string]$EnvFile = ".env"
)

# Configurações
$ImageName = "gbp-politico"

Write-Host "🚀 GBP Político - Build Docker com Variáveis de Ambiente" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host "📦 Imagem: $ImageName`:$Tag" -ForegroundColor Cyan
Write-Host "📄 Arquivo env: $EnvFile" -ForegroundColor Cyan
Write-Host ""

# Verificar se o arquivo .env existe
if (-not (Test-Path $EnvFile)) {
    Write-Host "❌ Erro: Arquivo $EnvFile não encontrado!" -ForegroundColor Red
    Write-Host "💡 Certifique-se de que o arquivo de ambiente existe." -ForegroundColor Yellow
    exit 1
}

# Carregar variáveis do arquivo .env
Write-Host "📋 Carregando variáveis de ambiente de $EnvFile..." -ForegroundColor Yellow

$envVars = @{}
Get-Content $EnvFile | Where-Object { $_ -match "^[^#].*=" } | ForEach-Object {
    $key, $value = $_ -split "=", 2
    $envVars[$key.Trim()] = $value.Trim()
    [Environment]::SetEnvironmentVariable($key.Trim(), $value.Trim(), "Process")
}

# Verificar variáveis essenciais
Write-Host "🔍 Verificando variáveis essenciais..." -ForegroundColor Yellow
$requiredVars = @(
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY", 
    "VITE_STRIPE_PUBLIC_KEY"
)

foreach ($var in $requiredVars) {
    $value = [Environment]::GetEnvironmentVariable($var, "Process")
    if ([string]::IsNullOrEmpty($value)) {
        Write-Host "❌ Erro: Variável $var não está definida!" -ForegroundColor Red
        exit 1
    } else {
        $preview = if ($value.Length -gt 20) { $value.Substring(0, 20) + "..." } else { $value }
        Write-Host "✅ $var`: $preview" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "🔨 Iniciando build da imagem Docker..." -ForegroundColor Yellow

# Construir argumentos de build
$buildArgs = @()
foreach ($key in $envVars.Keys) {
    if ($key.StartsWith("VITE_")) {
        $buildArgs += "--build-arg"
        $buildArgs += "$key=$($envVars[$key])"
    }
}

# Executar docker build
$dockerArgs = @(
    "build"
) + $buildArgs + @(
    "-f", "Dockerfile.env"
    "-t", "$ImageName`:$Tag"
    "."
)

try {
    Write-Host "Executando: docker $($dockerArgs -join ' ')" -ForegroundColor Gray
    & docker @dockerArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Build concluído com sucesso!" -ForegroundColor Green
        Write-Host "🏷️  Imagem criada: $ImageName`:$Tag" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "🚀 Para executar a imagem:" -ForegroundColor Yellow
        Write-Host "   docker run -p 80:80 $ImageName`:$Tag" -ForegroundColor White
        Write-Host ""
        Write-Host "🔍 Para inspecionar a imagem:" -ForegroundColor Yellow
        Write-Host "   docker images $ImageName`:$Tag" -ForegroundColor White
        Write-Host ""
    } else {
        throw "Docker build falhou com código de saída $LASTEXITCODE"
    }
} catch {
    Write-Host "❌ Erro durante o build: $_" -ForegroundColor Red
    exit 1
}