import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Configurar dotenv para ler o arquivo .env do diretório pai
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
app.use(express.json());

// Cliente Supabase (admin)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Cliente Asaas
const asaasApi = axios.create({
  baseURL: process.env.VITE_ASAAS_ENV === 'production'
    ? 'https://www.asaas.com/api/v3'
    : 'https://sandbox.asaas.com/api/v3',
  headers: {
    'access_token': process.env.VITE_ASAAS_API_KEY
  }
});

// Configurar CORS para permitir apenas requisições do frontend
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://gbppolitico.com'
    : ['http://localhost:3000', 'http://localhost:3001'],
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

// Rota para criar assinatura
app.post('/api/create-subscription', async (req, res) => {
  try {
    const { empresaUid, planoId } = req.body;

    if (!empresaUid || !planoId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Busca dados da empresa e plano
    const { data: empresa } = await supabase
      .from('gbp_empresas')
      .select('*')
      .eq('uid', empresaUid)
      .single();

    const { data: plano } = await supabase
      .from('gbp_planos')
      .select('*')
      .eq('id', planoId)
      .single();

    if (!empresa || !plano) {
      return res.status(404).json({ error: 'Empresa ou plano não encontrado' });
    }

    // Cria cliente no Asaas se não existir
    if (!empresa.asaas_customer_id) {
      const customer = await asaasApi.post('/customers', {
        name: empresa.nome,
        email: empresa.email || '',
        phone: empresa.telefone || '',
        cpfCnpj: empresa.cnpj || '',
        postalCode: empresa.cep || '',
        address: empresa.logradouro || '',
        addressNumber: empresa.numero || '',
        province: empresa.bairro || '',
        city: empresa.cidade || '',
        state: empresa.estado || '',
        country: 'BR'
      });

      await supabase
        .from('gbp_empresas')
        .update({ asaas_customer_id: customer.data.id })
        .eq('uid', empresaUid);

      empresa.asaas_customer_id = customer.data.id;
    }

    // Calcula datas
    const dataInicio = new Date();
    const dataFim = new Date();
    dataFim.setDate(dataFim.getDate() + plano.periodo_dias);
    const dataVencimento = new Date(dataFim);

    // Cria assinatura no banco
    const { data: assinatura, error } = await supabase
      .from('gbp_assinaturas')
      .insert({
        empresa_uid: empresaUid,
        plano_id: planoId,
        status: 'pending',
        data_inicio: dataInicio.toISOString(),
        data_fim: dataFim.toISOString(),
        data_vencimento: dataVencimento.toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ assinatura });
  } catch (error) {
    console.error('Erro ao criar assinatura:', error);
    res.status(500).json({
      error: 'Erro ao criar assinatura',
      message: error.message
    });
  }
});

// Rota para gerar pagamento
app.post('/api/generate-payment', async (req, res) => {
  try {
    const { assinaturaId, tipoPagamento, descontoPercentual } = req.body;

    if (!assinaturaId || !tipoPagamento) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Busca dados da assinatura
    const { data: assinatura } = await supabase
      .from('gbp_assinaturas')
      .select('*, gbp_planos(*), gbp_empresas(*)')
      .eq('id', assinaturaId)
      .single();

    if (!assinatura) {
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }

    // Calcula valor com desconto
    const valorOriginal = assinatura.gbp_planos.valor;
    const valorComDesconto = descontoPercentual > 0
      ? valorOriginal * (1 - descontoPercentual / 100)
      : valorOriginal;

    // Cria cobrança no Asaas
    const paymentData = {
      customer: assinatura.gbp_empresas.asaas_customer_id,
      billingType: tipoPagamento === 'pix' ? 'PIX' : 'BOLETO',
      value: valorComDesconto,
      dueDate: assinatura.data_vencimento,
      description: descontoPercentual > 0
        ? `Assinatura ${assinatura.gbp_planos.nome} (${descontoPercentual}% de desconto)`
        : `Assinatura ${assinatura.gbp_planos.nome}`,
      postalService: false
    };

    const { data: asaasPayment } = await asaasApi.post('/payments', paymentData);

    // Registra pagamento no banco
    const { data: pagamento, error } = await supabase
      .from('gbp_pagamentos')
      .insert({
        assinatura_id: assinaturaId,
        valor: valorComDesconto,
        tipo_pagamento: tipoPagamento,
        status: 'pending',
        gateway_id: asaasPayment.id,
        gateway_url: tipoPagamento === 'pix' ? asaasPayment.pixQrCodeUrl : asaasPayment.bankSlipUrl,
        data_vencimento: assinatura.data_vencimento
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      pagamento,
      paymentUrl: pagamento.gateway_url,
      qrCode: tipoPagamento === 'pix' ? asaasPayment.encodedImage : null,
      pixCopyPaste: tipoPagamento === 'pix' ? asaasPayment.payload : null
    });
  } catch (error) {
    console.error('Erro ao gerar pagamento:', error);
    res.status(500).json({
      error: 'Erro ao gerar pagamento',
      message: error.message
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
