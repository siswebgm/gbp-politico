import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  Ban,
  Banknote,
  Barcode,
  Building2,
  Calendar,
  CalendarClock,
  Check,
  ChevronLeft,
  Copy,
  DollarSign,
  FileText,
  Globe,
  MapPin,
  MoreVertical,
  Pencil,
  Phone,
  QrCode,
  RefreshCw,
} from 'lucide-react';
import { supabaseClient } from '../../../lib/supabase';
import { PaymentService } from '../../../services/PaymentService';
import { useToast } from '../../../components/ui/use-toast';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';

interface Empresa {
  uid: string;
  nome: string | null;
  apelido?: string | null;
  cpf_cnpj?: string | null;
  cnpj?: string | null;
  contato?: string | null;
  website?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  status?: string | null;
  ativa?: boolean | null;
  data_expiracao?: string | null;
  dia_vencimento?: number | null;
  created_at?: string;
}

interface Plano {
  id: string;
  nome: string;
  valor: number;
  periodo_dias: number;
  empresa_uid: string | null;
}

interface Assinatura {
  id: string;
  empresa_uid: string;
  plano_id: string | null;
  status: string;
  data_inicio: string | null;
  data_vencimento: string | null;
  data_fim?: string | null;
}

interface Pagamento {
  id: string;
  valor: number;
  tipo_pagamento: string;
  status: 'pending' | 'paid' | 'cancelled' | 'failed' | 'overdue';
  data_vencimento: string | null;
  data_pagamento: string | null;
  gateway_url: string | null;
  created_at?: string;
}

const statusPagamento: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pendente', cls: 'bg-yellow-100 text-yellow-800' },
  overdue: { label: 'Vencido', cls: 'bg-red-100 text-red-800' },
  paid: { label: 'Pago', cls: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelado', cls: 'bg-gray-100 text-gray-600' },
  failed: { label: 'Falhou', cls: 'bg-red-100 text-red-700' },
};

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtData = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('pt-BR') : '—';

const inputCls =
  'mt-1 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white';
const labelCls = 'text-xs font-medium text-gray-600 dark:text-gray-300';

export default function EmpresaDetalhes() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [plano, setPlano] = useState<Plano | null>(null);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);

  const [gerando, setGerando] = useState<'pix' | 'boleto' | null>(null);
  const [qrCode, setQrCode] = useState<{ encodedImage: string; payload: string } | null>(null);
  const [verificandoId, setVerificandoId] = useState<string | null>(null);

  const [modalDesbloqueio, setModalDesbloqueio] = useState(false);
  const [dataDesbloqueio, setDataDesbloqueio] = useState('');
  const [desbloqueando, setDesbloqueando] = useState(false);

  const [modalBaixa, setModalBaixa] = useState<Pagamento | 'sem' | null>(null);
  const [dataBaixa, setDataBaixa] = useState('');
  const [baixando, setBaixando] = useState(false);

  const [modalBloqueio, setModalBloqueio] = useState(false);
  const [motivoBloqueio, setMotivoBloqueio] = useState<'pagamento' | 'inativo'>('pagamento');
  const [bloqueando, setBloqueando] = useState(false);

  const [planoNovoId, setPlanoNovoId] = useState('');
  const [criandoAssinatura, setCriandoAssinatura] = useState(false);

  // Dados faltantes exigidos para criar assinatura (CPF/CNPJ etc.)
  const [modalDados, setModalDados] = useState(false);
  const [formDados, setFormDados] = useState({ cpf_cnpj: '', contato: '' });
  const [salvandoDados, setSalvandoDados] = useState(false);
  const [salvandoVenc, setSalvandoVenc] = useState(false);

  const carregar = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const { data: emp, error: empError } = await supabaseClient
        .from('gbp_empresas')
        .select('*')
        .eq('uid', uid)
        .maybeSingle();
      if (empError) throw empError;
      setEmpresa(emp as Empresa | null);

      const [assRes, planosRes] = await Promise.all([
        supabaseClient
          .from('gbp_assinaturas')
          .select('*')
          .eq('empresa_uid', uid)
          .order('data_inicio', { ascending: false }),
        supabaseClient.from('gbp_planos').select('*').order('valor'),
      ]);

      const assinaturas = (assRes.data || []) as Assinatura[];
      const assAtual = assinaturas[0] || null;
      setAssinatura(assAtual);
      setPlanos((planosRes.data || []) as Plano[]);

      if (assAtual?.plano_id) {
        const p = (planosRes.data || []).find(
          (pl: Plano) => pl.id === assAtual.plano_id
        );
        setPlano(p || null);
      } else {
        setPlano(null);
      }

      if (assinaturas.length > 0) {
        const ids = assinaturas.map((a) => a.id);
        const { data: pags } = await supabaseClient
          .from('gbp_pagamentos')
          .select('*')
          .in('assinatura_id', ids)
          .order('data_vencimento', { ascending: false });
        setPagamentos((pags || []) as Pagamento[]);
      } else {
        setPagamentos([]);
      }
    } catch (e) {
      console.error('Erro ao carregar empresa:', e);
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar os dados da empresa.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [uid, toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const emAberto = useMemo(
    () =>
      pagamentos.filter(
        (p) => p.status === 'pending' || p.status === 'overdue'
      ),
    [pagamentos]
  );
  const totalEmAberto = useMemo(
    () => emAberto.reduce((s, p) => s + (p.valor || 0), 0),
    [emAberto]
  );
  const totalPago = useMemo(
    () =>
      pagamentos
        .filter((p) => p.status === 'paid')
        .reduce((s, p) => s + (p.valor || 0), 0),
    [pagamentos]
  );

  const statusEmpresa = (emp: Empresa) => {
    if (emp.ativa === false)
      return { label: 'Inativa', cls: 'bg-gray-200 text-gray-600' };
    const expirada =
      !!emp.data_expiracao &&
      new Date(emp.data_expiracao).getTime() < Date.now();
    if (emp.status === 'active' && !expirada)
      return { label: 'Ativa', cls: 'bg-green-100 text-green-800' };
    return { label: 'Bloqueada', cls: 'bg-red-100 text-red-800' };
  };

  const gerarCobranca = async (tipo: 'pix' | 'boleto') => {
    if (!assinatura) return;
    if (!plano) {
      toast({
        title: 'Assinatura sem plano',
        description: 'Vincule um plano antes de gerar cobranças.',
        variant: 'destructive',
      });
      return;
    }
    const pendente = emAberto.find((p) => p.tipo_pagamento === tipo);
    if (pendente) {
      toast({
        title: `Já existe cobrança ${tipo === 'pix' ? 'PIX' : 'boleto'} em aberto`,
        description: `Vencimento ${fmtData(pendente.data_vencimento)} — ${fmtBRL(pendente.valor)}.`,
      });
      if (pendente.gateway_url) window.open(pendente.gateway_url, '_blank');
      return;
    }

    setGerando(tipo);
    setQrCode(null);
    try {
      const doc = (empresa?.cpf_cnpj || empresa?.cnpj || '').replace(/\D/g, '');
      const result = await PaymentService.generatePayment(
        assinatura.id,
        tipo,
        0,
        doc || undefined,
        empresa?.dia_vencimento || undefined
      );

      if (result.existing) {
        if (result.paymentUrl) window.open(result.paymentUrl, '_blank');
        toast({ title: 'Cobrança existente reutilizada' });
      } else if (tipo === 'pix' && result.qrCode) {
        setQrCode({
          encodedImage: result.qrCode,
          payload: result.pixCopyPaste || '',
        });
        toast({ title: 'QR Code PIX gerado' });
      } else if (result.paymentUrl) {
        window.open(result.paymentUrl, '_blank');
        toast({ title: 'Boleto gerado', description: 'Aberto em nova aba.' });
      }
      await carregar();
    } catch (e: any) {
      toast({
        title: 'Erro ao gerar cobrança',
        description: e?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setGerando(null);
    }
  };

  const verificarPagamento = async (pagamentoId: string) => {
    setVerificandoId(pagamentoId);
    try {
      const r = await PaymentService.checkPaymentStatus(pagamentoId);
      toast({
        title: 'Status verificado',
        description: `Status no Asaas: ${r?.statusAsaas || 'desconhecido'}`,
      });
      await carregar();
    } catch (e: any) {
      toast({
        title: 'Erro ao verificar',
        description: e?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setVerificandoId(null);
    }
  };

  const copiar = (texto: string) => {
    navigator.clipboard.writeText(texto);
    toast({ title: 'Copiado para a área de transferência' });
  };

  const abrirDesbloqueio = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setDataDesbloqueio(d.toISOString().slice(0, 10));
    setModalDesbloqueio(true);
  };

  const abrirBaixa = (p: Pagamento | null) => {
    setModalBaixa(p ?? 'sem');
    setDataBaixa(new Date().toISOString().slice(0, 10));
  };

  const confirmarBaixa = async () => {
    if (modalBaixa === null || !dataBaixa) return;
    setBaixando(true);
    try {
      if (modalBaixa === 'sem') {
        // Sem cobrança gerada: registra o recebimento direto no banco
        if (!assinatura) {
          toast({
            title: 'Sem assinatura',
            description: 'Crie uma assinatura para registrar a baixa.',
            variant: 'destructive',
          });
          return;
        }
        const hoje = new Date();
        const dia = Math.min(Math.max(empresa?.dia_vencimento || 20, 1), 28);
        const venc = proximaDataVencimento(
          dia,
          new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        );
        const { error } = await supabaseClient.from('gbp_pagamentos').insert({
          assinatura_id: assinatura.id,
          valor: plano?.valor || 0,
          tipo_pagamento: 'outros',
          status: 'paid',
          data_vencimento: venc.toISOString(),
          data_pagamento: new Date(`${dataBaixa}T12:00:00`).toISOString(),
        });
        if (error) throw error;
        toast({
          title: 'Pagamento registrado',
          description: `${fmtBRL(plano?.valor || 0)} marcado como recebido por outro meio.`,
        });
      } else {
        await PaymentService.baixarPagamento(modalBaixa.id, dataBaixa);
        toast({
          title: 'Baixa realizada',
          description: `Cobrança de ${fmtBRL(modalBaixa.valor)} marcada como paga (recebimento por outro meio).`,
        });
      }
      setModalBaixa(null);
      await carregar();
    } catch (e: any) {
      toast({
        title: 'Erro ao dar baixa',
        description: e?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setBaixando(false);
    }
  };

  const confirmarDesbloqueio = async () => {
    if (!empresa || !dataDesbloqueio) return;
    setDesbloqueando(true);
    try {
      const expira = new Date(`${dataDesbloqueio}T23:59:59`).toISOString();
      const { error } = await supabaseClient
        .from('gbp_empresas')
        .update({ status: 'active', ativa: true, data_expiracao: expira })
        .eq('uid', empresa.uid);
      if (error) throw error;
      toast({
        title: 'Prazo prorrogado',
        description: `Empresa liberada até ${fmtData(expira)}.`,
      });
      setModalDesbloqueio(false);
      await carregar();
    } catch (e: any) {
      toast({
        title: 'Erro ao prorrogar',
        description: e?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setDesbloqueando(false);
    }
  };

  const abrirBloqueio = () => {
    setMotivoBloqueio('pagamento');
    setModalBloqueio(true);
  };

  const confirmarBloqueio = async () => {
    if (!empresa) return;
    setBloqueando(true);
    try {
      // pagamento: status 'blocked' → usuário cai em /bloqueado para pagar
      // inativo:  ativa=false + status 'inactive' → /encerrado (vínculo encerrado)
      const patch =
        motivoBloqueio === 'pagamento'
          ? { status: 'blocked' }
          : { ativa: false, status: 'inactive' };
      const { error } = await supabaseClient
        .from('gbp_empresas')
        .update(patch)
        .eq('uid', empresa.uid);
      if (error) throw error;
      toast({
        title: 'Empresa bloqueada',
        description:
          motivoBloqueio === 'pagamento'
            ? 'Usuários serão direcionados para a página de regularização.'
            : 'Vínculo encerrado — usuários não poderão acessar o sistema.',
      });
      setModalBloqueio(false);
      await carregar();
    } catch (e: any) {
      toast({
        title: 'Erro ao bloquear',
        description: e?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setBloqueando(false);
    }
  };

  const criarAssinatura = async (docOverride?: string) => {
    if (!empresa || !planoNovoId) return;
    const doc = String(
      docOverride ?? empresa.cpf_cnpj ?? empresa.cnpj ?? ''
    ).replace(/\D/g, '');
    if (!doc || (doc.length !== 11 && doc.length !== 14)) {
      // Em vez de só reclamar, abre o modal para preencher os dados que faltam
      setFormDados({
        cpf_cnpj: empresa.cpf_cnpj || empresa.cnpj || '',
        contato: empresa.contato || '',
      });
      setModalDados(true);
      return;
    }
    setCriandoAssinatura(true);
    try {
      await PaymentService.createSubscription(empresa.uid, planoNovoId, doc);
      toast({ title: 'Assinatura criada com sucesso' });
      await carregar();
    } catch (e: any) {
      toast({
        title: 'Erro ao criar assinatura',
        description: e?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setCriandoAssinatura(false);
    }
  };

  // Formata enquanto digita: 000.000.000-00 (CPF) ou 00.000.000/0000-00 (CNPJ)
  const maskCpfCnpj = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 14);
    if (d.length <= 11) {
      return d
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return d
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  };

  // Salva os dados faltantes na empresa e continua a criação da assinatura
  const confirmarDados = async () => {
    if (!empresa) return;
    const doc = formDados.cpf_cnpj.replace(/\D/g, '');
    if (doc.length !== 11 && doc.length !== 14) {
      toast({
        title: 'CPF/CNPJ inválido',
        description: 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).',
        variant: 'destructive',
      });
      return;
    }
    setSalvandoDados(true);
    try {
      const tel = formDados.contato.trim() || empresa.contato || null;
      const { error } = await supabaseClient
        .from('gbp_empresas')
        .update({ cpf_cnpj: formDados.cpf_cnpj.trim(), contato: tel })
        .eq('uid', empresa.uid);
      if (error) throw error;
      setModalDados(false);
      // Segue direto com a criação da assinatura usando o documento informado
      await criarAssinatura(doc);
    } catch (e: any) {
      toast({
        title: 'Erro ao salvar dados',
        description: e?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSalvandoDados(false);
    }
  };

  // Altera o dia de vencimento da empresa (vale para as próximas cobranças)
  const alterarVencimento = async (dia: number) => {
    if (!empresa || dia === empresa.dia_vencimento) return;
    const anterior = empresa.dia_vencimento;
    setEmpresa({ ...empresa, dia_vencimento: dia });
    setSalvandoVenc(true);
    try {
      const { error } = await supabaseClient
        .from('gbp_empresas')
        .update({ dia_vencimento: dia })
        .eq('uid', empresa.uid);
      if (error) throw error;
      toast({ title: `Vencimento alterado para dia ${dia}` });
    } catch (e: any) {
      setEmpresa({ ...empresa, dia_vencimento: anterior });
      toast({
        title: 'Erro ao alterar vencimento',
        description: e?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSalvandoVenc(false);
    }
  };

  // Próxima data de vencimento a partir do dia de cobrança da empresa
  const proximaDataVencimento = (dia: number, base = new Date()) => {
    const v = new Date(base.getFullYear(), base.getMonth(), dia, 23, 59, 59);
    if (v.getTime() <= base.getTime()) v.setMonth(v.getMonth() + 1);
    return v;
  };

  // Assinatura de controle interno (sem Asaas): permite dar baixa manual
  // em clientes que pagam por fora. O CPF pode ser cadastrado depois para
  // gerar cobranças reais.
  const criarAssinaturaLocal = async () => {
    if (!empresa || !planoNovoId) return;
    setSalvandoDados(true);
    try {
      const dia = empresa.dia_vencimento || 20;
      const vencimento = proximaDataVencimento(dia);
      const dataFim = proximaDataVencimento(
        dia,
        new Date(vencimento.getTime() + 24 * 60 * 60 * 1000)
      );
      const { error } = await supabaseClient.from('gbp_assinaturas').insert({
        empresa_uid: empresa.uid,
        plano_id: planoNovoId,
        status: 'pending',
        data_inicio: new Date().toISOString(),
        data_fim: dataFim.toISOString(),
        data_vencimento: vencimento.toISOString(),
        dias_tolerancia: 10,
      });
      if (error) throw error;
      setModalDados(false);
      toast({
        title: 'Assinatura criada (controle interno)',
        description:
          'Sem CPF não é possível gerar cobrança no Asaas, mas já dá para registrar baixa manual. O CPF pode ser informado depois.',
      });
      await carregar();
    } catch (e: any) {
      toast({
        title: 'Erro ao criar assinatura',
        description: e?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSalvandoDados(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="flex flex-col bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="flex-1 py-6 px-4">
          <Button variant="outline" onClick={() => navigate('/app/admin/credenciados')} className="gap-2">
            <ChevronLeft className="h-4 w-4" /> Voltar
          </Button>
          <p className="mt-6 text-sm text-gray-500">Empresa não encontrada.</p>
        </div>
      </div>
    );
  }

  const st = statusEmpresa(empresa);
  const doc = empresa.cpf_cnpj || empresa.cnpj;

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex-1 py-2 md:py-6 px-2 md:px-4 flex flex-col">
        <div className="flex flex-col space-y-4 flex-1">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/app/admin/credenciados')}
              className="shrink-0 px-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="shrink-0 h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight truncate">
                  {empresa.nome || empresa.apelido || 'Sem nome'}
                </h1>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>
                  {st.label}
                </span>
                {emAberto.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800">
                    {emAberto.length} em aberto
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {empresa.cidade}
                {empresa.estado ? `/${empresa.estado}` : ''}
                {empresa.created_at && ` • Cliente desde ${fmtData(empresa.created_at)}`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    className="gap-2"
                    onClick={() =>
                      navigate(`/app/admin/credenciados?editar=${empresa.uid}`)
                    }
                  >
                    <Pencil className="h-4 w-4" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2" onClick={abrirDesbloqueio}>
                    <CalendarClock className="h-4 w-4" /> Prorrogar acesso
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 text-red-600 focus:text-red-600"
                    onClick={abrirBloqueio}
                  >
                    <Ban className="h-4 w-4" /> Bloquear
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Cards de resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">Pagamentos em aberto</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {emAberto.length}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{fmtBRL(totalEmAberto)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total pago</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {fmtBRL(totalPago)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {pagamentos.filter((p) => p.status === 'paid').length} cobrança(s)
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">Plano atual</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-1 truncate">
                {plano?.nome || '—'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {plano ? fmtBRL(plano.valor) + '/mês' : 'Sem plano'}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">Vencimento</p>
              <div className="flex items-center mt-1">
                <span className="text-lg font-bold text-gray-900 dark:text-white mr-1">
                  Dia
                </span>
                <select
                  value={empresa.dia_vencimento || 20}
                  onChange={(e) => alterarVencimento(Number(e.target.value))}
                  disabled={salvandoVenc}
                  title="Alterar dia de vencimento"
                  className="text-lg font-bold text-gray-900 dark:text-white bg-transparent cursor-pointer rounded px-0.5 -ml-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              {empresa.data_expiracao && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Expira: {fmtData(empresa.data_expiracao)}
                </p>
              )}
            </div>
          </div>

          {/* Dados cadastrais */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Dados cadastrais
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
              <div>
                <p className={labelCls}>Nome</p>
                <p className="text-gray-900 dark:text-white">{empresa.nome || '—'}</p>
              </div>
              <div>
                <p className={labelCls}>Apelido / Nome fantasia</p>
                <p className="text-gray-900 dark:text-white">{empresa.apelido || '—'}</p>
              </div>
              <div>
                <p className={labelCls}>CPF/CNPJ</p>
                <p className="text-gray-900 dark:text-white flex items-center gap-1">
                  {doc || '—'}
                  {doc && (
                    <button onClick={() => copiar(doc)} title="Copiar">
                      <Copy className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </p>
              </div>
              <div>
                <p className={labelCls}>Telefone</p>
                <p className="text-gray-900 dark:text-white flex items-center gap-1">
                  {empresa.contato ? (
                    <>
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      {empresa.contato}
                    </>
                  ) : (
                    '—'
                  )}
                </p>
              </div>
              <div>
                <p className={labelCls}>Website</p>
                <p className="text-gray-900 dark:text-white flex items-center gap-1">
                  {empresa.website ? (
                    <>
                      <Globe className="h-3.5 w-3.5 text-gray-400" />
                      <a
                        href={empresa.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate"
                      >
                        {empresa.website}
                      </a>
                    </>
                  ) : (
                    '—'
                  )}
                </p>
              </div>
              <div>
                <p className={labelCls}>Endereço</p>
                <p className="text-gray-900 dark:text-white flex items-center gap-1">
                  {empresa.logradouro ? (
                    <>
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      {empresa.logradouro}
                      {empresa.cep ? ` • CEP ${empresa.cep}` : ''}
                    </>
                  ) : (
                    '—'
                  )}
                </p>
              </div>
              <div>
                <p className={labelCls}>Cidade / UF</p>
                <p className="text-gray-900 dark:text-white">
                  {empresa.cidade || '—'}
                  {empresa.estado ? ` / ${empresa.estado}` : ''}
                </p>
              </div>
              <div>
                <p className={labelCls}>Status do sistema</p>
                <p className="text-gray-900 dark:text-white">{empresa.status || '—'}</p>
              </div>
              <div>
                <p className={labelCls}>Empresa ativa</p>
                <p className="text-gray-900 dark:text-white">
                  {empresa.ativa === false ? 'Não (vínculo encerrado)' : 'Sim'}
                </p>
              </div>
            </div>
          </div>

          {/* Cobranças */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Cobranças
              </h2>
              {assinatura ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      className="gap-2"
                      disabled={gerando !== null || !plano}
                      onClick={() => gerarCobranca('pix')}
                    >
                      {gerando === 'pix' ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <QrCode className="h-4 w-4" />
                      )}
                      Gerar PIX
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2"
                      disabled={gerando !== null || !plano}
                      onClick={() => gerarCobranca('boleto')}
                    >
                      {gerando === 'boleto' ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      Gerar Boleto
                    </DropdownMenuItem>
                    {emAberto.length > 0 && <DropdownMenuSeparator />}
                    {emAberto.map((p) => (
                      <DropdownMenuItem
                        key={`baixa-${p.id}`}
                        className="gap-2 text-emerald-700 focus:text-emerald-700"
                        onClick={() => abrirBaixa(p)}
                      >
                        <Banknote className="h-4 w-4" />
                        Dar baixa
                      </DropdownMenuItem>
                    ))}
                    {emAberto.length === 0 && assinatura && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-2 text-emerald-700 focus:text-emerald-700"
                          onClick={() => abrirBaixa(null)}
                        >
                          <Banknote className="h-4 w-4" />
                          Registrar pagamento (outros meios)
                        </DropdownMenuItem>
                      </>
                    )}
                    {emAberto.map((p) => (
                      <DropdownMenuItem
                        key={`verificar-${p.id}`}
                        className="gap-2"
                        disabled={verificandoId === p.id}
                        onClick={() => verificarPagamento(p.id)}
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${
                            verificandoId === p.id ? 'animate-spin' : ''
                          }`}
                        />
                        Verificar status
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                    value={planoNovoId}
                    onChange={(e) => setPlanoNovoId(e.target.value)}
                  >
                    <option value="">Escolher plano...</option>
                    {planos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} — {p.valor > 0 ? fmtBRL(p.valor) : 'Sob consulta'}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    onClick={() => criarAssinatura()}
                    disabled={!planoNovoId || criandoAssinatura}
                    className="gap-1.5"
                  >
                    {criandoAssinatura && (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    )}
                    Criar assinatura
                  </Button>
                </div>
              )}
            </div>

            {!assinatura && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                Empresa sem assinatura — crie uma para gerar cobranças.
              </p>
            )}
            {assinatura && !plano && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                Assinatura sem plano vinculado — edite a empresa para vincular um plano.
              </p>
            )}

            {/* QR Code PIX gerado */}
            {qrCode && (
              <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col sm:flex-row gap-4 items-start">
                <img
                  src={`data:image/png;base64,${qrCode.encodedImage}`}
                  alt="QR Code PIX"
                  className="w-36 h-36 rounded-lg border border-gray-200 dark:border-gray-700"
                />
                <div className="flex-1 w-full">
                  <label className={labelCls}>Código PIX (copia e cola)</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      value={qrCode.payload}
                      readOnly
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm dark:text-white"
                    />
                    <Button variant="outline" size="sm" onClick={() => copiar(qrCode.payload)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <button
                    onClick={() => setQrCode(null)}
                    className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                  >
                    Fechar QR Code
                  </button>
                </div>
              </div>
            )}

            {/* Histórico */}
            {pagamentos.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">
                Nenhuma cobrança registrada para esta empresa.
              </p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {pagamentos.map((p) => {
                  const pst = statusPagamento[p.status] || statusPagamento.pending;
                  return (
                    <div key={p.id} className="py-3 flex items-center gap-3">
                      <span className="shrink-0">
                        {p.tipo_pagamento === 'pix' ? (
                          <QrCode className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Barcode className="h-4 w-4 text-emerald-600" />
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {fmtBRL(p.valor)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pst.cls}`}>
                            {pst.label}
                          </span>
                          <span className="text-xs text-gray-400 uppercase">
                            {p.tipo_pagamento}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Vencimento: {fmtData(p.data_vencimento)}
                          {p.data_pagamento && ` • Pago em ${fmtData(p.data_pagamento)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {p.status === 'paid' && (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: desbloqueio temporário */}
      <Dialog open={modalDesbloqueio} onOpenChange={setModalDesbloqueio}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Prorrogar acesso — {empresa.nome}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            A empresa ficará com acesso <strong>ativo até a data escolhida</strong>.
            Após esse prazo, se houver pendências, ela volta a ser bloqueada
            automaticamente.
          </p>
          <div>
            <label className={labelCls}>Prorrogar até</label>
            <input
              type="date"
              className={inputCls}
              value={dataDesbloqueio}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDataDesbloqueio(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setModalDesbloqueio(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarDesbloqueio}
              disabled={desbloqueando || !dataDesbloqueio}
              className="gap-1.5"
            >
              <CalendarClock className="h-3.5 w-3.5" />
              {desbloqueando ? 'Prorrogando...' : 'Prorrogar acesso'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: baixa manual (pago por outro meio) */}
      <Dialog open={modalBaixa !== null} onOpenChange={() => setModalBaixa(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-emerald-600" />
              {modalBaixa === 'sem' ? 'Registrar pagamento' : 'Baixar cobrança'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {modalBaixa === 'sem' ? (
              <>
                Confirma que{' '}
                <strong>{fmtBRL(plano?.valor || 0)}</strong> foi recebido por
                outro meio neste mês? Será registrado como pago — nada é gerado
                no Asaas.
              </>
            ) : (
              <>
                Confirma que{' '}
                <strong>{fmtBRL(modalBaixa?.valor || 0)}</strong> foi recebido
                por outro meio (dinheiro, transferência etc.)? O Asaas será
                informado e a cobrança marcada como paga.
              </>
            )}
          </p>
          <div>
            <label className={labelCls}>Data do recebimento</label>
            <input
              type="date"
              className={inputCls}
              value={dataBaixa}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDataBaixa(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setModalBaixa(null)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarBaixa}
              disabled={baixando || !dataBaixa}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              <Banknote className="h-3.5 w-3.5" />
              {baixando ? 'Baixando...' : 'Confirmar baixa'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: dados obrigatórios p/ criar assinatura */}
      <Dialog open={modalDados} onOpenChange={setModalDados}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-indigo-600" />
              Dados da empresa
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Para criar a assinatura <strong>com cobrança no Asaas</strong>{' '}
            precisamos do <strong>CPF ou CNPJ</strong> de{' '}
            <strong>{empresa.nome}</strong>. Se o cliente paga por fora e só
            precisa de controle interno, você pode pular — o CPF poderá ser
            cadastrado depois.
          </p>
          <div>
            <label className={labelCls}>CPF/CNPJ *</label>
            <input
              className={inputCls}
              value={formDados.cpf_cnpj}
              onChange={(e) =>
                setFormDados((f) => ({
                  ...f,
                  cpf_cnpj: maskCpfCnpj(e.target.value),
                }))
              }
              placeholder="000.000.000-00"
              inputMode="numeric"
            />
          </div>
          <div>
            <label className={labelCls}>Telefone</label>
            <input
              className={inputCls}
              value={formDados.contato}
              onChange={(e) =>
                setFormDados((f) => ({ ...f, contato: e.target.value }))
              }
              placeholder="(81) 99999-0000"
              inputMode="tel"
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setModalDados(false)}>
              Cancelar
            </Button>
            <Button
              variant="ghost"
              onClick={criarAssinaturaLocal}
              disabled={salvandoDados || criandoAssinatura}
              className="gap-1.5 text-gray-600"
            >
              Continuar sem CPF
            </Button>
            <Button
              onClick={confirmarDados}
              disabled={salvandoDados || criandoAssinatura}
              className="gap-1.5"
            >
              {salvandoDados || criandoAssinatura ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Criando...
                </>
              ) : (
                'Salvar e criar assinatura'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: bloquear empresa */}
      <Dialog open={modalBloqueio} onOpenChange={setModalBloqueio}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-600" />
              Bloquear empresa — {empresa?.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {(
              [
                {
                  key: 'pagamento' as const,
                  titulo: 'Falta de pagamento',
                  desc: 'Usuários serão direcionados à página de regularização para pagar e liberar o acesso.',
                },
                {
                  key: 'inativo' as const,
                  titulo: 'Empresa não é mais cliente',
                  desc: 'Encerra o vínculo (empresa inativa). Bloqueio silencioso: os usuários são desconectados e não veem a página de pagamento.',
                },
              ]
            ).map((op) => {
              const sel = motivoBloqueio === op.key;
              return (
                <button
                  key={op.key}
                  type="button"
                  onClick={() => setMotivoBloqueio(op.key)}
                  className={`w-full text-left border rounded-xl p-3 flex items-start gap-3 transition-colors ${
                    sel
                      ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/40'
                  }`}
                >
                  <span
                    className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      sel
                        ? 'bg-red-600 border-red-600'
                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500'
                    }`}
                  >
                    {sel && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <span>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {op.titulo}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {op.desc}
                    </p>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setModalBloqueio(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarBloqueio}
              disabled={bloqueando}
              className="gap-1.5"
            >
              <Ban className="h-3.5 w-3.5" />
              {bloqueando ? 'Bloqueando...' : 'Confirmar bloqueio'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
