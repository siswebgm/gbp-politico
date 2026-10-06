import { useState, useEffect, useRef } from 'react';
import { supabaseClient } from '../../../lib/supabase';
import { useAuth } from '../../../providers/AuthProvider';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { useToast } from '../../../components/ui/use-toast';
import { 
  Save, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Tag, 
  Smartphone,
  Info,
} from 'lucide-react';
import { Switch } from '../../../components/ui/switch';
import { Textarea } from '../../../components/ui/textarea';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { Card } from '../../../components/ui/card';

export function MessageSettings() {
  const { user } = useAuth();
  const company = useCompanyStore((state) => state.company);
  const { toast } = useToast();
  const [mensagensAtivadas, setMensagensAtivadas] = useState(false);
  const [mensagemPadrao, setMensagemPadrao] = useState('');
  const [mensagemDelayMinutos, setMensagemDelayMinutos] = useState(30);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Variáveis disponíveis para inserção
  const variaveisDisponiveis = [
    { tag: '{nome}', label: 'Nome do Eleitor', exemplo: 'João Silva', cor: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' },
    { tag: '{categoria}', label: 'Categoria', exemplo: 'Saúde e Medicamentos', cor: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' },
    { tag: '{cliente}', label: 'Gabinete / Mandato', exemplo: company?.nome || 'Gabinete', cor: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800' },
    { tag: '{saudacao}', label: 'Saudação (bom dia/tarde/noite — definido no envio)', exemplo: 'Bom dia', cor: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' },
  ];

  // Inserir tag na posição do cursor
  const handleInsertTag = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setMensagemPadrao((prev) => prev + tag);
      return;
    }

    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const textoAtual = textarea.value;

    const novoTexto = textoAtual.substring(0, start) + tag + textoAtual.substring(end);
    setMensagemPadrao(novoTexto);

    setTimeout(() => {
      textarea.focus();
      const novaPos = start + tag.length;
      textarea.setSelectionRange(novaPos, novaPos);
    }, 0);
  };

  // Gerar preview da mensagem com dados fictícios
  const previewTexto = mensagemPadrao
    ? mensagemPadrao
        .replace(/\{nome\}/gi, 'João Silva')
        .replace(/\{categoria\}/gi, 'Saúde e Medicamentos')
        .replace(/\{cliente\}/gi, company?.nome || 'Gabinete do Vereador')
        .replace(/\{saudacao\}/gi, 'Bom dia')
    : 'Olá João Silva, seu atendimento foi registrado com sucesso. Em breve entraremos em contato.';

  // Verifica se usuário é admin
  const isAdmin = user?.nivel_acesso === 'admin';

  useEffect(() => {
    loadSettings();
  }, [company?.uid]);

  const loadSettings = async () => {
    if (!company?.uid) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabaseClient
        .from('gbp_empresas')
        .select('mensagens_ativadas, mensagem_padrao_atendimento, mensagem_delay_minutos')
        .eq('uid', company.uid)
        .single();

      if (error) throw error;

      setMensagensAtivadas(data?.mensagens_ativadas || false);
      setMensagemPadrao(data?.mensagem_padrao_atendimento || '');
      setMensagemDelayMinutos(data?.mensagem_delay_minutos ?? 30);
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
      setError('Erro ao carregar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!company?.uid) return;

    try {
      setIsSaving(true);
      setError(null);

      const { error } = await supabaseClient
        .from('gbp_empresas')
        .update({
          mensagens_ativadas: mensagensAtivadas,
          mensagem_padrao_atendimento: mensagemPadrao,
          mensagem_delay_minutos: mensagemDelayMinutos,
        })
        .eq('uid', company.uid);

      if (error) throw error;

      // Atualiza o store local
      useCompanyStore.setState({
        company: {
          ...company,
          mensagens_ativadas: mensagensAtivadas,
          mensagem_padrao_atendimento: mensagemPadrao,
          mensagem_delay_minutos: mensagemDelayMinutos,
        }
      });

      toast({
        title: "Configuração salva com sucesso!",
        description: "As configurações de mensagens foram atualizadas.",
        className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300",
      });
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      setError('Erro ao salvar configurações');
      toast({
        title: "Erro ao salvar configurações",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Acesso restrito. Apenas administradores podem alterar esta configuração.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-xs rounded-xl">
        <div className="space-y-6">
          {/* Status do Disparo Automático */}
          <div className="flex items-start sm:items-center justify-between gap-4 pb-5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Label htmlFor="mensagens-ativadas" className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white cursor-pointer">
                  Disparo Automático no Atendimento
                </Label>
                <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                  mensagensAtivadas 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {mensagensAtivadas ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed whitespace-nowrap">
                Ao cadastrar atendimento, o eleitor recebe mensagem automática no WhatsApp.
              </p>
            </div>
            <Switch
              id="mensagens-ativadas"
              checked={mensagensAtivadas}
              onCheckedChange={setMensagensAtivadas}
              disabled={isSaving}
              className="mt-1 sm:mt-0 flex-shrink-0"
            />
          </div>

          {/* Tempo de Espera (Delay) */}
          <div className="space-y-2 pb-5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <Label htmlFor="mensagem-delay" className="text-sm font-semibold text-gray-900 dark:text-white">
                Tempo de Espera para Envio
              </Label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Intervalo de segurança antes de disparar a mensagem após o registro do atendimento.
            </p>
            <div className="max-w-xs">
              <select
                id="mensagem-delay"
                value={mensagemDelayMinutos}
                onChange={(e) => setMensagemDelayMinutos(Number(e.target.value))}
                disabled={isSaving}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                <option value={0}>Imediato (logo após cadastrar)</option>
                <option value={15}>Aguardar 15 minutos</option>
                <option value={30}>Aguardar 30 minutos</option>
                <option value={60}>Aguardar 1 hora</option>
              </select>
            </div>
          </div>

          {/* Texto da Mensagem */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <Label htmlFor="mensagem-padrao" className="text-sm font-semibold text-gray-900 dark:text-white">
                  Texto da Mensagem Padrão
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Clique nas tags abaixo para inserir dados personalizados diretamente na mensagem:
                </p>
              </div>
              <span className="text-[11px] text-gray-400 self-end sm:self-auto">
                {mensagemPadrao.length} caracteres
              </span>
            </div>

            {/* Tags Clicáveis */}
            <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">
                <Tag className="h-3.5 w-3.5" />
                <span>Inserir:</span>
              </div>
              {variaveisDisponiveis.map((v) => (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => handleInsertTag(v.tag)}
                  title={v.label}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border shadow-2xs transition-all active:scale-95 whitespace-nowrap ${v.cor}`}
                >
                  <code>{v.tag}</code>
                </button>
              ))}
            </div>

            {/* Campo Textarea */}
            <Textarea
              ref={textareaRef}
              id="mensagem-padrao"
              value={mensagemPadrao}
              onChange={(e) => setMensagemPadrao(e.target.value)}
              placeholder="Olá {nome}, seu atendimento sobre {categoria} foi registrado com sucesso pelo gabinete {cliente}. Em breve entraremos em contato!"
              rows={8}
              disabled={isSaving}
              className="text-xs sm:text-sm leading-relaxed border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 rounded-lg p-3"
            />
          </div>

          {/* Pré-visualização ao vivo (estilo WhatsApp) */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
              <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
              <span>Como o eleitor visualizará no WhatsApp:</span>
            </div>
            
            <div className="bg-[#efeae2] dark:bg-[#0b141a] p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs">
              <div className="max-w-md bg-[#dcf8c6] dark:bg-[#005c4b] text-gray-900 dark:text-gray-100 p-3 rounded-xl rounded-tr-none shadow-xs text-xs sm:text-sm leading-relaxed whitespace-pre-wrap relative ml-auto">
                {previewTexto}
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-gray-500 dark:text-gray-300">
                  <span>14:30</span>
                  <CheckCircle className="h-3 w-3 text-blue-500" />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-xs sm:text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Botão Salvar */}
          <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Salvar Configurações</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Caixa de Orientações */}
      <div className="bg-blue-50/70 dark:bg-blue-900/20 border border-blue-200/80 dark:border-blue-800/80 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs sm:text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
            <p className="font-semibold mb-1">Como funciona o envio automático:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-300">
              <li>Ao salvar um atendimento, o sistema prepara a mensagem personalizada para o WhatsApp cadastrado do eleitor.</li>
              <li>As tags <code className="bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded text-[11px] font-bold">{"{nome}"}</code> e <code className="bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded text-[11px] font-bold">{"{categoria}"}</code> são substituídas pelos dados do atendimento.</li>
              <li>A tag <code className="bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded text-[11px] font-bold">{"{saudacao}"}</code> é substituída na hora do envio por "Bom dia", "Boa tarde" ou "Boa noite" (definido pela automação/N8N).</li>
              <li>O envio respeitará o tempo de espera configurado para dar tempo de ajustes imediatos.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
