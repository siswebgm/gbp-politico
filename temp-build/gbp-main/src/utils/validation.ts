export const validateUserData = (data: {
  nome?: string;
  email?: string;
  senha?: string;
  nivel_acesso?: string;
  empresa_id?: number;
}) => {
  if (!data.nome || !data.email || !data.senha || !data.nivel_acesso) {
    throw new Error('Missing required fields');
  }

  if (!data.empresa_id) {
    throw new Error('Company ID is required');
  }
};