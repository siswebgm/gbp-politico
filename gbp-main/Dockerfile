# Etapa 1: Construir a aplicação
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências de desenvolvimento também
RUN npm install

# Copiar o restante da aplicação
COPY . .

# Construir a aplicação com limite de memória otimizado
RUN NODE_OPTIONS=--max_old_space_size=8192 npm run build:low-mem

# Etapa 2: Criar a imagem de produção
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
