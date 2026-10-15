import { useState, useEffect } from 'react';
import { supabaseClient as supabase } from '../../../lib/supabase';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { useAuth } from '../../../providers/AuthProvider';
import { 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  QrCode,
  Download,
  Copy,
  Check
} from 'lucide-react';
import { toast } from '../../../components/ui/use-toast';

type Plano = {
  id: string;
  nome: string;
  descricao: string;
  valor: number;
  periodo_dias: number;
};

type Assinatura = {
  id: string;
  status: 'active' | 'pending' | 'cancelled' | 'overdue';
  data_inicio: string;
  data_fim: string;
  data_vencimento: string;
  gbp_planos: Plano;
};

type Pagamento = {
  id: string;
  valor: number;
  tipo_pagamento: 'pix' | 'boleto';
  status: 'pending' | 'paid' | 'cancelled' | 'failed';
  data_vencimento: string;
  data_pagamento: string | null;
  gateway_url: string | null;
  gateway_id: string;
};

const statusConfig = {
  active: { label: 'Ativa', color: 'green', icon: CheckCircle },
  pending: { label: 'Pendente', color: 'yellow', icon: Clock },
  cancelled: { label: 'Cancelada', color: 'gray', icon: XCircle },
  overdue: { label: 'Atrasada', color: 'red', icon: AlertCircle },
  paid: { label: 'Pago', color: 'green', icon: CheckCircle },
  failed: { label: 'Falhou', color: 'red', icon: XCircle },
} as const;

export function FinancialSettings() {
  const company = useCompanyStore((state) => state.company);
  const { user } = useAuth();
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPayment, setGeneratingPayment] = useState(false);
  const [creatingSubscription, setCreatingSubscription] = useState(false);
  const [qrCode, setQrCode] = useState<{ encodedImage: string; payload: string } | null>(null);
  const [desconto, setDesconto] = useState<number>(0);

  const isAdmin = (user?.nivel_acesso || '').toLowerCase() === 'admin' || (user?.cargo || '').toLowerCase() === 'admin';

  useEffect(() => {
    loadData();
  }, [company?.uid]);

  const loadData = async () => {
    if (!company?.uid) return;
    setLoading(true);

    try {
      // Busca planos disponíveis
      const { data: planosData } = await supabase
        .from('gbp_planos')
        .select('*')
        .order('valor', { ascending: true });

      // Ordena: planos com valor > 0 primeiro (por valor), depois valor = 0 (sob consulta)
      const sortedPlanos = (planosData || []).sort((a, b) => {
        if (a.valor === 0 && b.valor === 0) return 0;
        if (a.valor === 0) return 1;
        if (b.valor === 0) return -1;
        return a.valor - b.valor;
      });

      setPlanos(sortedPlanos);

      // Busca assinatura ativa da empresa
      const { data: assinaturaData } = await supabase
        .from('gbp_assinaturas')
        .select('*, gbp_planos(*)')
        .eq('empresa_uid', company.uid)
        .order('data_inicio', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (assinaturaData) {
        setAssinatura(assinaturaData);

        // Busca pagamentos dessa assinatura
        const { data: pagamentosData } = await supabase
          .from('gbp_pagamentos')
          .select('*')
          .eq('assinatura_id', assinaturaData.id)
          .order('data_vencimento', { ascending: false });

        setPagamentos(pagamentosData || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayment = async () => {
    if (!assinatura || !isAdmin) return;
    setGeneratingPayment(true);

    try {
      const response = await fetch('http://localhost:3300/api/generate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assinaturaId: assinatura.id,
          tipoPagamento: 'pix',
          descontoPercentual: desconto
        })
      });

      if (!response.ok) throw new Error('Erro ao gerar cobrança');

      const result = await response.json();

      if (result.qrCode) {
        setQrCode(result.qrCode);
        toast({
          title: 'Cobrança gerada',
          description: desconto > 0
            ? `QR Code PIX gerado com desconto de ${desconto}%`
            : 'QR Code PIX gerado com sucesso',
        });
      }

      // Recarrega lista de pagamentos
      await loadData();
    } catch (error) {
      console.error('Erro ao gerar pagamento:', error);
      toast({
        title: 'Erro ao gerar cobrança',
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setGeneratingPayment(false);
    }
  };

  const handleCopyPix = (payload: string) => {
    navigator.clipboard.writeText(payload);
    toast({
      title: 'Copiado',
      description: 'Código PIX copiado para a área de transferência',
    });
  };

  const handleCreateSubscription = async (planoId: string) => {
    if (!company?.uid || !isAdmin) return;
    setCreatingSubscription(true);

    try {
      const response = await fetch('http://localhost:3300/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaUid: company.uid, planoId })
      });

      if (!response.ok) throw new Error('Erro ao criar assinatura');

      const data = await response.json();
      setAssinatura(data.assinatura);

      toast({
        title: 'Assinatura criada',
        description: 'Assinatura criada com sucesso. Agora você pode gerar cobranças.',
      });

      await loadData();
    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      toast({
        title: 'Erro ao criar assinatura',
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setCreatingSubscription(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const StatusBadge = ({ status }: { status: keyof typeof statusConfig }) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    
    const colorClasses = {
      green: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
      yellow: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
      red: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
      gray: 'bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800',
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClasses[config.color]}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!assinatura) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          {isAdmin && planos.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Escolha um plano para começar:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {planos.map((plano) => (
                  <div
                    key={plano.id}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-blue-300 dark:hover:border-blue-600 transition-colors flex flex-col"
                  >
                    <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{plano.nome}</h5>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4">
                      {plano.valor > 0 ? formatCurrency(plano.valor) : 'Sob consulta'}
                      {plano.valor > 0 && <span className="text-sm font-normal text-gray-500 dark:text-gray-400">/mês</span>}
                    </p>
                    <ul className="space-y-2 mb-6 flex-1">
                      {plano.descricao ? plano.descricao.split(',').map((recurso, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed text-left">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="break-words text-left">{recurso.trim()}</span>
                        </li>
                      )) : (
                        <li className="text-sm text-gray-500 dark:text-gray-400 text-left">Sem descrição</li>
                      )}
                    </ul>
                    <button
                      onClick={() => handleCreateSubscription(plano.id)}
                      disabled={creatingSubscription || plano.valor === 0}
                      className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creatingSubscription ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                          Criando...
                        </>
                      ) : plano.valor === 0 ? (
                        'Entre em contato'
                      ) : (
                        'Assinar plano'
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {isAdmin && planos.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nenhum plano disponível. Entre em contato com o suporte.
            </p>
          )}
          
          {!isAdmin && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Entre em contato com o administrador para criar uma assinatura.
            </p>
          )}

          <p className="text-gray-500 dark:text-gray-400 mt-6">Nenhuma assinatura encontrada para esta empresa.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card da Assinatura Atual */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-5 border border-blue-100 dark:border-blue-800">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {assinatura.gbp_planos.nome}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Assinatura {assinatura.status === 'active' ? 'ativa' : 'inativa'}
            </p>
          </div>
          <StatusBadge status={assinatura.status} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Valor mensal</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatCurrency(assinatura.gbp_planos.valor)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Início</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(assinatura.data_inicio)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Vencimento</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(assinatura.data_vencimento)}
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={handleGeneratePayment}
            disabled={generatingPayment}
            className="mt-5 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingPayment ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <QrCode className="w-4 h-4" />
                Gerar nova cobrança
              </>
            )}
          </button>
        )}

        {isAdmin && (
          <div className="mt-3 flex items-center gap-2">
            <label className="text-xs text-gray-500 dark:text-gray-400">Desconto (%):</label>
            <input
              type="number"
              min="0"
              max="100"
              value={desconto}
              onChange={(e) => setDesconto(Math.min(100, Math.max(0, Number(e.target.value))))}
              className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        )}
      </div>

      {/* QR Code PIX */}
      {qrCode && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            QR Code PIX
          </h4>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="flex-shrink-0">
              <img
                src={`data:image/png;base64,${qrCode.encodedImage}`}
                alt="QR Code PIX"
                className="w-40 h-40 rounded-lg border border-gray-200 dark:border-gray-700"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Código PIX (copie e cole no app do banco)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={qrCode.payload}
                  readOnly
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
                <button
                  onClick={() => handleCopyPix(qrCode.payload)}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Copiar código"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setQrCode(null)}
                className="mt-3 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Fechar QR Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Histórico de Pagamentos */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Histórico de Pagamentos
        </h4>

        {pagamentos.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum pagamento registrado.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Data Vencimento
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Data Pagamento
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {pagamentos.map((pagamento) => (
                    <tr key={pagamento.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {formatDate(pagamento.data_vencimento)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(pagamento.valor)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 uppercase">
                        {pagamento.tipo_pagamento}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={pagamento.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {pagamento.data_pagamento ? formatDate(pagamento.data_pagamento) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {pagamento.gateway_url && pagamento.status === 'pending' && (
                          <a
                            href={pagamento.gateway_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <Download className="w-3.5 h-3.5" />
                            {pagamento.tipo_pagamento === 'pix' ? 'QR Code' : 'Boleto'}
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
