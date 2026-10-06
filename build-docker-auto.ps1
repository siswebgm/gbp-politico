# Script automatizado para build e push da imagem Docker
# Uso: .\build-docker-auto.ps1 [versão]
# Exemplo: .\build-docker-auto.ps1 2.9.42

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
Write-Host "Build Automatizado Docker GBP Politico" -ForegroundColor Cyan
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

# Verificar se há mudanças no git
Write-Host "Verificando mudanças no git..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "AVISO: Há mudanças não commitadas:" -ForegroundColor Yellow
    Write-Host $gitStatus
    Write-Host ""
    $response = Read-Host "Deseja commitar as mudanças antes do build? (s/n)"
    if ($response -eq "s" -or $response -eq "S") {
        $commitMessage = Read-Host "Digite a mensagem do commit"
        git add .
        git commit -m $commitMessage
        Write-Host "Mudanças commitadas!" -ForegroundColor Green
        Write-Host ""
    }
} else {
    Write-Host "Nenhuma mudança não commitada." -ForegroundColor Green
    Write-Host ""
}

# Gerar versão
Write-Host "Gerando versão..." -ForegroundColor Yellow
npm run generate-version
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

# Push da imagem
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fazendo push da imagem para o Docker Hub..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
docker push $FULL_IMAGE_NAME

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro ao fazer push da imagem!" -ForegroundColor Red
    Write-Host "Certifique-se de estar logado no Docker Hub: docker login" -ForegroundColor Yellow
    exit 1
}

Write-Host "Push concluído com sucesso!" -ForegroundColor Green
Write-Host ""

# Tag como latest se não for latest
if ($VERSION -ne "latest") {
    Write-Host "Tagueando como latest..." -ForegroundColor Yellow
    docker tag $FULL_IMAGE_NAME ${IMAGE_NAME}:latest
    docker push ${IMAGE_NAME}:latest
    Write-Host "Tag latest atualizada!" -ForegroundColor Green
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Processo concluído com sucesso!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Imagem disponível: $FULL_IMAGE_NAME" -ForegroundColor Cyan
Write-Host ""
