# Exemplos de Uso - Docker Build com Variáveis

## 🚀 Exemplos Práticos

### 1. Build Básico (Linux/Mac)
```bash
# Dar permissão de execução
chmod +x build-with-env.sh

# Build com tag latest
./build-with-env.sh

# Build com tag específica
./build-with-env.sh v1.0.0

# Build usando arquivo .env específico
./build-with-env.sh latest .env.production
```

### 2. Build Básico (Windows)
```powershell
# Build com tag latest
.\build-with-env.ps1

# Build com tag específica
.\build-with-env.ps1 -Tag "v1.0.0"

# Build usando arquivo .env específico
.\build-with-env.ps1 -Tag "latest" -EnvFile ".env.production"
```

### 3. Docker Compose
```bash
# Build e execução
docker-compose -f docker-compose.build.yml up --build

# Build apenas
docker-compose -f docker-compose.build.yml build

# Build com arquivo .env específico
env $(cat .env.production | xargs) docker-compose -f docker-compose.build.yml up --build
```

### 4. Build Manual
```bash
# Carregar variáveis do .env
source .env

# Build manual com todas as variáveis
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
  -t gbp-politico:latest \
  .
```

## 🔧 Cenários de Uso

### Desenvolvimento Local
```bash
# Build para desenvolvimento
./build-with-env.sh dev .env

# Executar localmente
docker run -p 3000:80 gbp-politico:dev
```

### Staging
```bash
# Build para staging
./build-with-env.sh staging .env.staging

# Deploy no staging
docker tag gbp-politico:staging registry.com/gbp-politico:staging
docker push registry.com/gbp-politico:staging
```

### Produção
```bash
# Build para produção
./build-with-env.sh production .env.production

# Deploy na produção
docker tag gbp-politico:production registry.com/gbp-politico:production
docker push registry.com/gbp-politico:production
```

## 🐳 Docker Hub / Registry

### Push para Registry
```bash
# Build e tag
./build-with-env.sh v1.0.0

# Tag para registry
docker tag gbp-politico:v1.0.0 siswebgm/gbp-politico:v1.0.0
docker tag gbp-politico:v1.0.0 siswebgm/gbp-politico:latest

# Push
docker push siswebgm/gbp-politico:v1.0.0
docker push siswebgm/gbp-politico:latest
```

### Pull e Execução
```bash
# Pull da imagem
docker pull siswebgm/gbp-politico:latest

# Executar
docker run -d \
  --name gbp-politico-app \
  -p 80:80 \
  --restart unless-stopped \
  siswebgm/gbp-politico:latest
```

## 🔍 Debugging

### Verificar Variáveis na Imagem
```bash
# Executar shell na imagem
docker run -it --rm gbp-politico:latest sh

# Verificar arquivos de build
docker run --rm gbp-politico:latest ls -la /usr/share/nginx/html

# Verificar configuração do nginx
docker run --rm gbp-politico:latest cat /etc/nginx/conf.d/default.conf
```

### Logs e Monitoramento
```bash
# Ver logs do container
docker logs gbp-politico-app

# Monitorar logs em tempo real
docker logs -f gbp-politico-app

# Verificar saúde do container
docker inspect gbp-politico-app | grep -A 10 "Health"
```

## ⚠️ Troubleshooting

### Erro: Port already in use
```bash
# Verificar portas em uso
netstat -tulpn | grep :80

# Usar porta diferente
docker run -p 8080:80 gbp-politico:latest
```

### Erro: Build failed
```bash
# Limpar cache do Docker
docker builder prune

# Build sem cache
docker build --no-cache -f Dockerfile.env -t gbp-politico:latest .
```

### Erro: Environment variables not found
```bash
# Verificar arquivo .env
cat .env | grep VITE_

# Verificar se variáveis estão sendo carregadas
source .env && echo $VITE_SUPABASE_URL
```