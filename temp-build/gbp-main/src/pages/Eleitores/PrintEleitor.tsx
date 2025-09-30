import React from 'react';

interface PrintEleitorProps {
  eleitor: any;
}

const PrintEleitor: React.FC<PrintEleitorProps> = ({ eleitor }) => {
  if (!eleitor) return null;

  return (
    <div className="hidden print:block print:p-8">
      <div className="space-y-6 text-black">
        {/* Nome */}
        <h1 className="text-2xl font-bold">{eleitor.nome}</h1>

        {/* Dados Pessoais */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold">CPF</p>
            <p>{eleitor.cpf}</p>
          </div>
          <div>
            <p className="text-sm font-semibold">Data de Nascimento</p>
            <p>{eleitor.nascimento}</p>
          </div>
          <div>
            <p className="text-sm font-semibold">Gênero</p>
            <p>{eleitor.genero}</p>
          </div>
        </div>

        {/* Endereço */}
        <div>
          <p className="text-sm font-semibold mb-1">Endereço</p>
          <p>
            {eleitor.logradouro}, {eleitor.numero}
            {eleitor.complemento && ` - ${eleitor.complemento}`}
          </p>
          <p>{eleitor.bairro} - {eleitor.cidade}/{eleitor.uf}</p>
          <p>CEP: {eleitor.cep}</p>
        </div>

        {/* Contatos */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold">Telefone</p>
            <p>{eleitor.telefone}</p>
          </div>
          <div>
            <p className="text-sm font-semibold">WhatsApp</p>
            <p>{eleitor.whatsapp}</p>
          </div>
        </div>

        {/* Título de Eleitor */}
        <div>
          <p className="text-sm font-semibold mb-1">Título de Eleitor</p>
          <div className="grid grid-cols-3 gap-4">
            <p>Número: {eleitor.titulo}</p>
            <p>Zona: {eleitor.zona}</p>
            <p>Seção: {eleitor.secao}</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 2cm;
          }

          body * {
            visibility: hidden;
          }

          .print-content,
          .print-content * {
            visibility: visible;
          }

          .print-content {
            position: absolute;
            left: 0;
            top: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintEleitor;
