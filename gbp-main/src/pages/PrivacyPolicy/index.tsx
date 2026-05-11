import React from 'react';
import { Helmet } from 'react-helmet';
import { Shield, Users, Lock, Eye, Database, CheckCircle } from 'lucide-react';

const PrivacyPolicy = () => {
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <>
      <Helmet>
        <title>Política de Privacidade - GBP Político CRM</title>
        <meta name="description" content="Política de privacidade completa do GBP Político CRM em conformidade com a LGPD." />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="Política de Privacidade - GBP Político CRM" />
        <meta property="og:description" content="Proteção total dos seus dados em conformidade com a LGPD." />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        {/* Header */}
        <div className="bg-blue-900 text-white py-12 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-4">
              <Shield className="w-16 h-16 text-blue-300" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Política de Privacidade</h1>
            <p className="text-blue-200 text-lg">
              GBP Político CRM - Proteção e Transparência em Conformidade com a LGPD
            </p>
            <div className="mt-6 text-sm text-blue-300">
              <p>Última atualização: {currentDate}</p>
              <p>Versão: 2.9.18</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Introduction */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Users className="w-6 h-6 mr-2 text-blue-600" />
              Introdução
            </h2>
            <div className="prose prose-lg text-gray-700">
              <p className="mb-4">
                Bem-vindo ao <strong>GBP Político CRM</strong>! Esta Política de Privacidade descreve como 
                coletamos, usamos, armazenamos e protegemos suas informações pessoais em conformidade com a 
                <strong> Lei Geral de Proteção de Dados (LGPD)</strong> - Lei nº 13.709/2018.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                <p className="text-blue-800">
                  <strong>Nosso compromisso:</strong> Respeitar sua privacidade e garantir a segurança dos seus dados.
                </p>
              </div>
            </div>
          </section>

          {/* Data Collection */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Database className="w-6 h-6 mr-2 text-blue-600" />
              Dados Coletados
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="font-semibold text-gray-900">Dados Pessoais</h3>
                  <ul className="text-gray-600 text-sm mt-2 space-y-1">
                    <li>• Nome completo</li>
                    <li>• CPF (com criptografia)</li>
                    <li>• Data de nascimento</li>
                    <li>• Endereço completo</li>
                    <li>• Telefone/WhatsApp</li>
                    <li>• E-mail</li>
                  </ul>
                </div>
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-gray-900">Dados Políticos</h3>
                  <ul className="text-gray-600 text-sm mt-2 space-y-1">
                    <li>• Preferências políticas</li>
                    <li>• Histórico de votação</li>
                    <li>• Posicionamento ideológico</li>
                    <li>• Partido político de preferência</li>
                  </ul>
                </div>
              </div>
              <div className="space-y-4">
                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="font-semibold text-gray-900">Dados de Geolocalização</h3>
                  <ul className="text-gray-600 text-sm mt-2 space-y-1">
                    <li>• Endereço residencial</li>
                    <li>• Zona e seção eleitoral</li>
                    <li>• Coordenadas geográficas</li>
                    <li>• Bairro e cidade</li>
                  </ul>
                </div>
                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="font-semibold text-gray-900">Dados Sensíveis</h3>
                  <ul className="text-gray-600 text-sm mt-2 space-y-1">
                    <li>• Opinião política (com consentimento)</li>
                    <li>• Convicções filosóficas</li>
                    <li>• Informações sobre origem social</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Legal Basis */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Lock className="w-6 h-6 mr-2 text-blue-600" />
              Base Legal para Tratamento
            </h2>
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">1. Consentimento Explícito</h3>
                <p className="text-green-800 text-sm">
                  Você autoriza o tratamento de dados específicos. Consentimento pode ser revogado a qualquer momento.
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">2. Legítimo Interesse</h3>
                <p className="text-blue-800 text-sm">
                  Gestão de campanhas políticas, organização de atividades, comunicação com eleitores.
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-2">3. Cumprimento de Obrigação Legal</h3>
                <p className="text-purple-800 text-sm">
                  Obrigações eleitorais, prestação de contas, fiscalização política.
                </p>
              </div>
            </div>
          </section>

          {/* User Rights */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Eye className="w-6 h-6 mr-2 text-blue-600" />
              Seus Direitos (LGPD)
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Acesso</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Solicitar cópia de seus dados
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Correção</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Atualizar dados desatualizados
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Eliminação</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Solicitar exclusão de dados
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Portabilidade</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Transferir dados para outro serviço
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Oposição</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Opor-se a tratamento específico
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Revisão</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Revisar decisões automatizadas
                </p>
              </div>
            </div>
          </section>

          {/* Security Measures */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Shield className="w-6 h-6 mr-2 text-blue-600" />
              Como Protegemos Seus Dados
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Criptografia</h4>
                    <p className="text-gray-600 text-sm">
                      Dados criptografados em trânsito (TLS 1.3) e em repouso (AES-256)
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Controle de Acesso</h4>
                    <p className="text-gray-600 text-sm">
                      Autenticação multifator e controle de acesso baseado em função
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Backup e Recuperação</h4>
                    <p className="text-gray-600 text-sm">
                      Backups diários criptografados com retenção de 30 dias
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Monitoramento</h4>
                    <p className="text-gray-600 text-sm">
                      Monitoramento 24/7 com detecção de anomalias
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contato e Exercício de Direitos</h2>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded">
              <h3 className="font-semibold text-blue-900 mb-3">Canais de Contato</h3>
              <div className="space-y-2 text-blue-800">
                <p><strong>E-mail:</strong> jmapps.tec@gmail.com</p>
                <p><strong>Telefone:</strong> (81) 97914-6126</p>
                <p><strong>Site:</strong> https://seu-dominio.com/privacidade</p>
                <p><strong>DPO:</strong> jmapps.tec@gmail.com</p>
              </div>
              <div className="mt-4 text-blue-700 text-sm">
                <p><strong>Prazo de resposta:</strong> Até 15 dias para solicitações simples</p>
                <p><strong>Horário de atendimento:</strong> Segunda a Sexta, 9h às 18h</p>
              </div>
            </div>
          </section>

          {/* Important Notes */}
          <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-yellow-900 mb-3">⚠️ Aspectos Políticos Específicos</h2>
            <div className="space-y-2 text-yellow-800">
              <p>• <strong>Nunca vendemos dados pessoais</strong> para terceiros</p>
              <p>• <strong>Nunca compartilhamos dados</strong> sem autorização explícita</p>
              <p>• <strong>Respeitamos a diversidade</strong> de opiniões políticas</p>
              <p>• <strong>Transparência total</strong> em metodologias e fontes</p>
              <p>• <strong>Compromisso democrático</strong> com liberdade de expressão</p>
            </div>
          </section>

          {/* Footer */}
          <section className="text-center text-gray-600 py-8">
            <p className="mb-2">
              Ao usar o GBP Político CRM, você concorda com esta Política de Privacidade.
            </p>
            <p className="text-sm">
              Esta política foi elaborada com atenção especial aos aspectos políticos e eleitorais, 
              garantindo conformidade total com a LGPD e legislação eleitoral brasileira.
            </p>
          </section>
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicy;
