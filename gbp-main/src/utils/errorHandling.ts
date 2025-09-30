export const handleSupabaseError = (error: any, operation: string) => {
  console.error(`Supabase error during ${operation}:`, error);
  
  if (error.message?.includes('Failed to fetch')) {
    throw new Error('Erro de conexão com o servidor. Por favor, verifique sua conexão com a internet.');
  }

  if (error.code === '23505') {
    throw new Error('Email já cadastrado');
  }

  if (error.code === '23503') {
    if (error.details?.includes('gbp_categorias_atendimento')) {
      throw new Error('Categoria de atendimento inválida');
    }
    if (error.details?.includes('gbp_usuarios')) {
      throw new Error('Usuário não encontrado');
    }
    if (error.details?.includes('gbp_eleitores')) {
      throw new Error('Eleitor não encontrado');
    }
    throw new Error('Erro de referência no banco de dados');
  }

  if (error.code === 'PGRST204') {
    throw new Error('Erro na estrutura do banco de dados');
  }

  if (error.code === 'PGRST301') {
    throw new Error('Sessão expirada. Por favor, faça login novamente.');
  }
  
  throw new Error(`Erro ao ${operation}: ${error.message || 'Erro desconhecido'}`);
};

export const handleAxiosError = (error: any, operation: string) => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const message = error.response.data?.error?.message || error.response.data?.message || error.message;
    throw new Error(`Erro ao ${operation}: ${message}`);
  } else if (error.request) {
    // The request was made but no response was received
    throw new Error(`Erro de conexão ao ${operation}. Verifique sua internet.`);
  } else {
    // Something happened in setting up the request that triggered an Error
    throw new Error(`Erro ao ${operation}: ${error.message}`);
  }
};