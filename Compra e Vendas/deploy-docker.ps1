#Requires -Version 5.1
<#
  Script para buildar e publicar a imagem Docker no Docker Hub.

  Como usar:
  1. Crie uma conta em https://hub.docker.com
  2. Instale o Docker Desktop e faça login: docker login
  3. Defina seu nome de usuário e nome da imagem abaixo, ou passe por parâmetro:
      .\deploy-docker.ps1 -DockerHubUser "seuUsuario" -ImageName "marketplace" -Tag "1.0.0"
  4. O script faz build e push para docker.io/seuUsuario/marketplace:tag
#>

param (
    [Parameter(Mandatory = $false)]
    [string]$DockerHubUser = $env:DOCKER_HUB_USER,

    [Parameter(Mandatory = $false)]
    [string]$ImageName = $env:DOCKER_IMAGE_NAME,

    [Parameter(Mandatory = $false)]
    [string]$Tag = "latest"
)

if (-not $DockerHubUser) {
    $DockerHubUser = Read-Host "Digite seu usuário do Docker Hub"
}

if (-not $ImageName) {
    $ImageName = Read-Host "Digite o nome da imagem (ex: marketplace)"
}

$FullImageName = "$DockerHubUser/$ImageName`:$Tag"

Write-Host "Verificando login no Docker Hub..." -ForegroundColor Cyan
docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker não está rodando. Inicie o Docker Desktop e tente novamente."
    exit 1
}

Write-Host "Buildando imagem: $FullImageName" -ForegroundColor Cyan
docker build -t $ImageName`:$Tag -t $FullImageName .
if ($LASTEXITCODE -ne 0) {
    Write-Error "Falha no build da imagem."
    exit 1
}

Write-Host "Publicando imagem no Docker Hub..." -ForegroundColor Cyan
docker push $FullImageName
if ($LASTEXTICODE -ne 0) {
    Write-Error "Falha ao publicar a imagem. Verifique se você está logado (docker login)."
    exit 1
}

Write-Host "Imagem publicada com sucesso!" -ForegroundColor Green
Write-Host "URL no Docker Hub: https://hub.docker.com/r/$DockerHubUser/$ImageName" -ForegroundColor Green
