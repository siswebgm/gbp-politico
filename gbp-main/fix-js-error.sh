#!/bin/bash

# Script para corrigir erro JavaScript no arquivo utils
echo "Corrigindo erro JavaScript no arquivo utils..."

# Encontrar o arquivo utils problemático
UTILS_FILE=$(find /usr/share/nginx/html/js -name "utils-*.js" | head -1)

if [ -f "$UTILS_FILE" ]; then
    echo "Arquivo encontrado: $UTILS_FILE"
    
    # Fazer backup
    cp "$UTILS_FILE" "$UTILS_FILE.backup"
    
    # Corrigir o problema de inicialização
    # Substituir referências problemáticas por versões seguras
    sed -i 's/import{J as e,/import{J as supabaseCreate,/g' "$UTILS_FILE"
    sed -i 's/const c=e(/const c=supabaseCreate(/g' "$UTILS_FILE"
    
    echo "Correção aplicada com sucesso!"
else
    echo "Arquivo utils não encontrado!"
fi