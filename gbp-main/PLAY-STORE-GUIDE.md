# 📱 Guia de Publicação na Play Store - GBP Político CRM

## 🎯 Status Atual: 90% Pronto!

Seu aplicativo já está configurado com Capacitor e pronto para build.

---

## 🛠️ Passo 1: Gerar APK/AAB

### Opção A: Via Android Studio (Recomendado)
```bash
# Abrir projeto no Android Studio
npx cap open android
```

No Android Studio:
1. **Build → Build Bundle(s) / APK(s) → Build APK(s)** (para testes)
2. **Build → Build Bundle(s) / APK(s) → Build Bundle(s)** (para Play Store)

### Opção B: Via Linha de Comando
```bash
cd android
./gradlew assembleDebug      # APK para testes
./gradlew assembleRelease    # APK release
./gradlew bundleRelease      # Bundle para Play Store
```

---

## 🔑 Passo 2: Chave de Assinatura

### Criar Chave de Lançamento
```bash
keytool -genkey -v -keystore gbp-politico-release.keystore -alias gbp-politico -keyalg RSA -keysize 2048 -validity 10000
```

### Configurar no build.gradle
```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('gbp-politico-release.keystore')
            storePassword 'sua-senha'
            keyAlias 'gbp-politico'
            keyPassword 'sua-senha'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## 📋 Passo 3: Conta Google Play Developer

### Requisitos:
- **Taxa de registro**: $25 (única)
- **Conta Google**: Gmail/Workspace
- **Dados da empresa**: CNPJ, endereço, telefone

### Link: https://play.google.com/console/signup

---

## 📝 Passo 4: Documentação Play Store

### Descrição do Aplicativo:
```
GBP Político CRM - Sistema completo para gestão política

Gerencie eleitores, eventos, documentos e campanhas em um único lugar.

✅ Recursos Principais:
• Cadastro de eleitores com geolocalização
• Gestão de eventos e agenda
• Sistema de documentos e ofícios
• Relatórios detalhados e analytics
• Pesquisas eleitorais integradas
• Disparos em massa (WhatsApp/SMS)
• Gestão de usuários e permissões

🎯 Ideal para:
• Vereadores e deputados
• Assessorias políticas
• Gabinetes municipais
• Campanhas eleitorais

💡 Benefícios:
• Organize sua base eleitoral
• Acompanhe desempenho em tempo real
• Otimize recursos e tempo
• Tome decisões baseadas em dados
```

### Palavras-chave:
`gestão política, crm político, eleitores, campanha, vereador, deputado, assessoria`

### Categoria: **Produtividade** ou **Negócios**

---

## 🎨 Passo 5: Assets Visuais

### Obrigatórios:
- **Ícone**: 512x512px (PNG)
- **Feature Graphic**: 1024x500px (JPEG)
- **Screenshots**: Mínimo 2, máximo 8
  - Phone: 320-3840px (mínimo 1080x1920)
  - Tablet: 600-7680px (mínimo 600x800)

### Recomendados:
- **Promo Graphic**: 180x120px (GIF/MP4)
- **YouTube Promo**: Vídeo 30-120 segundos

---

## 🔒 Passo 6: Permissões Android

### No AndroidManifest.xml:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

---

## 📊 Passo 7: Configuração Play Store

### Conteúdo Classificação:
- **Público**: +16 (gestão política)
- **Conteúdo**: Sem violência, sem conteúdo adulto

### Preço:
- **Gratuito** (recomendado para maior alcance)

### Disponibilidade:
- **Brasil** (principal)
- **Países lusófonos** (opcional)

---

## 🚀 Passo 8: Submissão

### Checklist Final:
- [ ] APK/AAB assinado
- [ ] Ícones e screenshots
- [ ] Descrição completa
- [ ] Política de privacidade
- [ ] Contato desenvolvedor
- [ ] Teste interno aprovado

### Processo de Revisão:
- **Tempo médio**: 1-3 dias
- **Possíveis rejeições**: Permissões, conteúdo, funcionalidade

---

## 📞 Suporte Técnico

### Contato Desenvolvedor:
- **Email**: seu-email@dominio.com
- **Site**: https://seu-site.com
- **Telefone**: (XX) XXXXX-XXXX

### Política de Privacidade:
- Link para documento online
- Coleta de dados explicada
- Conformidade LGPD

---

## 🎉 Pós-Lançamento

### Marketing:
- Anunciar nas redes sociais
- Email marketing para base
- Materiais de campanha

### Manutenção:
- Atualizações mensais
- Feedback dos usuários
- Monitoramento de bugs

---

## ⚡ Resumo Rápido

1. **Build**: `npx cap open android`
2. **Chave**: Criar keystore
3. **Conta**: Registrar $25
4. **Documentação**: Descrição + assets
5. **Submissão**: Enviar para revisão
6. **Lançamento**: 1-3 dias após

**Tempo total estimado: 2-5 dias úteis**
