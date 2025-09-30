import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Aceita apenas método POST
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

    console.log('Dados recebidos:', req.body);

    // Validação básica
    if (
      !nome ||
      !cpf ||
      !data_nascimento ||
      !whatsapp ||
      !telefone ||
      !genero ||
      !titulo_eleitor ||
      !zona ||
      !secao ||
      !cep ||
      !logradouro ||
      !cidade ||
      !bairro ||
      !numero ||
      !complemento ||
      !categoriaId ||
      !empresaId
    ) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

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

    console.log('Registro criado com ID:', result.rows[0].id);

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
