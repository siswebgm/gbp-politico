import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  LogOut,
  CheckCircle2,
  QrCode,
  Barcode,
  Lock,
  ShieldCheck,
  ArrowRight,
  BarChart3,
  MessageCircle,
  Users,
  FileText,
  DollarSign,
  Calendar,
  Zap
} from "lucide-react";
import { supabaseClient } from "../../lib/supabase";
import { useAuth } from "../../providers/AuthProvider";
import { PaymentService } from "../../services/PaymentService";
import { useToast } from "../../components/ui/use-toast";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "../../components/ui/dialog";
export default function Blocked() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [empresa, setEmpresa] = useState(null);
  const [assinatura, setAssinatura] = useState(null);
  const [planoNome, setPlanoNome] = useState("");
  const [planoValor, setPlanoValor] = useState(null);
  const [pagamento, setPagamento] = useState(null);
  const [pagamentos, setPagamentos] = useState([]);
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [qrCode, setQrCode] = useState(null);
  const [pixCopyPaste, setPixCopyPaste] = useState(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(null);
  const [gerandoItem, setGerandoItem] = useState(null);
  const [pixRef, setPixRef] = useState(null);
  const [checking, setChecking] = useState(false);
  const [liberada, setLiberada] = useState(false);
  const [modalDoc, setModalDoc] = useState(false);
  const [docInput, setDocInput] = useState("");
  const [tipoPendente, setTipoPendente] = useState(null);
  const [docPagamentoId, setDocPagamentoId] = useState(null);
  const [salvandoDoc, setSalvandoDoc] = useState(false);
  const mesRef = (p) => p.data_vencimento ? new Date(p.data_vencimento).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  }) : "\u2014";
  const carregar = useCallback(async () => {
    if (!user?.uid) {
      navigate("/login", { replace: true });
      return;
    }
    localStorage.setItem("user_uid", user.uid);
    const { data: usuario } = await supabaseClient.from("gbp_usuarios").select("empresa_uid").eq("uid", user.uid).single();
    const empresaUid = usuario?.empresa_uid || localStorage.getItem("active_empresa_uid") || localStorage.getItem("empresa_uid");
    if (!empresaUid) {
      navigate("/login", { replace: true });
      return;
    }
    const { data: emp } = await supabaseClient.from("gbp_empresas").select("uid, nome, status, data_expiracao, cpf_cnpj, ativa").eq("uid", empresaUid).single();
    if (emp && (emp.ativa === false || emp.status === "inactive")) {
      localStorage.removeItem("gbp_user");
      localStorage.removeItem("empresa_uid");
      localStorage.removeItem("active_empresa_uid");
      localStorage.removeItem("user_uid");
      await supabaseClient.auth.signOut().catch(() => {
      });
      navigate("/encerrado", { replace: true });
      return;
    }
    if (emp) {
      setEmpresa(emp);
      setCpfCnpj(emp.cpf_cnpj || "");
      const expirada = !!emp.data_expiracao && new Date(emp.data_expiracao).getTime() < Date.now();
      if (emp.status === "active" && !expirada) {
        setLiberada(true);
        setTimeout(() => navigate("/app", { replace: true }), 2e3);
      }
    }
    const { data: assList } = await supabaseClient.from("gbp_assinaturas").select("id, plano_id, status, data_vencimento").eq("empresa_uid", empresaUid).order("data_inicio", { ascending: false });
    const ass = assList?.[0];
    if (ass) {
      setAssinatura(ass);
      if (ass.plano_id) {
        const { data: plano } = await supabaseClient.from("gbp_planos").select("nome, valor").eq("id", ass.plano_id).maybeSingle();
        if (plano) {
          setPlanoNome(plano.nome || "");
          setPlanoValor(plano.valor ?? null);
        }
      }
    }
    const assIds = (assList || []).map((a) => a.id);
    if (assIds.length > 0) {
      const { data: pags } = await supabaseClient.from("gbp_pagamentos").select("id, assinatura_id, status, tipo_pagamento, valor, gateway_url, data_vencimento").in("assinatura_id", assIds).in("status", ["pending", "overdue"]).order("data_vencimento", { ascending: true });
      const lista = pags || [];
      setPagamentos(lista);
      if (lista.length > 0) setPagamento(lista[0]);
      else setPagamento(null);
    }
  }, [navigate, user?.uid]);
  useEffect(() => {
    carregar().finally(() => setLoading(false));
    const interval = setInterval(carregar, 2e4);
    return () => clearInterval(interval);
  }, [carregar]);
  const docValido = (doc) => {
    const d = doc.replace(/\D/g, "");
    return d.length === 11 || d.length === 14;
  };
  const maskCpfCnpj = (v) => {
    const d = v.replace(/\D/g, "").slice(0, 14);
    if (d.length <= 11) {
      return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return d.replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})$/, "$1-$2");
  };
  const handleGerar = async (tipo) => {
    if (!assinatura) {
      toast({ title: "Assinatura n\xE3o encontrada", variant: "destructive" });
      return;
    }
    const alvo = pagamentos[0] || pagamento;
    if (alvo) {
      await handleGerarItem(alvo, tipo);
      return;
    }
    if (!docValido(cpfCnpj)) {
      setDocInput(cpfCnpj || "");
      setTipoPendente(tipo);
      setDocPagamentoId(null);
      setModalDoc(true);
      return;
    }
    await gerarPagamento(tipo, cpfCnpj);
  };
  const gerarPagamento = async (tipo, doc) => {
    if (!assinatura) return;
    setGenerating(tipo);
    try {
      const result = await PaymentService.generatePayment(
        assinatura.id,
        tipo,
        0,
        doc || void 0
      );
      setPagamento(result.pagamento);
      if (tipo === "pix") {
        setQrCode(result.qrCode || null);
        setPixCopyPaste(result.pixCopyPaste || null);
      } else {
        setQrCode(null);
        setPixCopyPaste(null);
        if (result.paymentUrl) window.open(result.paymentUrl, "_blank");
      }
      toast({
        title: result.existing ? "Cobran\xE7a existente reaberta" : "Cobran\xE7a gerada",
        description: "Realize o pagamento para liberar o acesso."
      });
      await carregar();
    } catch (error) {
      toast({
        title: "Erro ao gerar cobran\xE7a",
        description: error?.message || "Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setGenerating(null);
    }
  };
  const gerarPagamentoItem = async (pag, tipo, doc) => {
    if (!assinatura) return;
    setGerandoItem(`${pag.id}:${tipo}`);
    try {
      const result = await PaymentService.generatePayment(
        assinatura.id,
        tipo,
        0,
        doc || void 0,
        void 0,
        pag.id
      );
      if (tipo === "pix") {
        setQrCode(result.qrCode || null);
        setPixCopyPaste(result.pixCopyPaste || null);
        setPixRef(mesRef(pag));
      } else {
        setQrCode(null);
        setPixCopyPaste(null);
        setPixRef(null);
        if (result.paymentUrl) window.open(result.paymentUrl, "_blank");
      }
      toast({
        title: result.existing ? "Cobran\xE7a reaberta" : `Cobran\xE7a de ${mesRef(pag)} gerada`,
        description: tipo === "pix" ? "Escaneie o QR Code para pagar esta mensalidade." : "Boleto aberto em nova aba."
      });
      await carregar();
    } catch (error) {
      toast({
        title: "Erro ao gerar cobran\xE7a",
        description: error?.message || "Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setGerandoItem(null);
    }
  };
  const handleGerarItem = async (pag, tipo) => {
    if (!assinatura && !pag.assinatura_id) {
      toast({ title: "Assinatura n\xE3o encontrada", variant: "destructive" });
      return;
    }
    if (pag.gateway_url && tipo !== "pix") {
      window.open(pag.gateway_url, "_blank");
      return;
    }
    if (!docValido(cpfCnpj)) {
      setDocInput(cpfCnpj || "");
      setTipoPendente(tipo);
      setDocPagamentoId(pag.id);
      setModalDoc(true);
      return;
    }
    await gerarPagamentoItem(pag, tipo, cpfCnpj);
  };
  const confirmarDoc = async () => {
    if (!empresa) return;
    if (!docValido(docInput)) {
      toast({
        title: "CPF/CNPJ inv\xE1lido",
        description: "Informe um CPF (11 d\xEDgitos) ou CNPJ (14 d\xEDgitos).",
        variant: "destructive"
      });
      return;
    }
    setSalvandoDoc(true);
    try {
      const { error } = await supabaseClient.from("gbp_empresas").update({ cpf_cnpj: docInput.trim() }).eq("uid", empresa.uid);
      if (error) throw error;
      setCpfCnpj(docInput.trim());
      setModalDoc(false);
      if (tipoPendente) {
        const alvo = docPagamentoId ? pagamentos.find((x) => x.id === docPagamentoId) : void 0;
        if (alvo) await gerarPagamentoItem(alvo, tipoPendente, docInput.trim());
        else await gerarPagamento(tipoPendente, docInput.trim());
      }
      setDocPagamentoId(null);
    } catch (e) {
      toast({
        title: "Erro ao salvar dados",
        description: e?.message || "Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setSalvandoDoc(false);
    }
  };
  const handleVerificar = async () => {
    const pendentes = pagamentos.length > 0 ? pagamentos : pagamento ? [pagamento] : [];
    if (pendentes.length === 0) return;
    setChecking(true);
    try {
      let pagos = 0;
      let ultimoStatus = "";
      for (const p of pendentes) {
        try {
          const result = await PaymentService.checkPaymentStatus(p.id);
          ultimoStatus = result?.statusAsaas || ultimoStatus;
          if (result?.pagamento?.status === "paid") pagos++;
        } catch {
        }
      }
      await carregar();
      if (pagos > 0) {
        const restantes = pendentes.length - pagos;
        toast({
          title: restantes === 0 ? "Pagamentos confirmados!" : `${pagos} pagamento(s) confirmado(s)`,
          description: restantes === 0 ? "Seu acesso ser\xE1 liberado." : `Ainda restam ${restantes} pend\xEAncia(s) para liberar o acesso.`
        });
      } else {
        toast({
          title: "Pagamento ainda n\xE3o confirmado",
          description: `Status atual: ${ultimoStatus || "aguardando"}. O PIX pode levar alguns segundos.`
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao verificar",
        description: error?.message || "Tente novamente em instantes.",
        variant: "destructive"
      });
    } finally {
      setChecking(false);
    }
  };
  const handleCopy = async () => {
    if (!pixCopyPaste) return;
    await navigator.clipboard.writeText(pixCopyPaste);
    setCopied(true);
    setTimeout(() => setCopied(false), 2e3);
  };
  const handleSair = async () => {
    localStorage.removeItem("gbp_user");
    localStorage.removeItem("empresa_uid");
    localStorage.removeItem("active_empresa_uid");
    localStorage.removeItem("user_uid");
    await supabaseClient.auth.signOut().catch(() => {
    });
    navigate("/login", { replace: true });
    window.location.reload();
  };
  const primeiroNome = user?.nome?.split(" ")[0] || empresa?.nome || "";
  if (loading) {
    return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100" }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" }));
  }
  return /* @__PURE__ */ React.createElement("div", { className: "h-dvh overflow-y-auto bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 flex flex-col" }, /* @__PURE__ */ React.createElement("div", { className: "w-full flex-1 bg-white grid md:grid-cols-5" }, /* @__PURE__ */ React.createElement("aside", { className: "order-2 md:order-1 md:col-span-2 bg-gradient-to-b from-blue-950 via-blue-900 to-blue-700 text-white p-6 md:p-10 flex flex-col md:justify-center" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement(
    "img",
    {
      src: "https://8a9fa808ea18d066080b81b1741b3afc.cdn.bubble.io/f1683656885399x827876060621908000/gbp%20politico.png",
      alt: "GBP Pol\xEDtico",
      className: "h-9 w-9 rounded-full object-cover ring-2 ring-white/20"
    }
  ), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-bold leading-tight" }, "GBP Pol\xEDtico"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-blue-200" }, "Gest\xE3o pol\xEDtica inteligente"))), /* @__PURE__ */ React.createElement("h2", { className: "mt-6 md:mt-24 text-xl md:text-3xl font-bold leading-snug" }, "Seu acesso \xE9 importante para continuar", " ", /* @__PURE__ */ React.createElement("span", { className: "text-cyan-300" }, "fazendo a diferen\xE7a.")), /* @__PURE__ */ React.createElement("ul", { className: "mt-6 md:mt-8 grid grid-cols-2 md:grid-cols-1 gap-x-4 gap-y-3 md:space-y-4 text-sm" }, [
    { icon: BarChart3, titulo: "Organize seus eleitores", desc: "Tudo em um s\xF3 lugar" },
    { icon: MessageCircle, titulo: "Comunique com agilidade", desc: "Envio de mensagens" },
    { icon: Users, titulo: "Gerencie atendimentos", desc: "Mais resultados no seu mandato" },
    { icon: ShieldCheck, titulo: "Plataforma segura", desc: "Seus dados protegidos" }
  ].map(({ icon: Icon, titulo, desc }) => /* @__PURE__ */ React.createElement("li", { key: titulo, className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "shrink-0 h-9 w-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center" }, /* @__PURE__ */ React.createElement(Icon, { className: "h-4 w-4 text-cyan-300" })), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { className: "block font-medium" }, titulo), /* @__PURE__ */ React.createElement("span", { className: "block text-xs text-blue-200" }, desc))))), /* @__PURE__ */ React.createElement("div", { className: "mt-auto pt-6 md:pt-8" }, /* @__PURE__ */ React.createElement("div", { className: "border border-white/15 rounded-xl p-4 flex items-center gap-3 text-xs text-blue-100" }, /* @__PURE__ */ React.createElement(Lock, { className: "h-4 w-4 shrink-0 text-cyan-300" }), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-x-6 gap-y-1" }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", { className: "text-white" }, "+500"), " clientes em todo o Brasil"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", { className: "text-white" }, "+8 anos"), " de experi\xEAncia"))))), /* @__PURE__ */ React.createElement("section", { className: "order-1 md:order-2 md:col-span-3 px-4 py-6 md:p-10 flex flex-col justify-center" }, /* @__PURE__ */ React.createElement("div", { className: "w-full max-w-xl mx-auto space-y-4 md:space-y-5" }, liberada ? /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex flex-col items-center justify-center text-center space-y-4 py-10" }, /* @__PURE__ */ React.createElement(CheckCircle2, { className: "h-16 w-16 text-green-500" }), /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-bold text-gray-900" }, "Acesso liberado!"), /* @__PURE__ */ React.createElement("p", { className: "text-gray-600" }, "Redirecionando para o sistema...")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-4" }, /* @__PURE__ */ React.createElement("span", { className: "shrink-0 h-10 w-10 rounded-full bg-red-100 flex items-center justify-center" }, /* @__PURE__ */ React.createElement(AlertTriangle, { className: "h-5 w-5 text-red-600" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h1", { className: "text-lg font-bold text-gray-900 leading-tight" }, "Acesso bloqueado"), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold text-red-600" }, "Assinatura vencida"), empresa?.nome && /* @__PURE__ */ React.createElement("p", { className: "mt-0.5 text-xs font-medium text-gray-500" }, "Empresa: ", empresa.nome), /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-sm text-gray-600" }, "Ol\xE1", primeiroNome ? `, ${primeiroNome}` : "", ". Efetue o pagamento da sua assinatura para liberar o acesso \xE0 plataforma e continuar utilizando todos os recursos."))), /* @__PURE__ */ React.createElement("div", { className: "border border-gray-200 rounded-2xl grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-200" }, /* @__PURE__ */ React.createElement("div", { className: "p-4 text-center" }, /* @__PURE__ */ React.createElement(FileText, { className: "h-5 w-5 mx-auto text-blue-500" }), /* @__PURE__ */ React.createElement("p", { className: "mt-1.5 text-xs text-gray-500" }, "Plano contratado"), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold text-gray-900" }, planoNome || "\u2014")), /* @__PURE__ */ React.createElement("div", { className: "p-4 text-center" }, /* @__PURE__ */ React.createElement(DollarSign, { className: "h-5 w-5 mx-auto text-blue-500" }), /* @__PURE__ */ React.createElement("p", { className: "mt-1.5 text-xs text-gray-500" }, "Valor da assinatura"), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold text-gray-900" }, planoValor != null ? planoValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "\u2014")), /* @__PURE__ */ React.createElement("div", { className: "p-4 text-center" }, /* @__PURE__ */ React.createElement(Calendar, { className: "h-5 w-5 mx-auto text-red-500" }), /* @__PURE__ */ React.createElement("p", { className: "mt-1.5 text-xs text-gray-500" }, "Vencimento"), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold text-red-600" }, (() => {
    const venc = empresa?.data_expiracao || pagamentos[0]?.data_vencimento || assinatura?.data_vencimento;
    return venc ? new Date(venc).toLocaleDateString("pt-BR") : "\u2014";
  })()))), (qrCode || pixCopyPaste) && /* @__PURE__ */ React.createElement("div", { className: "border border-blue-200 rounded-2xl p-5 space-y-3 text-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-gray-700 flex items-center justify-center gap-2" }, /* @__PURE__ */ React.createElement(QrCode, { className: "h-4 w-4 text-blue-600" }), " Escaneie ou copie o c\xF3digo PIX"), pixRef && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 capitalize" }, "referente a ", pixRef), qrCode && /* @__PURE__ */ React.createElement(
    "img",
    {
      src: `data:image/png;base64,${qrCode}`,
      alt: "QR Code PIX",
      className: "h-44 w-44 mx-auto"
    }
  ), pixCopyPaste && /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: handleCopy, className: "w-full" }, copied ? /* @__PURE__ */ React.createElement(Check, { className: "h-4 w-4 mr-2" }) : /* @__PURE__ */ React.createElement(Copy, { className: "h-4 w-4 mr-2" }), copied ? "Copiado!" : "Copiar c\xF3digo PIX")), pagamentos.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "border border-amber-200 bg-amber-50/60 rounded-2xl p-4 space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold text-gray-800" }, pagamentos.length === 1 ? "1 pend\xEAncia em aberto" : `${pagamentos.length} pend\xEAncias em aberto`), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold text-amber-700" }, "Total", " ", pagamentos.reduce((s, p) => s + (p.valor || 0), 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }))), /* @__PURE__ */ React.createElement("div", { className: "divide-y divide-amber-100" }, pagamentos.map((p) => {
    const mes = mesRef(p);
    const gerandoPix = gerandoItem === `${p.id}:pix`;
    const gerandoBoleto = gerandoItem === `${p.id}:boleto`;
    const ocupado = gerandoItem !== null || generating !== null;
    return /* @__PURE__ */ React.createElement("div", { key: p.id, className: "py-3 px-1 text-sm sm:flex sm:items-center sm:gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-1 items-center justify-between gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-2 text-gray-700 min-w-0" }, p.tipo_pagamento === "pix" ? /* @__PURE__ */ React.createElement(QrCode, { className: "h-4 w-4 text-blue-500 shrink-0" }) : /* @__PURE__ */ React.createElement(Barcode, { className: "h-4 w-4 text-gray-500 shrink-0" }), /* @__PURE__ */ React.createElement("span", { className: "capitalize truncate" }, mes), p.status === "overdue" && /* @__PURE__ */ React.createElement("span", { className: "text-xs font-medium text-red-600" }, "vencido")), /* @__PURE__ */ React.createElement("span", { className: "font-medium text-gray-900 shrink-0" }, p.valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    }))), /* @__PURE__ */ React.createElement("div", { className: "mt-2 flex items-center gap-2 sm:mt-0 sm:shrink-0" }, p.gateway_url ? /* @__PURE__ */ React.createElement(
      "a",
      {
        href: p.gateway_url,
        target: "_blank",
        rel: "noopener noreferrer",
        className: "flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 transition-colors"
      },
      "Pagar ",
      /* @__PURE__ */ React.createElement(ExternalLink, { className: "h-3 w-3" })
    ) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => handleGerarItem(p, "pix"),
        disabled: ocupado,
        className: "flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      },
      gerandoPix ? /* @__PURE__ */ React.createElement(RefreshCw, { className: "h-3.5 w-3.5 animate-spin" }) : /* @__PURE__ */ React.createElement(QrCode, { className: "h-3.5 w-3.5" }),
      "Pagar PIX"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => handleGerarItem(p, "boleto"),
        disabled: ocupado,
        title: "Gerar boleto para esta mensalidade",
        className: "flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:border-blue-300 hover:text-blue-700 disabled:opacity-60"
      },
      gerandoBoleto ? /* @__PURE__ */ React.createElement(RefreshCw, { className: "h-3.5 w-3.5 animate-spin" }) : /* @__PURE__ */ React.createElement(Barcode, { className: "h-3.5 w-3.5" }),
      "Boleto"
    ))));
  })), pagamentos.length > 1 && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-amber-700" }, "O acesso \xE9 liberado quando todas as pend\xEAncias estiverem quitadas.")), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleGerar("pix"),
      disabled: generating !== null,
      className: "w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl px-5 py-4 flex items-center gap-4 shadow-lg shadow-blue-600/25 transition-all"
    },
    /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 512 512", className: "h-8 w-8 shrink-0", fill: "currentColor", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M242.4 292.5C247.8 287.1 257.1 287.1 262.5 292.5L339.5 369.5C353.7 383.7 372.6 391.5 392.6 391.5H407.7L310.6 488.6C280.3 518.1 231.1 518.1 200.8 488.6L103.3 391.2H112.6C132.6 391.2 151.5 383.4 165.7 369.2L242.4 292.5zM262.5 218.9C257.1 224.3 247.8 224.3 242.4 218.9L165.7 142.2C151.5 128 132.6 120.2 112.6 120.2H103.3L200.7 22.76C231.1-7.586 280.3-7.586 310.6 22.76L407.8 119.9H392.6C372.6 119.9 353.7 127.7 339.5 141.9L262.5 218.9zM112.6 142.7C126.4 142.7 139.1 148.3 149.7 158.1L226.4 234.8C233.6 241.1 243 245.6 252.5 245.6C261.9 245.6 271.3 241.1 278.5 234.8L355.5 157.8C365.3 148.1 378.8 142.5 392.6 142.5H430.3L488.6 200.8C518.9 231.1 518.9 280.3 488.6 310.6L430.3 368.9H392.6C378.8 368.9 365.3 363.3 355.5 353.7L278.5 276.5C264.6 262.6 240.3 262.6 226.4 276.6L149.7 353.4C139.1 363 126.4 368.6 112.6 368.6H80.78L22.76 310.6C-7.586 280.3-7.586 231.1 22.76 200.8L80.78 142.7H112.6z" })),
    /* @__PURE__ */ React.createElement("span", { className: "flex-1 text-left" }, /* @__PURE__ */ React.createElement("span", { className: "block font-semibold" }, generating === "pix" ? "Gerando cobran\xE7a PIX..." : "Pagar com PIX"), /* @__PURE__ */ React.createElement("span", { className: "block text-xs text-blue-100" }, "Libera\xE7\xE3o do acesso ap\xF3s a confirma\xE7\xE3o")),
    /* @__PURE__ */ React.createElement(ArrowRight, { className: "h-5 w-5 shrink-0" })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleGerar("boleto"),
      disabled: generating !== null,
      className: "w-full border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 disabled:opacity-60 disabled:cursor-not-allowed rounded-2xl px-5 py-4 flex items-center gap-4 transition-all"
    },
    /* @__PURE__ */ React.createElement(Barcode, { className: "h-6 w-6 text-gray-700 shrink-0" }),
    /* @__PURE__ */ React.createElement("span", { className: "flex-1 text-left" }, /* @__PURE__ */ React.createElement("span", { className: "block font-semibold text-gray-900" }, generating === "boleto" ? "Gerando boleto..." : "Gerar Boleto Banc\xE1rio"), /* @__PURE__ */ React.createElement("span", { className: "block text-xs text-gray-500" }, "Pague tamb\xE9m via boleto")),
    /* @__PURE__ */ React.createElement(ArrowRight, { className: "h-5 w-5 text-gray-400 shrink-0" })
  ), pagamentos.length > 0 && /* @__PURE__ */ React.createElement(
    Button,
    {
      variant: "secondary",
      onClick: handleVerificar,
      disabled: checking,
      className: "w-full"
    },
    /* @__PURE__ */ React.createElement(RefreshCw, { className: `h-4 w-4 mr-2 ${checking ? "animate-spin" : ""}` }),
    checking ? "Verificando..." : "J\xE1 paguei \u2014 verificar pagamento"
  ), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-1 text-[11px] text-gray-500" }, /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement(ShieldCheck, { className: "h-3.5 w-3.5 text-blue-500" }), " Pagamento seguro via Asaas"), /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement(Lock, { className: "h-3.5 w-3.5 text-blue-500" }), " Dados protegidos"), /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement(Zap, { className: "h-3.5 w-3.5 text-blue-500" }), " Confirma\xE7\xE3o autom\xE1tica")), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleSair,
      className: "flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 pt-1"
    },
    /* @__PURE__ */ React.createElement(LogOut, { className: "h-4 w-4" }),
    " Sair e voltar ao login"
  ))))), /* @__PURE__ */ React.createElement(Dialog, { open: modalDoc, onOpenChange: setModalDoc }, /* @__PURE__ */ React.createElement(DialogContent, { className: "w-[calc(100%-2rem)] max-w-md rounded-2xl" }, /* @__PURE__ */ React.createElement(DialogHeader, null, /* @__PURE__ */ React.createElement(DialogTitle, { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(FileText, { className: "h-5 w-5 text-blue-600" }), "Documento necess\xE1rio")), /* @__PURE__ */ React.createElement("p", { className: "text-xs sm:text-sm text-gray-600" }, "Para gerar a cobran\xE7a precisamos do ", /* @__PURE__ */ React.createElement("strong", null, "CPF ou CNPJ"), " de", " ", /* @__PURE__ */ React.createElement("strong", null, empresa?.nome), ".", /* @__PURE__ */ React.createElement("br", null), "O dado ser\xE1 salvo no cadastro."), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-medium text-gray-600 block mb-1" }, "CPF/CNPJ *"), /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
      value: docInput,
      onChange: (e) => setDocInput(maskCpfCnpj(e.target.value)),
      placeholder: "000.000.000-00",
      inputMode: "numeric",
      autoFocus: true
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end gap-2 pt-1" }, /* @__PURE__ */ React.createElement(Button, { variant: "outline", onClick: () => setModalDoc(false) }, "Cancelar"), /* @__PURE__ */ React.createElement(
    Button,
    {
      onClick: confirmarDoc,
      disabled: salvandoDoc || generating !== null,
      className: "gap-1.5"
    },
    salvandoDoc || generating ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { className: "h-3.5 w-3.5 animate-spin" }), "Gerando...") : "Salvar e gerar cobran\xE7a"
  )))));
}
