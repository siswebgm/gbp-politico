import { useState } from 'react';
import { ArrowUpRight, FileText, BookOpen, FileSpreadsheet, DollarSign, FolderPlus } from 'lucide-react';
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
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-blue-600',
      shadow: 'shadow-blue-500/25',
      badge: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
      ringHover: 'hover:ring-blue-200 dark:hover:ring-blue-700',
      count: oficiosCount,
      onClick: () => navigate('/app/documentos/oficios')
    },
    {
      title: 'Projetos de Lei',
      description: 'Acompanhe e crie projetos de lei',
      icon: BookOpen,
      gradientFrom: 'from-emerald-500',
      gradientTo: 'to-emerald-600',
      shadow: 'shadow-emerald-500/25',
      badge: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
      ringHover: 'hover:ring-emerald-200 dark:hover:ring-emerald-700',
      count: projetosLeiCount,
      onClick: () => navigate('/app/documentos/projetos-lei')
    },
    {
      title: 'Requerimentos',
      description: 'Gerencie os requerimentos do gabinete',
      icon: FileSpreadsheet,
      gradientFrom: 'from-violet-500',
      gradientTo: 'to-violet-600',
      shadow: 'shadow-violet-500/25',
      badge: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300',
      ringHover: 'hover:ring-violet-200 dark:hover:ring-violet-700',
      count: requerimentosCount,
      onClick: () => navigate('/app/documentos/requerimentos')
    },
    {
      title: 'Emendas Parlamentares',
      description: 'Gerencie as emendas parlamentares',
      icon: DollarSign,
      gradientFrom: 'from-amber-500',
      gradientTo: 'to-amber-600',
      shadow: 'shadow-amber-500/25',
      badge: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
      ringHover: 'hover:ring-amber-200 dark:hover:ring-amber-700',
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
          className="group relative flex flex-col items-center justify-center text-center gap-2 p-5 bg-white/60 dark:bg-gray-800/60 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 min-h-[150px]"
        >
          <div className="p-3 rounded-2xl bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
            <FolderPlus className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-600 dark:text-gray-300 group-hover:text-blue-600 transition-colors">
              Nova pasta
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Organize documentos do seu jeito
            </p>
          </div>
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
            className={`group relative flex flex-col p-5 bg-white dark:bg-gray-800 rounded-2xl ring-1 ring-gray-100 dark:ring-gray-700/60 hover:shadow-xl hover:-translate-y-1 ${card.ringHover} transition-all duration-300 text-left min-h-[150px]`}
          >
            {/* Tile do ícone em gradiente sólido */}
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-2xl bg-gradient-to-br ${card.gradientFrom} ${card.gradientTo} text-white shadow-lg ${card.shadow}`}>
                <Icon className="w-6 h-6" />
              </div>
              {/* Count badge */}
              {isLoading ? (
                <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              ) : (
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${card.badge}`}>
                  {card.count}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="mt-auto pt-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {card.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {card.description}
              </p>
            </div>

            {/* Seta que aparece no hover */}
            <ArrowUpRight className="absolute bottom-4 right-4 w-5 h-5 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 group-hover:text-gray-500 dark:group-hover:text-gray-300 transition-all duration-300" />
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
              className="group relative flex flex-col p-5 bg-white dark:bg-gray-800 rounded-2xl ring-1 ring-gray-100 dark:ring-gray-700/60 hover:shadow-xl hover:-translate-y-1 hover:ring-gray-200 dark:hover:ring-gray-600 transition-all duration-300 text-left min-h-[150px]"
            >
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${cor.gradientFrom} ${cor.gradientTo} text-white shadow-lg`}>
                  <Icone className="w-6 h-6" />
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${cor.bg} ${cor.text}`}>
                  {contagens[pasta.uid] || 0}
                </span>
              </div>
              <div className="mt-auto pt-4">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {pasta.nome}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {pasta.descricao || 'Pasta personalizada'}
                </p>
              </div>
              <ArrowUpRight className="absolute bottom-4 right-4 w-5 h-5 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 group-hover:text-gray-500 dark:group-hover:text-gray-300 transition-all duration-300" />
            </button>
          );
        })}
    </div>

    <NovaPastaModal open={novaPastaOpen} onClose={() => setNovaPastaOpen(false)} />
    </>
  );
}
