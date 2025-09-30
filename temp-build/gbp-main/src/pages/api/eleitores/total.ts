import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getSession } from 'next-auth/react';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Usar o ID 1 da empresa conforme logs do usuário logado
    const empresaId = 1;
    console.log('Buscando eleitores para empresa:', empresaId);

    // Verificar se a tabela existe e sua estrutura
    const checkTable = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'gbp_eleitores'
      );
    `;
    console.log('Tabela existe:', checkTable);

    // Verificar colunas da tabela
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'gbp_eleitores';
    `;
    console.log('Colunas da tabela:', columns);

    // Contar total de eleitores
    const result = await prisma.$queryRaw`
      SELECT COUNT(*) as total 
      FROM "gbp_eleitores" 
      WHERE "empresa_id" = ${empresaId}::integer;
    `;
    console.log('Resultado da query:', result);

    // Buscar uma amostra para debug
    const sample = await prisma.$queryRaw`
      SELECT * FROM "gbp_eleitores" 
      WHERE "empresa_id" = ${empresaId}::integer
      LIMIT 1;
    `;
    console.log('Amostra de eleitor:', sample);

    const total = parseInt(result[0]?.total?.toString() || '0');

    return res.status(200).json({ 
      total,
      debug: {
        empresaId,
        tableExists: checkTable,
        tableColumns: columns,
        sample,
        queryResult: result
      } 
    });
  } catch (error) {
    console.error('Erro ao buscar total de eleitores:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  } finally {
    await prisma.$disconnect();
  }
}
