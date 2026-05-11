#!/bin/bash

echo "🔨 Build Android App - GBP Político CRM"
echo "======================================"

# Build do projeto web
echo "📱 Buildando projeto web..."
npm run build

# Sincronizar com Android
echo "🔄 Sincronizando com Android..."
npx cap sync android

# Abrir Android Studio (opcional)
echo "📱 Abrindo Android Studio..."
npx cap open android

echo "✅ Build concluído!"
echo ""
echo "📋 Próximos passos no Android Studio:"
echo "1. Build → Build Bundle(s) / APK(s) → Build APK(s) (para testes)"
echo "2. Build → Build Bundle(s) / APK(s) → Build Bundle(s) (para Play Store)"
echo "3. Assinar com sua chave de lançamento"
echo ""
echo "📦 Arquivos gerados:"
echo "- APK: android/app/build/outputs/apk/debug/app-debug.apk"
echo "- Bundle: android/app/build/outputs/bundle/release/app-release.aab"
