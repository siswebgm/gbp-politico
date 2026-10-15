import { useState, useEffect } from 'react';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { AffiliateService } from '../../../services/AffiliateService';
import { toast } from 'sonner';
import { Copy, Users, DollarSign, TrendingUp, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';

export default function AffiliateDashboard() {
  const { user } = useCompanyStore();
  const [loading, setLoading] = useState(true);
  const [afiliado, setAfiliado] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log('AffiliateDashboard montado. User:', user);

  useEffect(() => {
    console.log('User mudou:', user);
    if (user?.uid) {
      loadAffiliateData();
    } else {
      console.log('User não disponível, setando loading false');
      setLoading(false);
    }
  }, [user]);

  const loadAffiliateData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Carregando dados de afiliado para:', user.uid);

      // Cria ou busca afiliado
      const afiliadoData = await AffiliateService.createAffiliate(user.uid);
      console.log('Afiliado criado/buscar:', afiliadoData);
      setAfiliado(afiliadoData);

      // Busca estatísticas
      const statsData = await AffiliateService.getAffiliateStats(afiliadoData.id);
      console.log('Estatísticas:', statsData);
      setStats(statsData);
    } catch (error: any) {
      console.error('Erro ao carregar dados de afiliado:', error);
      setError(error?.message || 'Erro ao carregar dados');
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados de afiliado. Execute o SQL para criar as tabelas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyAffiliateLink = () => {
    const link = `${window.location.origin}/?ref=${afiliado.codigo_afiliado}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast({
      title: 'Link copiado',
      description: 'Link de afiliado copiado para a área de transferência',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !afiliado) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          {error || 'Não foi possível carregar os dados de afiliado'}
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Execute o SQL <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">sql/create_afiliados.sql</code> no banco de dados
        </p>
      </div>
    );
  }

  const affiliateLink = `${window.location.origin}/?ref=${afiliado.codigo_afiliado}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-purple-100 dark:border-purple-800">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Programa de Afiliados
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Ganhe comissões indicando nosso sistema para outros vereadores
        </p>
      </div>

      {/* Link de Afiliado */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-600" />
          Seu Link de Afiliado
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={affiliateLink}
            readOnly
            className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-mono text-sm"
          />
          <button
            onClick={copyAffiliateLink}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
          Compartilhe este link e ganhe {afiliado.comissao_percentual}% de comissão em cada assinatura
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Total Indicações</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats?.totalIndicacoes || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Confirmadas</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats?.indicacoesConfirmadas || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Total Comissões</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            R$ {stats?.totalComissoes?.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Saldo Disponível</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            R$ {stats?.saldoComissoes?.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>

      {/* Histórico de Indicações */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Histórico de Indicações
          </h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {stats?.indicacoes?.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              Nenhuma indicação ainda
            </div>
          ) : (
            stats?.indicacoes?.map((indicacao: any) => (
              <div key={indicacao.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${
                    indicacao.status === 'confirmed' ? 'bg-green-100 dark:bg-green-900/30' :
                    indicacao.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                    'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    {indicacao.status === 'confirmed' ? (
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : indicacao.status === 'pending' ? (
                      <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {indicacao.gbp_empresas?.nome || 'Empresa não identificada'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(indicacao.data_indicacao).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    indicacao.status === 'confirmed' ? 'text-green-600 dark:text-green-400' :
                    indicacao.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {indicacao.status === 'confirmed' ? `+ R$ ${indicacao.comissao_valor?.toFixed(2)}` :
                     indicacao.status === 'pending' ? 'Pendente' : 'Cancelado'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
