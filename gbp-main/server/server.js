import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurar dotenv para ler o arquivo .env do diretório pai
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Configurar CORS para permitir apenas requisições do frontend
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://gbppolitico.com' 
    : 'http://localhost:3001',
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Cliente MinIO
const s3Client = new S3Client({
  endpoint: process.env.VITE_MINIO_ENDPOINT,
  region: "stub",
  credentials: {
    accessKeyId: process.env.VITE_MINIO_ACCESS_KEY,
    secretAccessKey: process.env.VITE_MINIO_SECRET_KEY,
  },
  forcePathStyle: true,
});

// Rota para upload de arquivo
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const timestamp = Date.now();
    const fileName = req.body.fileName || `${timestamp}_${req.file.originalname}`;
    const fileKey = `profile-photos/${fileName}`;

    // Configurar o upload para o MinIO
    const uploadParams = {
      Bucket: process.env.VITE_MINIO_BUCKET,
      Key: fileKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    // Fazer o upload
    await s3Client.send(new PutObjectCommand(uploadParams));

    // Gerar URL assinada para o arquivo (válida por 1 hora)
    const getObjectParams = {
      Bucket: process.env.VITE_MINIO_BUCKET,
      Key: fileKey,
    };
    const signedUrl = await getSignedUrl(s3Client, new PutObjectCommand(getObjectParams), { expiresIn: 3600 });

    // Retornar a URL pública
    const publicUrl = `${process.env.VITE_MINIO_ENDPOINT}/${process.env.VITE_MINIO_BUCKET}/${fileKey}`;
    
    res.json({
      url: publicUrl,
      signedUrl,
      key: fileKey,
    });

  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({
      error: 'Erro ao fazer upload do arquivo',
      details: error.message
    });
  }
});

// Rota para gerar URL assinada
app.get('/signed-url', async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) {
      return res.status(400).json({ error: 'Key é obrigatória' });
    }

    const params = {
      Bucket: process.env.VITE_MINIO_BUCKET,
      Key: key,
    };

    const signedUrl = await getSignedUrl(s3Client, new PutObjectCommand(params), { expiresIn: 3600 });
    res.json({ signedUrl });

  } catch (error) {
    console.error('Erro ao gerar URL assinada:', error);
    res.status(500).json({
      error: 'Erro ao gerar URL assinada',
      details: error.message
    });
  }
});

const PORT = process.env.UPLOAD_SERVER_PORT || 3300;
app.listen(PORT, () => {
  console.log(`Servidor de upload rodando na porta ${PORT}`);
  console.log('Configurações:');
  console.log(`- Endpoint MinIO: ${process.env.VITE_MINIO_ENDPOINT}`);
  console.log(`- Bucket: ${process.env.VITE_MINIO_BUCKET}`);
  console.log(`- CORS origin: ${process.env.NODE_ENV === 'production' ? 'https://gbppolitico.com' : 'http://localhost:3001'}`);
});
