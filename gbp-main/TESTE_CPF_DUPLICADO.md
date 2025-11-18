# 🔍 Guia de Teste - Verificação de CPF Duplicado

## 📋 Passos para Testar

### 1. **Recarregar a Aplicação**
- Pressione `Ctrl + Shift + R` (hard reload) no navegador
- Ou feche e abra novamente a aba
- Isso garante que o código atualizado seja carregado

### 2. **Abrir o Console do Navegador**
- Pressione `F12`
- Vá para a aba "Console"
- Limpe o console (ícone 🚫 ou Ctrl+L)

### 3. **Acessar a Página de Novo Eleitor**
- Navegue para: `/app/eleitores/novo`

### 4. **Digitar o CPF Problemático**
- Digite: `875.979.184-53` (ou `87597918453`)
- Aguarde 1 segundo após digitar os 11 dígitos

### 5. **Observar os Logs no Console**

Você deve ver algo assim:

```
=== VERIFICAÇÃO DE CPF ===
🔍 CPF Original: 875.979.184-53
🔍 CPF Limpo: 87597918453
🔍 Empresa UID: [seu-empresa-uid]
🔍 Comprimento: 11
📡 Executando query no Supabase...
📊 Resposta do banco: { encontrado: true/false, erro: null, dados: {...} }
```

### 6. **Cenários Possíveis**

#### ✅ **Cenário 1: CPF Encontrado (esperado)**
```
✅ CPF ENCONTRADO!
   - Nome: [Nome do Eleitor]
   - CPF no banco: 87597918453
   - CPF buscado: 87597918453
   - Match: true
⚠️ Este CPF já está cadastrado nesta empresa!
[Redireciona para a página do eleitor]
```

#### ❌ **Cenário 2: CPF NÃO Encontrado (problema)**
```
ℹ️ CPF não encontrado na empresa atual
🔍 CPF em outras empresas: 0
🔍 Consultando...
```

Se aparecer o **Cenário 2**, precisamos investigar:

---

## 🔎 Se o CPF NÃO for Encontrado

### **Verificação 1: Confirmar que o CPF existe no banco**

Execute esta query no Supabase SQL Editor:

```sql
SELECT uid, nome, cpf, empresa_uid, created_at
FROM gbp_eleitores
WHERE cpf = '87597918453'
ORDER BY created_at DESC;
```

**Anote:**
- ✅ O CPF existe? (Sim/Não)
- ✅ Qual o `empresa_uid`?
- ✅ O CPF está exatamente como: `87597918453` (sem pontos/traços)?

### **Verificação 2: Confirmar empresa_uid do usuário logado**

No console do navegador, digite:

```javascript
// Verificar empresa do usuário
const user = JSON.parse(localStorage.getItem('user') || '{}');
console.log('Empresa UID do usuário:', user.empresa_uid);
```

**Compare:**
- O `empresa_uid` do usuário é o MESMO do eleitor no banco?

### **Verificação 3: Testar query manualmente**

No console do navegador, execute:

```javascript
// Importar supabase
const { supabaseClient } = await import('./src/lib/supabase.js');

// Buscar CPF
const result = await supabaseClient
  .from('gbp_eleitores')
  .select('uid, nome, cpf, empresa_uid')
  .eq('cpf', '87597918453')
  .eq('empresa_uid', '[COLE-SEU-EMPRESA-UID-AQUI]');

console.log('Resultado:', result);
```

---

## 📊 Informações para Reportar

Se o problema persistir, me envie:

1. **Logs do console** (copie tudo que aparecer)
2. **Resultado da query SQL** (Verificação 1)
3. **empresa_uid do usuário** (Verificação 2)
4. **Resultado da query manual** (Verificação 3)

---

## 🚀 Após Resolver

Quando funcionar, você verá:
- ✅ Toast amarelo: "⚠️ Este CPF já está cadastrado nesta empresa!"
- ✅ Redirecionamento automático para a página do eleitor
- ✅ Impossível cadastrar duplicata

---

## 📝 Notas Importantes

- O CPF deve ter **exatamente 11 dígitos**
- A verificação acontece **1 segundo após** digitar o 11º dígito
- Se você modificar o CPF após a verificação, os campos são limpos
- A verificação também acontece no **submit do formulário**
