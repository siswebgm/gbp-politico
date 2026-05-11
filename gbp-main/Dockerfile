# Etapa 1: Criar a imagem de produção usando o dist já buildado
FROM nginx:stable-alpine

# Instalar curl para healthcheck
RUN apk add --no-cache curl

# Copiar arquivos construídos do dist local
COPY dist /usr/share/nginx/html

# Copiar configuração do nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost/ || exit 1

# Expor a porta 80
EXPOSE 80

# Iniciar nginx
CMD ["nginx", "-g", "daemon off;"]
