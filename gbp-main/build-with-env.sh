#!/bin/bash

# Script para build Docker com variáveis de ambiente injetadas
# Uso: ./build-with-env.sh [tag] [env-file]

set -e

# Configurações padrão
IMAGE_NAME="gbp-politico"
TAG=${1:-latest}
ENV_FILE=${2:-.env}

echo "🚀 GBP Político - Build Docker com Variáveis de Ambiente"
echo "=================================================="
echo "📦 Imagem: $IMAGE_NAME:$TAG"
echo "📄 Arquivo env: $ENV_FILE"
echo ""

# Verificar se o arquivo .env existe
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Erro: Arquivo $ENV_FILE não encontrado!"
    echo "💡 Certifique-se de que o arquivo de ambiente existe."
    exit 1
fi

# Carregar variáveis do arquivo .env
echo "📋 Carregando variáveis de ambiente de $ENV_FILE..."
export $(cat $ENV_FILE | grep -v '^#' | grep -v '^$' | xargs)

# Verificar variáveis essenciais
echo "🔍 Verificando variáveis essenciais..."
REQUIRED_VARS=(
    "VITE_SUPABASE_URL"
    "VITE_SUPABASE_ANON_KEY"
    "VITE_STRIPE_PUBLIC_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Erro: Variável $var não está definida!"
        exit 1
    else
        echo "✅ $var: ${!var:0:20}..."
    fi
done

echo ""
echo "🔨 Iniciando build da imagem Docker..."

# Build da imagem passando todas as variáveis como build args
docker build \
  --build-arg VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
  --build-arg VITE_SUPABASE_API_URL="$VITE_SUPABASE_API_URL" \
  --build-arg VITE_SUPABASE_AUTH_URL="$VITE_SUPABASE_AUTH_URL" \
  --build-arg VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
  --build-arg VITE_SERPRO_CPF_API_KEY="$VITE_SERPRO_CPF_API_KEY" \
  --build-arg VITE_SERPRO_CPF_API_URL="$VITE_SERPRO_CPF_API_URL" \
  --build-arg VITE_MINIO_ENDPOINT="$VITE_MINIO_ENDPOINT" \
  --build-arg VITE_MINIO_ACCESS_KEY="$VITE_MINIO_ACCESS_KEY" \
  --build-arg VITE_MINIO_SECRET_KEY="$VITE_MINIO_SECRET_KEY" \
  --build-arg VITE_MINIO_BUCKET="$VITE_MINIO_BUCKET" \
  --build-arg VITE_ASAAS_API_KEY="$VITE_ASAAS_API_KEY" \
  --build-arg VITE_ASAAS_ENV="$VITE_ASAAS_ENV" \
  --build-arg VITE_ASAAS_WEBHOOK_SECRET="$VITE_ASAAS_WEBHOOK_SECRET" \
  --build-arg VITE_APP_URL="$VITE_APP_URL" \
  --build-arg VITE_STRIPE_PUBLIC_KEY="$VITE_STRIPE_PUBLIC_KEY" \
  -f Dockerfile.env \
  -t $IMAGE_NAME:$TAG \
  .

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build concluído com sucesso!"
    echo "🏷️  Imagem criada: $IMAGE_NAME:$TAG"
    echo ""
    echo "🚀 Para executar a imagem:"
    echo "   docker run -p 80:80 $IMAGE_NAME:$TAG"
    echo ""
    echo "🔍 Para inspecionar a imagem:"
    echo "   docker images $IMAGE_NAME:$TAG"
    echo ""
else
    echo "❌ Erro durante o build!"
    exit 1
fi