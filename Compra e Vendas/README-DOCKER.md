# Docker - Compra e Vendas

## Como rodar com Docker Desktop

1. Crie um arquivo `.env.local` na raiz com as variáveis:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-publica
SUPABASE_SERVICE_ROLE_KEY=sua-chave-de-servico
```

2. Inicie o Docker Desktop.

3. Suba o container:

```powershell
docker-compose up -d --build
```

4. Acesse em: http://localhost:3000

## Como publicar no Docker Hub

1. Crie uma conta gratuita em https://hub.docker.com
2. No terminal, faça login:

```powershell
docker login
```

3. Execute o script de deploy:

```powershell
.\deploy-docker.ps1
```

O script vai perguntar seu usuário e nome da imagem. A imagem será publicada em:

```
docker.io/seu-usuario/nome-imagem:latest
```

A URL pública no Docker Hub será:

```
https://hub.docker.com/r/seu-usuario/nome-imagem
```

## Comandos úteis

```powershell
# Buildar localmente
docker build -t marketplace .

# Rodar a imagem local
docker run -p 3000:3000 --env-file .env.local marketplace

# Ver imagens
docker images

# Ver logs
docker logs -f comprasevendas-app-1
```
