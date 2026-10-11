import { useState } from 'react';
import { FileText, BookOpen, FileSpreadsheet, DollarSign, FolderPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDocumentCounts } from '../../../hooks/useDocumentCounts';
import { useAuth } from '../../../providers/AuthProvider';
import { useDocumentosPastas } from '../../../hooks/useDocumentosPastas';
import { NovaPastaModal } from './NovaPastaModal';
import { corPadrao, iconePadrao, pastaCores, pastaIcones } from './pastaConfig';

export function DocumentCards() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.nivel_acesso === 'admin';
  const { pastas, contagens } = useDocumentosPastas();
  const [novaPastaOpen, setNovaPastaOpen] = useState(false);
  const { 
    oficiosCount, 
    projetosLeiCount, 
    requerimentosCount, 
    emendasCount,
    isLoading 
  } = useDocumentCounts();

  const cards = [
    {
      title: 'Ofícios',
      description: 'Gerencie todos os ofícios do gabinete',
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-blue-600',
      hoverBg: 'hover:bg-blue-50/80',
      count: oficiosCount,
      onClick: () => navigate('/app/documentos/oficios')
    },
    {
      title: 'Projetos de Lei',
      description: 'Acompanhe e crie projetos de lei',
      icon: BookOpen,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      gradientFrom: 'from-emerald-500',
      gradientTo: 'to-emerald-600',
      hoverBg: 'hover:bg-emerald-50/80',
      count: projetosLeiCount,
      onClick: () => navigate('/app/documentos/projetos-lei')
    },
    {
      title: 'Requerimentos',
      description: 'Gerencie os requerimentos do gabinete',
      icon: FileSpreadsheet,
      color: 'text-violet-600',
      bgColor: 'bg-violet-50',
      gradientFrom: 'from-violet-500',
      gradientTo: 'to-violet-600',
      hoverBg: 'hover:bg-violet-50/80',
      count: requerimentosCount,
      onClick: () => navigate('/app/documentos/requerimentos')
    },
    {
      title: 'Emendas Parlamentares',
      description: 'Gerencie as emendas parlamentares',
      icon: DollarSign,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      gradientFrom: 'from-amber-500',
      gradientTo: 'to-amber-600',
      hoverBg: 'hover:bg-amber-50/80',
      count: emendasCount,
      onClick: () => navigate('/app/documentos/emendas-parlamentares')
    }
  ];

  return (
    <>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {/* Card para criar nova pasta — mesmo tamanho e estrutura dos demais */}
      {isAdmin && (
        <button
          onClick={() => setNovaPastaOpen(true)}
          className="group relative flex flex-col p-4 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all duration-300 min-h-[150px] overflow-hidden"
        >
          <div className="relative z-10 flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-50 ring-1 ring-black/5 transition-colors">
              <FolderPlus className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </div>
          </div>
          <div className="relative z-10 flex-1 flex flex-col justify-end">
            <h3 className="text-base sm:text-lg font-bold text-gray-600 dark:text-gray-300 group-hover:text-blue-600 mb-1 transition-colors">
              Nova pasta
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Organize documentos do seu jeito
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-50 transition-colors" />
        </button>
      )}
      {cards
        .filter(card => {
          // Filtra por nível de acesso
          if (['Projetos de Lei', 'Requerimentos', 'Emendas Parlamentares'].includes(card.title)) {
            return user?.nivel_acesso === 'admin';
          }
          return true;
        })
        .map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.title}
            onClick={card.onClick}
            className={`group relative flex flex-col p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 text-left min-h-[150px] overflow-hidden ${card.hoverBg}`}
          >
            {/* Gradient decoration */}
            <div className={`absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-gradient-to-br ${card.gradientFrom} ${card.gradientTo} opacity-10 rounded-bl-full transform translate-x-6 sm:translate-x-8 -translate-y-6 sm:-translate-y-8`} />
            
            {/* Icon container */}
            <div className={`relative z-10 flex items-center justify-between mb-3`}>
              <div className={`p-2 rounded-xl ${card.bgColor} backdrop-blur-sm ring-1 ring-black/5`}>
                <Icon className={`w-6 h-6 ${card.color}`} />
              </div>
              {/* Count badge */}
              {isLoading ? (
                <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              ) : (
                <span className={`flex items-center h-6 px-3 rounded-full ${card.bgColor} ${card.color} font-semibold text-sm ring-1 ring-black/5`}>
                  {card.count}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-gray-800 dark:group-hover:text-gray-200">
                {card.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300">
                {card.description}
              </p>
            </div>

            {/* Bottom decoration */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${card.bgColor}`} />
          </button>
        );
      })}

      {/* Pastas personalizadas — somente admin, no mesmo grid dos demais cards */}
      {isAdmin &&
        pastas.map((pasta) => {
          const cor = pastaCores[pasta.cor] || pastaCores[corPadrao];
          const Icone = pastaIcones[pasta.icone]?.icon || pastaIcones[iconePadrao].icon;
          return (
            <button
              key={pasta.uid}
              onClick={() => navigate(`/app/documentos/pastas/${pasta.uid}`)}
              className={`group relative flex flex-col p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 text-left min-h-[150px] overflow-hidden ${cor.hoverBg}`}
            >
              <div className={`absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-gradient-to-br ${cor.gradientFrom} ${cor.gradientTo} opacity-10 rounded-bl-full transform translate-x-6 sm:translate-x-8 -translate-y-6 sm:-translate-y-8`} />
              <div className="relative z-10 flex items-center justify-between mb-3">
                <div className={`p-2 rounded-xl ${cor.bg} backdrop-blur-sm ring-1 ring-black/5`}>
                  <Icone className={`w-6 h-6 ${cor.text}`} />
                </div>
                <span className={`flex items-center h-6 px-3 rounded-full ${cor.bg} ${cor.text} font-semibold text-sm ring-1 ring-black/5`}>
                  {contagens[pasta.uid] || 0}
                </span>
              </div>
              <div className="relative z-10 flex-1 flex flex-col">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1">
                  {pasta.nome}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {pasta.descricao || 'Pasta personalizada'}
                </p>
              </div>
              <div className={`absolute bottom-0 left-0 right-0 h-1 ${cor.bg}`} />
            </button>
          );
        })}
    </div>

    <NovaPastaModal open={novaPastaOpen} onClose={() => setNovaPastaOpen(false)} />
    </>
  );
}
