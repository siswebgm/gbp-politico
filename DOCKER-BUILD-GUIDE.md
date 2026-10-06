# Guide de Build Docker Automatizado

## Scripts Disponíveis

### 1. build-docker-auto.ps1
Build e push automático para o Docker Hub.

**Uso:**
```powershell
.\build-docker-auto.ps1 [versão]
```

**Exemplo:**
```powershell
.\build-docker-auto.ps1 2.9.42
```

**Funcionalidades:**
- Verifica mudanças no git
- Pergunta se deseja commitar antes do build
- Gera versão automaticamente
- Build da imagem Docker
- Push para o Docker Hub
- Atualiza tag `latest`

### 2. build-docker-local.ps1
Build local apenas (sem push para o Docker Hub).

**Uso:**
```powershell
.\build-docker-local.ps1 [versão]
```

**Exemplo:**
```powershell
.\build-docker-local.ps1 2.9.42
```

**Funcionalidades:**
- Gera versão automaticamente
- Build da imagem Docker localmente
- Não faz push para o Docker Hub

## Fluxo de Trabalho Recomendado

### Para Desenvolvimento Local:
```powershell
# 1. Faça suas mudanças no código
# 2. Build local para testar
.\build-docker-local.ps1 2.9.42

# 3. Rodar a imagem localmente
docker run -d -p 3000:80 --name gbp-test siswebgm/gbp-politico:2.9.42

# 4. Testar em http://localhost:3000
# 5. Se estiver ok, parar o container
docker stop gbp-test
docker rm gbp-test
```

### Para Produção:
```powershell
# 1. Faça suas mudanças no código
# 2. Commitar mudanças no git
git add .
git commit -m "Sua mensagem de commit"

# 3. Build e push para o Docker Hub
.\build-docker-auto.ps1 2.9.42

# 4. Atualizar docker-compose.yml com a nova versão
# 5. Deploy
```

## Importante

**Sempre commitar suas mudanças no git antes de fazer o build para produção!**

Isso garante que:
- O código fonte está salvo no repositório
- Você pode recuperar o código fonte de qualquer versão
- Outras pessoas podem acessar o código
- Há histórico de mudanças

## Diretório do Projeto

O script assume que o projeto está em:
```
C:\Users\jmend\sistema-vereador\gbp-main
```

Se mudar o diretório, atualize a variável `$PROJECT_DIR` no script.

## Pré-requisitos

- Docker Desktop instalado e rodando
- Node.js instalado
- Git instalado
- Login no Docker Hub (para build-docker-auto.ps1)
```powershell
docker login
```

## Solução de Problemas

### Erro: "Diretório do projeto não encontrado"
Verifique se o diretório `C:\Users\jmend\sistema-vereador\gbp-main` existe.

### Erro: "Erro ao gerar versão"
Verifique se o script `scripts/generate-version.js` existe e se o Node.js está instalado.

### Erro: "Erro ao fazer push da imagem"
Certifique-se de estar logado no Docker Hub:
```powershell
docker login
```

### Erro: "Porta já em uso"
Pare o container que está usando a porta:
```powershell
docker stop gbp-test
docker rm gbp-test
```
