# Sistema de Versionamento Automático

## 📋 Visão Geral

Este projeto utiliza versionamento automático baseado em **timestamp** para garantir que usuários sempre recebam as versões mais recentes da aplicação.

## 🔄 Como Funciona

### 1. Geração de Versão (Build Time)

Cada build gera automaticamente um arquivo `public/version.json` com:
- **version**: Timestamp único (ex: `1734183840123`)
- **buildDate**: Data/hora legível (ex: `2024-12-14T11:44:00.123Z`)
- **timestamp**: Timestamp numérico

**Script:** `scripts/generate-version.js`

### 2. Detecção de Atualizações (Runtime)

A aplicação verifica automaticamente se há novas versões disponíveis:

#### Método 1: Hook React (`useAppVersion`)
- Verifica a cada **30 minutos**
- Compara versão do servidor com versão em cache
- Exibe alerta visual quando nova versão está disponível
- Permite atualização manual pelo usuário

**Arquivo:** `src/hooks/useAppVersion.ts`

#### Método 2: Auto-atualização (`versionCheck`)
- Verifica a cada **5 horas**
- Atualiza automaticamente quando detecta nova versão
- Limpa service worker antes de recarregar

**Arquivo:** `src/utils/versionCheck.ts`

### 3. Interface de Atualização

**Componente:** `src/components/UpdateAlert.tsx`
- Banner fixo no canto inferior direito
- Botão "Atualizar agora" para forçar atualização
- **Só aparece quando nova versão está disponível**
- **Exibido apenas na página do Dashboard (`/app`)**

## 🚀 Comandos de Build

Todos os comandos abaixo geram versão automaticamente:

```bash
# Desenvolvimento
npm run dev

# Build de produção
npm run build

# Build otimizado (usado no Docker)
npm run build:optimized

# Build com memória reduzida
npm run build:low-mem

# Build conservativo
npm run build:conservative
```

## 🐳 Deploy com Docker

O Dockerfile já está configurado para gerar versão única a cada build:

```bash
# Build da imagem
docker-compose build

# Deploy
docker-compose up -d
```

**Importante:** Cada build Docker gera uma nova versão automaticamente.

## 📁 Arquivos Principais

```
gbp-main/
├── scripts/
│   └── generate-version.js          # Gera version.json
├── src/
│   ├── hooks/
│   │   └── useAppVersion.ts         # Hook de verificação (30min)
│   ├── utils/
│   │   └── versionCheck.ts          # Auto-atualização (5h)
│   └── components/
│       └── UpdateAlert.tsx          # Alerta visual
└── public/
    └── version.json                 # Gerado automaticamente (NÃO commitar)
```

## ⚙️ Configurações

### Intervalo de Verificação

Para alterar os intervalos, edite:

**useAppVersion.ts:**
```typescript
const CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutos
```

**versionCheck.ts:**
```typescript
const CHECK_INTERVAL = 5 * 60 * 60 * 1000; // 5 horas
```

### Service Worker

O Service Worker está configurado para:
- **NÃO** fazer cache de `version.json`
- Sempre buscar versão mais recente do servidor
- Limpar cache ao detectar nova versão

**Arquivo:** `public/sw.js`

## 🔍 Verificação Manual

Para verificar a versão atual no navegador:

```javascript
// Console do navegador
fetch('/version.json').then(r => r.json()).then(console.log)

// Verificar versão em cache
localStorage.getItem('app_version')
```

## 🐛 Solução de Problemas

### Usuários não recebem atualizações

1. Verifique se `version.json` foi gerado no build:
   ```bash
   cat public/version.json
   ```

2. Verifique se o servidor está servindo o arquivo correto:
   ```bash
   curl https://seu-dominio.com/version.json
   ```

3. Limpe o cache do navegador e localStorage:
   ```javascript
   localStorage.clear()
   location.reload()
   ```

### Build não gera versão

Verifique se o script está sendo executado:
```bash
node scripts/generate-version.js
```

## 📊 Monitoramento

Para monitorar atualizações, verifique o console do navegador:
- `"Nova versão detectada. Atualizando..."` - Atualização automática
- `"✅ Versão gerada: [timestamp] ([data])"` - Durante build

## 🔐 Segurança

- `version.json` não contém informações sensíveis
- Apenas expõe timestamp e data de build
- Não revela estrutura interna do código
