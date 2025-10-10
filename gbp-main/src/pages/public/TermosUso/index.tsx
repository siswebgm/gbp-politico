import { useEffect } from 'react';
import { FileText, Lock, UserCheck } from 'lucide-react';

export function TermosUso() {

  // FORÇA scroll na página pública
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    
    body.classList.add('public-page-scroll');
    html.style.cssText = 'overflow: scroll !important; overflow-y: scroll !important; overflow-x: hidden !important; height: auto !important; position: relative !important; overscroll-behavior: none !important;';
    body.style.cssText = 'overflow: scroll !important; overflow-y: scroll !important; overflow-x: hidden !important; height: auto !important; position: relative !important; -webkit-overflow-scrolling: touch !important; overscroll-behavior: none !important;';
    
    // Scroll para o topo
    window.scrollTo(0, 0);
    
    return () => {
      body.classList.remove('public-page-scroll');
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3">
              <img 
                src="https://studio.gbppolitico.com/storage/v1/object/public/jmapps/form-logos/b256d287-0e08-4a83-a2b1-c6a38fe3f0e5.png" 
                alt="GBP Político"
                className="h-10 w-auto object-contain"
              />
              <span className="font-semibold text-xl text-gray-900">GBP Político</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
          {/* Título Principal */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-primary-100 p-4 rounded-full">
                <FileText className="h-12 w-12 text-primary-600" />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              Termos de Uso e Política de Privacidade
            </h1>
            <p className="text-gray-600">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>

          {/* Introdução */}
          <section className="mb-8">
            <p className="text-gray-700 leading-relaxed text-lg">
              Ao enviar uma demanda através desta plataforma, você concorda com os termos descritos abaixo.
            </p>
          </section>

          {/* Responsabilidade sobre a Demanda */}
          <section className="mb-8">
            <div className="flex items-center mb-4">
              <UserCheck className="h-6 w-6 text-primary-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">1. Responsabilidade sobre o Envio da Demanda</h2>
            </div>
            
            <div className="space-y-4 text-gray-700">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="leading-relaxed text-base">
                  <strong>Você declara que:</strong>
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
                  <li>As informações fornecidas são <strong>verdadeiras e precisas</strong></li>
                  <li>As fotos e documentos anexados são <strong>autênticos</strong> e relacionados ao problema relatado</li>
                  <li>Você é <strong>responsável pelo conteúdo</strong> da demanda enviada</li>
                  <li>Não utilizará a plataforma para enviar informações <strong>falsas, ofensivas ou difamatórias</strong></li>
                  <li>Compreende que a demanda será <strong>encaminhada aos órgãos competentes</strong> para análise e providências</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded mt-4">
                <p className="leading-relaxed text-base">
                  <strong>⚠️ Atenção:</strong> O envio de informações falsas ou enganosas pode ter consequências legais.
                </p>
              </div>
            </div>
          </section>

          {/* Privacidade e Sigilo */}
          <section className="mb-8">
            <div className="flex items-center mb-4">
              <Lock className="h-6 w-6 text-primary-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">2. Privacidade e Sigilo dos Seus Dados</h2>
            </div>

            <div className="space-y-4 text-gray-700">
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                <p className="leading-relaxed text-base mb-3">
                  <strong>🔒 Garantimos que:</strong>
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Seus dados pessoais serão tratados com <strong>total sigilo e confidencialidade</strong></li>
                  <li>Suas informações serão utilizadas <strong>exclusivamente</strong> para processar e acompanhar sua demanda</li>
                  <li>Não compartilharemos seus dados com terceiros <strong>sem sua autorização</strong></li>
                  <li>Seus dados estarão protegidos por <strong>medidas de segurança</strong> adequadas</li>
                  <li>Cumprimos rigorosamente a <strong>Lei Geral de Proteção de Dados (LGPD)</strong></li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">Dados Coletados:</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Nome, CPF, telefone e endereço</li>
                  <li>Descrição do problema e localização</li>
                  <li>Fotos e documentos anexados</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">Seus Direitos:</h3>
                <p className="leading-relaxed mb-2">
                  Você pode a qualquer momento:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Acessar seus dados pessoais</li>
                  <li>Solicitar correção de informações</li>
                  <li>Solicitar exclusão de seus dados</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
