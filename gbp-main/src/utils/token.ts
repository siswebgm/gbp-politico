/**
 * Gera um token aleatório seguro para convites
 * @returns string Token aleatório de 32 caracteres
 */
export function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = 32;
  let token = '';
  
  // Gerar bytes aleatórios
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  
  // Converter bytes em caracteres
  for (let i = 0; i < length; i++) {
    token += chars[bytes[i] % chars.length];
  }
  
  return token;
}
