import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      nome,
      cpf,
      data_nascimento,
      whatsapp,
      telefone,
      genero,
      titulo_eleitor,
      zona,
      secao,
      cep,
      logradouro,
      cidade,
      bairro,
      numero,
      complemento,
      categoriaId,
      empresaId
    } = req.body;

    // Inserir na tabela gbp_eleitores
    const result = await sql`
      INSERT INTO gbp_eleitores (
        nome,
        cpf,
        nascimento,
        whatsapp,
        telefone,
        genero,
        titulo,
        zona,
        secao,
        cep,
        logradouro,
        cidade,
        bairro,
        numero,
        complemento,
        empresa_id,
        categoria
      ) VALUES (
        ${nome},
        ${cpf},
        ${data_nascimento},
        ${whatsapp},
        ${telefone},
        ${genero},
        ${titulo_eleitor},
        ${zona},
        ${secao},
        ${cep},
        ${logradouro},
        ${cidade},
        ${bairro},
        ${numero},
        ${complemento},
        ${empresaId},
        ${categoriaId}
      )
      RETURNING id
    `;

    return res.status(200).json({ 
      success: true, 
      message: 'Cadastro realizado com sucesso!',
      id: result.rows[0].id 
    });
  } catch (error) {
    console.error('Erro ao cadastrar eleitor:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar cadastro', 
      details: error.message 
    });
  }
}
