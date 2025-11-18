# Instruções para Build e Push da Imagem Docker v2.3

## 📋 Pré-requisitos

1. **Docker Desktop** deve estar rodando
2. **Login no Docker Hub** deve estar feito:
   ```powershell
   docker login
   ```
   - Usuário: siswebgm
   - Senha: [sua senha do Docker Hub]

## 🚀 Executar o Build e Push

### Opção 1: Usar o Script PowerShell (Recomendado)

```powershell
# No diretório do projeto
cd c:\Users\jmend\gbp_git_oficial\gbp-politico\gbp-main

# Executar o script
powershell -ExecutionPolicy Bypass -File build-and-push.ps1
```

### Opção 2: Comandos Manuais

```powershell
# 1. Carregar variáveis do .env
Get-Content .env | ForEach-Object {
    if ($_ -match "^([^#][^=]+)=(.*)$") {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

# 2. Build da imagem
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
  -t siswebgm/gbp-politico:2.3 `
  .

# 3. Push da imagem
docker push siswebgm/gbp-politico:2.3
```

## ✅ Verificação

Após o push, verifique se a imagem está disponível:

```powershell
# Listar imagens locais
docker images siswebgm/gbp-politico

# Verificar no Docker Hub
# Acesse: https://hub.docker.com/r/siswebgm/gbp-politico/tags
```

## 📝 O que o Build Faz

1. **Carrega variáveis do .env**: Todas as variáveis VITE_* são carregadas
2. **Injeta no build**: As variáveis são passadas como build args
3. **Build do Vite**: O Vite compila o código com as variáveis injetadas
4. **Cria imagem Nginx**: Imagem final com os arquivos estáticos
5. **Push para Docker Hub**: Envia para o repositório siswebgm/gbp-politico:2.3

## 🔒 Segurança

- ✅ Variáveis são injetadas durante o build (não ficam expostas)
- ✅ Arquivo .env não é copiado para a imagem
- ✅ Credenciais ficam "baked" no código JavaScript compilado
- ✅ Imagem final contém apenas arquivos estáticos

## 📦 Resultado Esperado

```
siswebgm/gbp-politico:2.3
```

Imagem disponível em: https://hub.docker.com/r/siswebgm/gbp-politico

## 🐛 Troubleshooting

### Erro: "Docker Desktop não está rodando"
```powershell
# Iniciar o Docker Desktop manualmente
# Aguardar até que o ícone fique verde
```

### Erro: "unauthorized: authentication required"
```powershell
# Fazer login novamente
docker login
```

### Erro: "denied: requested access to the resource is denied"
```powershell
# Verificar se você tem permissão no repositório siswebgm/gbp-politico
# Ou criar um novo repositório no Docker Hub
```

## 📊 Tempo Estimado

- Build: ~5-10 minutos (dependendo do hardware)
- Push: ~2-5 minutos (dependendo da internet)
- **Total: ~7-15 minutos**

## 🎯 Próximos Passos

Após o push bem-sucedido:

1. Atualizar o docker-compose.yml ou Kubernetes para usar a tag 2.3
2. Fazer deploy da nova versão
3. Testar a aplicação em produção
4. Monitorar logs e métricas
