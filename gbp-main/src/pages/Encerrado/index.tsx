import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  LogOut,
  MessageCircle,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { supabaseClient } from '../../lib/supabase';

const WHATSAPP_NUMERO = '5581979146126';
const WHATSAPP_LABEL = '(81) 9 7914-6126';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(
  'Olá! Gostaria de informações sobre a reativação do acesso ao GBP Político.'
)}`;

// Página exibida quando a empresa deixou de ser cliente (ativa=false /
// status='inactive'). Bloqueio silencioso: não oferece pagamento,
// informa o encerramento e oferece contato direto via WhatsApp.
export default function Encerrado() {
  const navigate = useNavigate();
  // Nome da empresa gravado no momento do redirecionamento para cá
  // (Layout/Blocked/Login persistem antes de limpar a sessão)
  const [empresaNome, setEmpresaNome] = useState(
    () => localStorage.getItem('encerrado_empresa') || ''
  );

  // Fallback: se o nome não foi gravado, tenta recuperar pelo UID da empresa
  useEffect(() => {
    if (empresaNome) return;

    let empresaUid =
      localStorage.getItem('encerrado_empresa_uid') ||
      localStorage.getItem('empresa_uid') ||
      localStorage.getItem('active_empresa_uid');

    if (!empresaUid) {
      try {
        const user = JSON.parse(localStorage.getItem('gbp_user') || 'null');
        empresaUid = user?.empresa_uid || null;
      } catch {
        empresaUid = null;
      }
    }

    if (!empresaUid) return;

    (async () => {
      try {
        const { data } = await supabaseClient
          .from('gbp_empresas')
          .select('nome')
          .eq('uid', empresaUid)
          .single();
        if (data?.nome) {
          localStorage.setItem('encerrado_empresa', data.nome);
          setEmpresaNome(data.nome);
        }
      } catch {
        // Sem fallback — exibe texto genérico
      }
    })();
  }, [empresaNome]);

  const handleVoltar = async () => {
    localStorage.removeItem('gbp_user');
    localStorage.removeItem('empresa_uid');
    localStorage.removeItem('active_empresa_uid');
    localStorage.removeItem('user_uid');
    localStorage.removeItem('encerrado_empresa');
    localStorage.removeItem('encerrado_empresa_uid');
    await supabaseClient.auth.signOut().catch(() => {});
    navigate('/login', { replace: true });
    window.location.reload();
  };

  return (
    <div className="h-dvh overflow-y-auto bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 flex flex-col">
      <div className="w-full flex-1 bg-white grid md:grid-cols-5">
        {/* Painel institucional */}
        <aside className="order-2 md:order-1 md:col-span-2 bg-gradient-to-b from-blue-950 via-blue-900 to-blue-700 text-white p-5 md:p-10 flex flex-col">
          <div className="flex items-center gap-3">
            <img
              src="https://8a9fa808ea18d066080b81b1741b3afc.cdn.bubble.io/f1683656885399x827876060621908000/gbp%20politico.png"
              alt="GBP Político"
              className="h-9 w-9 rounded-full object-cover ring-2 ring-white/20"
            />
            <div>
              <p className="font-bold leading-tight">GBP Político</p>
              <p className="text-xs text-blue-200">Gestão política inteligente</p>
            </div>
          </div>

          {/* Conteúdo central distribuído na altura disponível */}
          <div className="flex-1 flex flex-col justify-center gap-8 md:gap-10 mt-8 md:mt-0">
            <div className="space-y-4 md:space-y-4">
              <h2 className="text-sm sm:text-xl md:text-xl lg:text-2xl font-bold tracking-tight whitespace-nowrap">
                Foi uma honra fazer parte da sua{' '}
                <span className="text-cyan-300">gestão.</span>
              </h2>

              <p className="text-sm text-blue-100 leading-relaxed max-w-sm">
                O vínculo {empresaNome ? `de ${empresaNome}` : 'desta empresa'}{' '}
                com a plataforma foi encerrado. Se desejar retornar ou tiver
                alguma dúvida, nossa equipe está à disposição para atendê-lo.
              </p>
            </div>

            <ul className="space-y-6 md:space-y-6 text-sm">
            {[
              {
                icon: ShieldCheck,
                titulo: 'Responsabilidade encerrada',
                desc: 'Após o encerramento, a GBP Político não se responsabiliza pelas informações',
              },
              {
                icon: MessageCircle,
                titulo: 'Atendimento direto',
                desc: 'Fale com a equipe para reativar quando quiser',
              },
            ].map(({ icon: Icon, titulo, desc }) => (
              <li key={titulo} className="flex items-center gap-3">
                <span className="shrink-0 h-9 w-9 md:h-10 md:w-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-cyan-300" />
                </span>
                <span>
                  <span className="block font-medium">{titulo}</span>
                  <span className="block text-xs text-blue-200">{desc}</span>
                </span>
              </li>
            ))}
            </ul>
          </div>

          <div className="pt-8 md:pt-8">
            <div className="border border-white/15 rounded-xl p-4 flex items-center gap-3 text-xs text-blue-100">
              <ShieldCheck className="h-4 w-4 shrink-0 text-cyan-300" />
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span><strong className="text-white">+500</strong> clientes em todo o Brasil</span>
                <span><strong className="text-white">+8 anos</strong> de experiência</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Conteúdo */}
        <section className="order-1 md:order-2 md:col-span-3 px-3 py-5 md:p-10 flex flex-col justify-center">
          <div className="w-full max-w-xl mx-auto space-y-4 md:space-y-5">
            {/* Cabeçalho de status */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 flex items-start gap-3 md:gap-4">
              <span className="shrink-0 h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-slate-600" />
              </span>
              <div>
                <h1 className="text-lg font-bold text-red-600 leading-tight">
                  Vínculo encerrado
                </h1>
                <p className="text-sm font-semibold text-slate-600">
                  {empresaNome
                    ? `${empresaNome} não é mais cliente da GBP Político`
                    : 'Esta empresa não é mais cliente da GBP Político'}
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  O acesso ao sistema foi encerrado e não está mais disponível
                  para os usuários desta empresa.
                </p>
              </div>
            </div>

            {/* Card de contato WhatsApp */}
            <div className="border border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <span className="shrink-0 h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <MessageCircle className="h-5 w-5 text-white" />
                </span>
                <div>
                  <p className="font-semibold text-gray-900">
                    Fale com nossa equipe
                  </p>
                  <p className="text-xs text-gray-500">
                    Reativação, dúvidas ou informações
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 bg-white/70 border border-emerald-100 rounded-xl px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Phone className="h-4 w-4 text-emerald-600 shrink-0" />
                  WhatsApp Comercial
                </span>
                <span className="text-lg font-bold text-gray-900 tracking-tight whitespace-nowrap">
                  {WHATSAPP_LABEL}
                </span>
              </div>

              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-5 py-3.5 flex items-center gap-3 font-semibold shadow-lg shadow-emerald-500/25 transition-all"
              >
                <MessageCircle className="h-5 w-5 shrink-0" />
                <span className="flex-1 text-left min-w-0">
                  <span className="block">Chamar no WhatsApp</span>
                  <span className="block text-xs font-normal text-emerald-100">
                    Resposta rápida em horário comercial
                  </span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0" />
              </a>
            </div>

            {/* Voltar ao login */}
            <button
              onClick={handleVoltar}
              className="w-full border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 rounded-2xl px-5 py-3.5 flex items-center gap-3 transition-all"
            >
              <LogOut className="h-5 w-5 text-gray-500 shrink-0" />
              <span className="flex-1 text-left font-semibold text-gray-700">
                Voltar ao login
              </span>
              <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
