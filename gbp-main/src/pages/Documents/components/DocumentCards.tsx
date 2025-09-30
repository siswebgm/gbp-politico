import { FileText, BookOpen, FileSpreadsheet, DollarSign, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDocumentCounts } from '../../../hooks/useDocumentCounts';
import { useAuth } from '../../../providers/AuthProvider';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { useEffect, useState } from 'react';
import { supabaseClient } from '../../../lib/supabase';

interface EmpresaComPlano {
  uid: string;
  nome: string;
  plano?: string;
  // Outras propriedades necessárias
}

export function DocumentCards() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { company } = useCompanyStore();
  const [empresaComPlano, setEmpresaComPlano] = useState<EmpresaComPlano | null>(null);
  const { 
    oficiosCount, 
    projetosLeiCount, 
    requerimentosCount, 
    emendasCount, 
    demandasRuasCount,
    isLoading 
  } = useDocumentCounts();
  
  // Carrega os dados completos da empresa incluindo o plano
  useEffect(() => {
    async function carregarDadosEmpresa() {
      if (!company?.uid) return;
      
      try {
        const { data, error } = await supabaseClient
          .from('gbp_empresas')
          .select('*')
          .eq('uid', company.uid)
          .single();
          
        if (error) throw error;
        
        console.log('Dados completos da empresa:', data);
        setEmpresaComPlano(data);
      } catch (error) {
        console.error('Erro ao carregar dados da empresa:', error);
      }
    }
    
    carregarDadosEmpresa();
  }, [company?.uid]);
  
  // Planos que têm acesso ao módulo de Demandas Ruas
  const planosComAcesso = [
    'Inter 2.0', 
    'Pró Max 3.0', 
    'Básico Plus 0.4', 
    'Básico 1.0'
  ];
  
  // Verifica se o plano atual tem acesso ao módulo
  const temAcessoDemandasRuas = empresaComPlano?.plano ? planosComAcesso.includes(empresaComPlano.plano) : false;
  
  // Log para depuração
  console.log('Dados da empresa com plano:', empresaComPlano);
  console.log('Plano atual:', empresaComPlano?.plano);
  console.log('Tem acesso a Demandas Ruas?', temAcessoDemandasRuas);

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
    },
    {
      title: 'Demandas Ruas',
      description: 'Registro e acompanhamento de demandas urbanas',
      icon: AlertTriangle,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      gradientFrom: 'from-pink-500',
      gradientTo: 'to-pink-600',
      hoverBg: 'hover:bg-pink-50/80',
      count: demandasRuasCount,
      onClick: () => navigate('/app/documentos/demandas-ruas'),
      requerPlanoEspecifico: true
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {cards
        .filter(card => {
          // Filtra por nível de acesso
          if (['Projetos de Lei', 'Requerimentos', 'Emendas Parlamentares'].includes(card.title)) {
            return user?.nivel_acesso === 'admin';
          }
          // Filtra por plano para o card de Demandas Ruas
          if (card.requerPlanoEspecifico) {
            return temAcessoDemandasRuas;
          }
          return true;
        })
        .map((card, index) => {
        const Icon = card.icon;
        return (
          <button
            key={index}
            onClick={card.onClick}
            className={`group relative flex flex-col p-4 sm:p-6 lg:p-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 text-left min-h-[200px] overflow-hidden ${card.hoverBg}`}
          >
            {/* Gradient decoration */}
            <div className={`absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-gradient-to-br ${card.gradientFrom} ${card.gradientTo} opacity-10 rounded-bl-full transform translate-x-6 sm:translate-x-8 -translate-y-6 sm:-translate-y-8`} />
            
            {/* Icon container */}
            <div className={`relative z-10 flex items-center justify-between mb-4 sm:mb-6`}>
              <div className={`p-2 sm:p-3 rounded-xl ${card.bgColor} backdrop-blur-sm ring-1 ring-black/5`}>
                <Icon className={`w-6 h-6 sm:w-8 sm:h-8 ${card.color}`} />
              </div>
              {/* Count badge */}
              {isLoading ? (
                <div className="h-6 sm:h-8 w-12 sm:w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              ) : (
                <span className={`flex items-center h-6 sm:h-8 px-3 sm:px-4 rounded-full ${card.bgColor} ${card.color} font-semibold text-sm ring-1 ring-black/5`}>
                  {card.count}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-gray-800 dark:group-hover:text-gray-200">
                {card.title}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300">
                {card.description}
              </p>
            </div>

            {/* Bottom decoration */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${card.bgColor}`} />
          </button>
        );
      })}
    </div>
  );
}
