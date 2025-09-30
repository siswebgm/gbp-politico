#!/bin/sh

# Limpa a memória e o cache do Docker
echo "Limpando memória e cache..."
docker system prune -f
docker builder prune -f

# Limpa o cache do npm
rm -rf node_modules
rm -f package-lock.json

# Construção da imagem com limite de memória
echo "Iniciando a construção da imagem..."
docker build --memory=4g --memory-swap=4g -t gbp-politico:latest -f Dockerfile.updated .

echo "Build concluído!"

# Para executar o container:
echo "Para executar o container, use:"
echo "docker run -p 80:80 gbp-politico:latest"
