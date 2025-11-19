# Script para build e push da imagem Docker com variáveis de ambiente
# Tag: 2.3

Write-Host "Iniciando build da imagem Docker GBP Politico v2.3..." -ForegroundColor Cyan

# Carregar variáveis do arquivo .env
if (Test-Path .env) {
    Write-Host "Carregando variaveis do arquivo .env..." -ForegroundColor Yellow
    Get-Content .env | ForEach-Object {
        if ($_ -match "^([^#][^=]+)=(.*)$") {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
            Write-Host "  OK $name carregado" -ForegroundColor Green
        }
    }
} else {
    Write-Host "Erro: Arquivo .env nao encontrado!" -ForegroundColor Red
    exit 1
}

# Configurações
$IMAGE_NAME = "siswebgm/gbp-politico"
$TAG = "2.4"
$FULL_IMAGE_NAME = "${IMAGE_NAME}:${TAG}"

Write-Host "`nConstruindo imagem Docker..." -ForegroundColor Cyan
Write-Host "   Imagem: $FULL_IMAGE_NAME" -ForegroundColor White

# Build da imagem passando todas as variáveis como build args
docker build `
  --build-arg VITE_SUPABASE_URL="$env:VITE_SUPABASE_URL" `
  --build-arg VITE_SUPABASE_API_URL="$env:VITE_SUPABASE_API_URL" `
  --build-arg VITE_SUPABASE_AUTH_URL="$env:VITE_SUPABASE_AUTH_URL" `
  --build-arg VITE_SUPABASE_ANON_KEY="$env:VITE_SUPABASE_ANON_KEY" `
  --build-arg VITE_SERPRO_CPF_API_KEY="$env:VITE_SERPRO_CPF_API_KEY" `
  --build-arg VITE_SERPRO_CPF_API_URL="$env:VITE_SERPRO_CPF_API_URL" `
  --build-arg VITE_MINIO_ENDPOINT="$env:VITE_MINIO_ENDPOINT" `
  --build-arg VITE_MINIO_ACCESS_KEY="$env:VITE_MINIO_ACCESS_KEY" `
  --build-arg VITE_MINIO_SECRET_KEY="$env:VITE_MINIO_SECRET_KEY" `
  --build-arg VITE_MINIO_BUCKET="$env:VITE_MINIO_BUCKET" `
  --build-arg VITE_ASAAS_API_KEY="$env:VITE_ASAAS_API_KEY" `
  --build-arg VITE_ASAAS_ENV="$env:VITE_ASAAS_ENV" `
  --build-arg VITE_ASAAS_WEBHOOK_SECRET="$env:VITE_ASAAS_WEBHOOK_SECRET" `
  --build-arg VITE_APP_URL="$env:VITE_APP_URL" `
  --build-arg VITE_STRIPE_PUBLIC_KEY="$env:VITE_STRIPE_PUBLIC_KEY" `
  -f Dockerfile.env `
  -t $FULL_IMAGE_NAME `
  .

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nErro no build da imagem!" -ForegroundColor Red
    exit 1
}

Write-Host "`nBuild concluido com sucesso!" -ForegroundColor Green

# Push da imagem para o Docker Hub
Write-Host "`nFazendo push da imagem para o Docker Hub..." -ForegroundColor Cyan
docker push $FULL_IMAGE_NAME

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nErro ao fazer push da imagem!" -ForegroundColor Red
    Write-Host "   Certifique-se de estar logado no Docker Hub: docker login" -ForegroundColor Yellow
    exit 1
}

Write-Host "`nImagem enviada com sucesso!" -ForegroundColor Green
Write-Host "`nImagem disponivel em: $FULL_IMAGE_NAME" -ForegroundColor Cyan
Write-Host "`nProcesso concluido!" -ForegroundColor Green
