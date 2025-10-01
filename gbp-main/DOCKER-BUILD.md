# Docker Build com Variáveis de Ambiente

Este documento explica como construir a imagem Docker do GBP Político injetando as variáveis de ambiente durante o build.

## 🚨 Problema Atual

Os Dockerfiles atuais **NÃO** injetam as variáveis de ambiente durante o build. Eles apenas copiam os arquivos `.env` existentes, o que pode causar problemas de segurança e flexibilidade.

## ✅ Solução Recomendada

### 1. Dockerfile com Build Args

Crie um `Dockerfile.env` que aceita variáveis como argumentos de build:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments para variáveis de ambiente
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_API_URL
ARG VITE_SUPABASE_AUTH_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SERPRO_CPF_API_KEY
ARG VITE_SERPRO_CPF_API_URL
ARG VITE_MINIO_ENDPOINT
ARG VITE_MINIO_ACCESS_KEY
ARG VITE_MINIO_SECRET_KEY
ARG VITE_MINIO_BUCKET
ARG VITE_ASAAS_API_KEY
ARG VITE_ASAAS_ENV
ARG VITE_ASAAS_WEBHOOK_SECRET
ARG VITE_APP_URL
ARG VITE_STRIPE_PUBLIC_KEY

# Definir as variáveis de ambiente para o build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_API_URL=$VITE_SUPABASE_API_URL
ENV VITE_SUPABASE_AUTH_URL=$VITE_SUPABASE_AUTH_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_SERPRO_CPF_API_KEY=$VITE_SERPRO_CPF_API_KEY
ENV VITE_SERPRO_CPF_API_URL=$VITE_SERPRO_CPF_API_URL
ENV VITE_MINIO_ENDPOINT=$VITE_MINIO_ENDPOINT
ENV VITE_MINIO_ACCESS_KEY=$VITE_MINIO_ACCESS_KEY
ENV VITE_MINIO_SECRET_KEY=$VITE_MINIO_SECRET_KEY
ENV VITE_MINIO_BUCKET=$VITE_MINIO_BUCKET
ENV VITE_ASAAS_API_KEY=$VITE_ASAAS_API_KEY
ENV VITE_ASAAS_ENV=$VITE_ASAAS_ENV
ENV VITE_ASAAS_WEBHOOK_SECRET=$VITE_ASAAS_WEBHOOK_SECRET
ENV VITE_APP_URL=$VITE_APP_URL
ENV VITE_STRIPE_PUBLIC_KEY=$VITE_STRIPE_PUBLIC_KEY

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --no-audit --prefer-offline --no-fund

# Copiar código fonte
COPY . .

# Build da aplicação (as variáveis serão injetadas no build)
RUN NODE_OPTIONS=--max_old_space_size=8192 npm run build

# Production stage
FROM nginx:stable-alpine

# Instalar curl para healthcheck
RUN apk add --no-cache curl

# Copiar arquivos construídos
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuração do nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost/ || exit 1

# Expor a porta 80
EXPOSE 80

# Iniciar nginx
CMD ["nginx", "-g", "daemon off;"]
```

### 2. Script de Build com Variáveis

Crie um script `build-with-env.sh`:

```bash
#!/bin/bash

# Carrega variáveis do arquivo .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Nome da imagem
IMAGE_NAME="gbp-politico"
TAG=${1:-latest}

echo "🚀 Construindo imagem Docker com variáveis de ambiente..."

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

echo "✅ Build concluído: $IMAGE_NAME:$TAG"
```

### 3. Docker Compose com Build Args

Atualize o `docker-compose.yml` para usar build args:

```yaml
version: "3.8"

services:
  gbp-politico:
    build:
      context: .
      dockerfile: Dockerfile.env
      args:
        - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
        - VITE_SUPABASE_API_URL=${VITE_SUPABASE_API_URL}
        - VITE_SUPABASE_AUTH_URL=${VITE_SUPABASE_AUTH_URL}
        - VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
        - VITE_SERPRO_CPF_API_KEY=${VITE_SERPRO_CPF_API_KEY}
        - VITE_SERPRO_CPF_API_URL=${VITE_SERPRO_CPF_API_URL}
        - VITE_MINIO_ENDPOINT=${VITE_MINIO_ENDPOINT}
        - VITE_MINIO_ACCESS_KEY=${VITE_MINIO_ACCESS_KEY}
        - VITE_MINIO_SECRET_KEY=${VITE_MINIO_SECRET_KEY}
        - VITE_MINIO_BUCKET=${VITE_MINIO_BUCKET}
        - VITE_ASAAS_API_KEY=${VITE_ASAAS_API_KEY}
        - VITE_ASAAS_ENV=${VITE_ASAAS_ENV}
        - VITE_ASAAS_WEBHOOK_SECRET=${VITE_ASAAS_WEBHOOK_SECRET}
        - VITE_APP_URL=${VITE_APP_URL}
        - VITE_STRIPE_PUBLIC_KEY=${VITE_STRIPE_PUBLIC_KEY}
    ports:
      - "80:80"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## 🔧 Como Usar

### Opção 1: Script de Build
```bash
# Dar permissão de execução
chmod +x build-with-env.sh

# Executar o build
./build-with-env.sh latest
```

### Opção 2: Docker Compose
```bash
# Build e execução
docker-compose up --build
```

### Opção 3: Docker Build Manual
```bash
# Carregar variáveis do .env
source .env

# Build manual
docker build \
  --build-arg VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
  --build-arg VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
  # ... outras variáveis
  -f Dockerfile.env \
  -t gbp-politico:latest \
  .
```

## 🔒 Segurança

- ✅ **Variáveis injetadas no build**: Não ficam expostas na imagem final
- ✅ **Sem arquivos .env na imagem**: Credenciais não ficam no filesystem
- ✅ **Build-time only**: Variáveis só existem durante a construção
- ✅ **Flexibilidade**: Diferentes ambientes com mesma imagem base

## 📝 Notas Importantes

1. **Vite Build**: As variáveis `VITE_*` são injetadas no código durante o build
2. **Não há runtime**: Variáveis não existem em runtime, apenas no build
3. **Segurança**: Credenciais ficam "baked" no código JavaScript final
4. **Cache**: Mudanças nas variáveis invalidam o cache do Docker

## 🚀 Próximos Passos

1. Criar o `Dockerfile.env`
2. Criar o script `build-with-env.sh`
3. Testar o build localmente
4. Atualizar CI/CD para usar o novo processo
5. Documentar para a equipe