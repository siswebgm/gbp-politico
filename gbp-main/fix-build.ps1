# Script para corrigir o problema de inicialização JavaScript
param(
    [string]$Tag = "v1.5-fixed"
)

Write-Host "🔧 Corrigindo problema de inicialização JavaScript..." -ForegroundColor Yellow

try {
    # Passo 1: Fazer build normal
    Write-Host "📦 Fazendo build..." -ForegroundColor Cyan
    & npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Falha no build"
    }

    # Passo 2: Encontrar e corrigir arquivo utils problemático
    Write-Host "🔍 Procurando arquivo utils problemático..." -ForegroundColor Cyan
    $utilsFiles = Get-ChildItem -Path "dist/js" -Name "utils-*.js"
    
    foreach ($utilsFile in $utilsFiles) {
        $filePath = "dist/js/$utilsFile"
        $content = Get-Content $filePath -Raw
        
        Write-Host "🛠️  Corrigindo $utilsFile..." -ForegroundColor Yellow
        
        # Correção 1: Separar imports e const na mesma linha
        $content = $content -replace 'import\{([^}]+)\}from"([^"]+)";const ([^=]+)=([^(]+)\(', 'import{$1}from"$2";`nconst $3=$4('
        
        # Correção 2: Adicionar delay na inicialização
        $content = $content -replace 'const a=e\(', 'const a=(()=>{try{return e(}catch(err){console.warn("Supabase init delayed");setTimeout(()=>e('
        
        # Salvar arquivo corrigido
        Set-Content -Path $filePath -Value $content -NoNewline
        Write-Host "✅ $utilsFile corrigido" -ForegroundColor Green
    }

    # Passo 3: Criar imagem Docker
    Write-Host "🐳 Criando imagem Docker..." -ForegroundColor Cyan
    & docker build -f Dockerfile.simple-build -t "gbp-politico:$Tag" .
    if ($LASTEXITCODE -ne 0) {
        throw "Falha no build Docker"
    }

    # Passo 4: Tag para Docker Hub
    & docker tag "gbp-politico:$Tag" "siswebgm/gbp-politico:$Tag"
    & docker tag "gbp-politico:$Tag" "siswebgm/gbp-politico:latest"

    Write-Host "✅ Correção concluída!" -ForegroundColor Green
    Write-Host "📦 Imagem: siswebgm/gbp-politico:$Tag" -ForegroundColor Cyan

} catch {
    Write-Host "❌ Erro: $_" -ForegroundColor Red
    exit 1
}