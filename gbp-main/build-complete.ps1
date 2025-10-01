# Script completo para build com variáveis de ambiente
# Uso: .\build-complete.ps1 [tag]

param(
    [string]$Tag = "latest"
)

$ImageName = "siswebgm/gbp-politico"

Write-Host "🚀 GBP Político - Build Completo com Variáveis" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host "📦 Imagem: $ImageName`:$Tag" -ForegroundColor Cyan
Write-Host ""

try {
    # Passo 1: Verificar arquivo .env
    Write-Host "📋 Verificando arquivo .env..." -ForegroundColor Yellow
    if (-not (Test-Path ".env")) {
        throw "Arquivo .env não encontrado!"
    }
    Write-Host "✅ Arquivo .env encontrado" -ForegroundColor Green

    # Passo 2: Carregar variáveis de ambiente
    Write-Host "`n🔧 Carregando variáveis de ambiente..." -ForegroundColor Yellow
    Get-Content .env | Where-Object { $_ -match "^[^#].*=" } | ForEach-Object {
        $key, $value = $_ -split "=", 2
        [Environment]::SetEnvironmentVariable($key.Trim(), $value.Trim(), "Process")
    }
    
    # Verificar variáveis essenciais
    $supabaseUrl = [Environment]::GetEnvironmentVariable("VITE_SUPABASE_URL", "Process")
    if ([string]::IsNullOrEmpty($supabaseUrl)) {
        throw "VITE_SUPABASE_URL não encontrada!"
    }
    Write-Host "✅ Variáveis carregadas - Supabase: $($supabaseUrl.Substring(0, 30))..." -ForegroundColor Green

    # Passo 3: Limpar build anterior
    Write-Host "`n🧹 Limpando build anterior..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force node_modules/.vite -ErrorAction SilentlyContinue
    Write-Host "✅ Build anterior limpo" -ForegroundColor Green

    # Passo 4: Build da aplicação
    Write-Host "`n🔨 Fazendo build da aplicação..." -ForegroundColor Yellow
    $buildResult = & npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Falha no build da aplicação"
    }
    Write-Host "✅ Build da aplicação concluído" -ForegroundColor Green

    # Passo 5: Verificar se as variáveis foram injetadas
    Write-Host "`n🔍 Verificando injeção de variáveis..." -ForegroundColor Yellow
    $utilsFile = Get-ChildItem -Path "dist/js" -Name "utils-*.js" | Select-Object -First 1
    if ($utilsFile) {
        $utilsContent = Get-Content "dist/js/$utilsFile" -Raw
        if ($utilsContent -match "studio\.gbppolitico\.com") {
            Write-Host "✅ Variáveis injetadas corretamente no build" -ForegroundColor Green
        } else {
            throw "Variáveis não foram injetadas no build!"
        }
    } else {
        Write-Host "⚠️  Arquivo utils não encontrado, mas continuando..." -ForegroundColor Yellow
    }

    # Passo 6: Build da imagem Docker
    Write-Host "`n🐳 Construindo imagem Docker..." -ForegroundColor Yellow
    & docker build -f Dockerfile.simple-build -t "gbp-politico:$Tag" .
    if ($LASTEXITCODE -ne 0) {
        throw "Falha no build da imagem Docker"
    }
    Write-Host "✅ Imagem Docker criada" -ForegroundColor Green

    # Passo 7: Tag para Docker Hub
    Write-Host "`n🏷️  Criando tags..." -ForegroundColor Yellow
    & docker tag "gbp-politico:$Tag" "$ImageName`:$Tag"
    if ($Tag -ne "latest") {
        & docker tag "gbp-politico:$Tag" "$ImageName`:latest"
        Write-Host "✅ Tags criadas: $ImageName`:$Tag e $ImageName`:latest" -ForegroundColor Green
    } else {
        Write-Host "✅ Tag criada: $ImageName`:$Tag" -ForegroundColor Green
    }

    # Passo 8: Teste rápido
    Write-Host "`n🧪 Testando imagem..." -ForegroundColor Yellow
    $testContainer = "gbp-test-$(Get-Random)"
    & docker run -d --name $testContainer -p 8084:80 "$ImageName`:$Tag" | Out-Null
    Start-Sleep -Seconds 3
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8084" -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Teste passou - aplicação respondendo" -ForegroundColor Green
        } else {
            throw "Aplicação não respondeu corretamente"
        }
    } finally {
        & docker stop $testContainer | Out-Null
        & docker rm $testContainer | Out-Null
    }

    # Resumo final
    Write-Host "`n🎉 Build concluído com sucesso!" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
    Write-Host "📦 Imagem: $ImageName`:$Tag" -ForegroundColor Cyan
    Write-Host "🔧 Variáveis: Injetadas no build" -ForegroundColor Cyan
    Write-Host "🚫 Firebase: Desabilitado" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🚀 Para fazer push:" -ForegroundColor Yellow
    Write-Host "   docker push $ImageName`:$Tag" -ForegroundColor White
    Write-Host ""
    Write-Host "🔄 Para atualizar no Portainer:" -ForegroundColor Yellow
    Write-Host "   Use a imagem: $ImageName`:$Tag" -ForegroundColor White
    Write-Host ""

} catch {
    Write-Host "`n❌ Erro: $_" -ForegroundColor Red
    exit 1
}