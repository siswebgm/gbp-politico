import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Phone, MapPin, Calendar, FileText, Download, Plus, Mail, CreditCard, ArrowLeft } from 'lucide-react';
import { useVoters } from '../../hooks/useVoters';
import { generateVoterPDF } from '../../utils/pdfGenerator';
import { AttendanceHistory } from './components/AttendanceHistory';
import { AttendanceModal } from './components/AttendanceModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function VoterProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { voters } = useVoters();
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const voter = voters.data?.find((v) => v.id === Number(id));

  const handleDownloadPDF = () => {
    if (voter) {
      generateVoterPDF(voter);
    }
  };

  const handleBack = () => {
    navigate('/app/voters');
  };

  if (voters.isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!voter) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400">
        Eleitor não encontrado
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Ficha do Eleitor</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Informações detalhadas do eleitor
            </p>
          </div>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Baixar PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Personal Information */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Informações Pessoais
          </h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <User className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nome</p>
                <p className="text-base text-gray-900 dark:text-white">{voter.nome || '-'}</p>
              </div>
            </div>
            <div className="flex items-center">
              <CreditCard className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">CPF</p>
                <p className="text-base text-gray-900 dark:text-white">{voter.cpf || '-'}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Data de Nascimento</p>
                <p className="text-base text-gray-900 dark:text-white">
                  {voter.nascimento ? format(new Date(voter.nascimento), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Contato
          </h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <Phone className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Telefone</p>
                <p className="text-base text-gray-900 dark:text-white">{voter.telefone || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Electoral Information */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Informações Eleitorais
          </h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Título de Eleitor</p>
                <p className="text-base text-gray-900 dark:text-white">{voter.titulo || '-'}</p>
              </div>
            </div>
            <div className="flex items-center">
              <MapPin className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Zona/Seção</p>
                <p className="text-base text-gray-900 dark:text-white">
                  {voter.zona && voter.secao ? `${voter.zona}/${voter.secao}` : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Endereço
          </h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <MapPin className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Logradouro</p>
                <p className="text-base text-gray-900 dark:text-white">
                  {voter.logradouro ? `${voter.logradouro}, ${voter.numero || 'S/N'}` : '-'}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <MapPin className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Bairro</p>
                <p className="text-base text-gray-900 dark:text-white">{voter.bairro || '-'}</p>
              </div>
            </div>
            <div className="flex items-center">
              <MapPin className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Cidade/CEP</p>
                <p className="text-base text-gray-900 dark:text-white">
                  {voter.cidade ? `${voter.cidade} - ${voter.cep || 'CEP não informado'}` : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Section */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Histórico de Atendimentos
            </h3>
          </div>

          <AttendanceHistory voterId={voter.id} />
        </div>
      </div>

      <AttendanceModal
        isOpen={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
        voterId={voter.id}
      />
    </div>
  );
}