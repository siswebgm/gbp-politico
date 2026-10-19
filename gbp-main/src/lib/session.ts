// Token de sessão emitido pela RPC login_seguro (Etapa 4).
// Fica salvo dentro do objeto gbp_user no localStorage e também
// numa chave própria, para chamadas que precisam provar a sessão.
export function getSessaoToken(): string {
  try {
    const direto = localStorage.getItem('sessao_token');
    if (direto) return direto;
    const user = JSON.parse(localStorage.getItem('gbp_user') || '{}');
    return user?.sessao_token || '';
  } catch {
    return '';
  }
}
