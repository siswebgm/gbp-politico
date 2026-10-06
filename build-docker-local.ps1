# Script para build local da imagem Docker (sem push)
# Uso: .\build-docker-local.ps1 [versão]
# Exemplo: .\build-docker-local.ps1 2.9.42

param(
    [Parameter(Mandatory=$false)]
    [string]$VERSION = "latest"
)

$ErrorActionPreference = "Stop"

# Configurações
$IMAGE_NAME = "siswebgm/gbp-politico"
$FULL_IMAGE_NAME = "${IMAGE_NAME}:${VERSION}"
$PROJECT_DIR = "C:\Users\jmend\sistema-vereador\gbp-main"
$DOCKERFILE = "Dockerfile"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Build Local Docker GBP Politico" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está no diretório correto
if (-not (Test-Path $PROJECT_DIR)) {
    Write-Host "Erro: Diretório do projeto não encontrado: $PROJECT_DIR" -ForegroundColor Red
    exit 1
}

# Mudar para o diretório do projeto
Set-Location $PROJECT_DIR
Write-Host "Diretório: $PROJECT_DIR" -ForegroundColor Green
Write-Host "Versão: $VERSION" -ForegroundColor Green
Write-Host "Imagem: $FULL_IMAGE_NAME" -ForegroundColor Green
Write-Host ""

# Gerar versão
Write-Host "Gerando versão..." -ForegroundColor Yellow
node scripts/generate-version.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro ao gerar versão!" -ForegroundColor Red
    exit 1
}
Write-Host "Versão gerada com sucesso!" -ForegroundColor Green
Write-Host ""

# Build da imagem
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Construindo imagem Docker..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
docker build -t $FULL_IMAGE_NAME -f $DOCKERFILE .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro no build da imagem!" -ForegroundColor Red
    exit 1
}

Write-Host "Build concluído com sucesso!" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Processo concluído com sucesso!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Imagem disponível localmente: $FULL_IMAGE_NAME" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para rodar: docker run -d -p 3000:80 --name gbp-test $FULL_IMAGE_NAME" -ForegroundColor Yellow
Write-Host ""
