# Script completo para build e deploy do GBP Político
# Uso: .\build-and-deploy.ps1 [tag] [push]

param(
    [string]$Tag = "latest",
    [switch]$Push = $false
)

$ImageName = "siswebgm/gbp-politico"
$LocalImageName = "gbp-politico"

Write-Host "🚀 GBP Político - Build e Deploy Completo" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host "📦 Imagem: $ImageName`:$Tag" -ForegroundColor Cyan
Write-Host "🔄 Push: $($Push ? 'Sim' : 'Não')" -ForegroundColor Cyan
Write-Host ""

try {
    # Passo 1: Verificar arquivos necessários
    Write-Host "📋 Verificando arquivos necessários..." -ForegroundColor Yellow
    
    $requiredFiles = @(".env", "package.json", "Dockerfile.simple-build", "nginx.conf")
    foreach ($file in $requiredFiles) {
        if (-not (Test-Path $file)) {
            throw "Arquivo necessário não encontrado: $file"
        }
        Write-Host "✅ $file" -ForegroundColor Green
    }

    # Passo 2: Carregar variáveis de ambiente
    Write-Host "`n🔧 Carregando variáveis de ambiente..." -ForegroundColor Yellow
    Get-Content .env | Where-Object { $_ -match "^[^#].*=" } | ForEach-Object {
        $key, $value = $_ -split "=", 2
        [Environment]::SetEnvironmentVariable($key.Trim(), $value.Trim(), "Process")
    }
    Write-Host "✅ Variáveis carregadas" -ForegroundColor Green

    # Passo 3: Build local do projeto
    Write-Host "`n🔨 Fazendo build local do projeto..." -ForegroundColor Yellow
    $buildResult = & npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Falha no build local do projeto"
    }
    Write-Host "✅ Build local concluído" -ForegroundColor Green

    # Passo 4: Verificar se a pasta dist foi criada
    if (-not (Test-Path "dist")) {
        throw "Pasta 'dist' não foi criada pelo build"
    }
    Write-Host "✅ Pasta dist verificada" -ForegroundColor Green

    # Passo 5: Build da imagem Docker
    Write-Host "`n🐳 Construindo imagem Docker..." -ForegroundColor Yellow
    & docker build -f Dockerfile.simple-build -t "$LocalImageName`:$Tag" .
    if ($LASTEXITCODE -ne 0) {
        throw "Falha no build da imagem Docker"
    }
    Write-Host "✅ Imagem Docker criada: $LocalImageName`:$Tag" -ForegroundColor Green

    # Passo 6: Tag para Docker Hub
    Write-Host "`n🏷️  Criando tags para Docker Hub..." -ForegroundColor Yellow
    & docker tag "$LocalImageName`:$Tag" "$ImageName`:$Tag"
    if ($Tag -ne "latest") {
        & docker tag "$LocalImageName`:$Tag" "$ImageName`:latest"
        Write-Host "✅ Tags criadas: $ImageName`:$Tag e $ImageName`:latest" -ForegroundColor Green
    } else {
        Write-Host "✅ Tag criada: $ImageName`:$Tag" -ForegroundColor Green
    }

    # Passo 7: Teste local da imagem
    Write-Host "`n🧪 Testando imagem localmente..." -ForegroundColor Yellow
    $testPort = 8081
    $containerName = "gbp-politico-test-$(Get-Random)"
    
    & docker run -d --name $containerName -p "$testPort`:80" "$ImageName`:$Tag" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao executar container de teste"
    }

    Start-Sleep -Seconds 3
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$testPort" -TimeoutSec 10 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Teste local passou - aplicação respondendo na porta $testPort" -ForegroundColor Green
        } else {
            throw "Aplicação não está respondendo corretamente"
        }
    } catch {
        throw "Falha no teste local: $_"
    } finally {
        & docker stop $containerName | Out-Null
        & docker rm $containerName | Out-Null
    }

    # Passo 8: Push para Docker Hub (se solicitado)
    if ($Push) {
        Write-Host "`n📤 Fazendo push para Docker Hub..." -ForegroundColor Yellow
        
        & docker push "$ImageName`:$Tag"
        if ($LASTEXITCODE -ne 0) {
            throw "Falha no push da tag $Tag"
        }
        Write-Host "✅ Push concluído: $ImageName`:$Tag" -ForegroundColor Green

        if ($Tag -ne "latest") {
            & docker push "$ImageName`:latest"
            if ($LASTEXITCODE -ne 0) {
                throw "Falha no push da tag latest"
            }
            Write-Host "✅ Push concluído: $ImageName`:latest" -ForegroundColor Green
        }
    }

    # Resumo final
    Write-Host "`n🎉 Deploy concluído com sucesso!" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
    Write-Host "📦 Imagem criada: $ImageName`:$Tag" -ForegroundColor Cyan
    Write-Host "📏 Tamanho: $(docker images $ImageName`:$Tag --format 'table {{.Size}}' | Select-Object -Skip 1)" -ForegroundColor Cyan
    
    if ($Push) {
        Write-Host "🌐 Disponível no Docker Hub: https://hub.docker.com/r/$($ImageName.Replace('/', '/r/'))" -ForegroundColor Cyan
    }
    
    Write-Host "`n🚀 Para executar a imagem:" -ForegroundColor Yellow
    Write-Host "   docker run -p 80:80 $ImageName`:$Tag" -ForegroundColor White
    Write-Host "`n🔍 Para inspecionar a imagem:" -ForegroundColor Yellow
    Write-Host "   docker images $ImageName`:$Tag" -ForegroundColor White
    Write-Host ""

} catch {
    Write-Host "`n❌ Erro durante o processo: $_" -ForegroundColor Red
    exit 1
}