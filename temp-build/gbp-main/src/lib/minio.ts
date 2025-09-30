import { S3Client } from "@aws-sdk/client-s3";

// Configuração do cliente S3 para MinIO
export const s3Client = new S3Client({
  endpoint: import.meta.env.VITE_MINIO_ENDPOINT || 'https://s3.gbppolitico.com',
  region: "stub",
  credentials: {
    accessKeyId: import.meta.env.VITE_MINIO_ACCESS_KEY || '',
    secretAccessKey: import.meta.env.VITE_MINIO_SECRET_KEY || '',
  },
  forcePathStyle: true,
  tls: true,
  // Configurações para lidar com CORS e problemas de conectividade
  requestHandler: {
    abortSignal: undefined,
    connectionTimeout: 10000, // Aumentado para 10 segundos
    keepAlive: true,
  },
  maxAttempts: 3, // Tentativas de retry
  // Configurações específicas para browser
  customUserAgent: 'GBPPolitico/1.0.0',
});

// Função auxiliar para gerar URLs públicas
export const getPublicUrl = (key: string): string => {
  // Remove qualquer barra inicial do key para evitar dupla barra na URL
  const cleanKey = key.startsWith('/') ? key.slice(1) : key;
  
  // Garante que o endpoint não termine com barra
  const endpoint = (import.meta.env.VITE_MINIO_ENDPOINT || 'https://s3.gbppolitico.com').replace(/\/$/, '');
  const bucket = import.meta.env.VITE_MINIO_BUCKET || 'gbp-politico';
  
  // Monta a URL pública
  return `${endpoint}/${bucket}/${cleanKey}`;
};
