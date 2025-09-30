#!/bin/bash

# Define as variáveis
IMAGE_NAME="gbp_politico"
VERSION="1.0"
REGISTRY="ghcr.io/gbp_politico"

# Constrói a imagem
echo "Construindo imagem Docker $IMAGE_NAME:$VERSION..."
docker build -t $IMAGE_NAME:$VERSION .

# Tag a imagem com a versão
echo "Criando tag para a imagem..."
docker tag $IMAGE_NAME:$VERSION $REGISTRY/$IMAGE_NAME:$VERSION
docker tag $IMAGE_NAME:$VERSION $REGISTRY/$IMAGE_NAME:latest

# Push para o registry
echo "Enviando imagem para o registry..."
docker push $REGISTRY/$IMAGE_NAME:$VERSION
docker push $REGISTRY/$IMAGE_NAME:latest

echo "Processo concluído com sucesso!"
