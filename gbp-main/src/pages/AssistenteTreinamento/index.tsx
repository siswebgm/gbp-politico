import { useEffect, useState } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { assistantTrainingService, AssistantIntent } from '../../services/assistantTrainingService';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { useToast } from '../../components/ui/use-toast';
import { Sparkles, Pencil, Trash2, X } from 'lucide-react';

const emptyIntent = { pergunta: '', resposta: '', palavras_chave: '', ativo: true, ordem: 0 };

export function AssistenteTreinamento() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [intents, setIntents] = useState<AssistantIntent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [form, setForm] = useState(emptyIntent);

  const isOwner = user?.adm_empresa === true;

  const loadIntents = async () => {
    setIsLoading(true);
    try {
      setIntents(await assistantTrainingService.listar());
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar as respostas.', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadIntents(); }, []);

  const resetForm = () => { setForm(emptyIntent); setEditingUid(null); };

  const handleEdit = (intent: AssistantIntent) => {
    setEditingUid(intent.uid || null);
    setForm({
      pergunta: intent.pergunta,
      resposta: intent.resposta,
      palavras_chave: intent.palavras_chave,
      ativo: intent.ativo,
      ordem: intent.ordem || 0,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pergunta.trim() || !form.resposta.trim()) return;
    setIsSaving(true);
    try {
      if (editingUid) await assistantTrainingService.atualizar(editingUid, form);
      else await assistantTrainingService.criar({ ...form });
      toast({ title: 'Salvo', description: 'Resposta treinada salva com sucesso.', variant: 'success' });
      resetForm();
      await loadIntents();
    } catch (error: any) {
      toast({ title: 'Erro', description: error?.message || 'Erro ao salvar.', variant: 'error' });
    } finally { setIsSaving(false); }
  };

  const handleDelete = async (uid: string) => {
    if (!confirm('Excluir esta resposta treinada?')) return;
    try {
      await assistantTrainingService.excluir(uid);
      toast({ title: 'Excluído', description: 'Resposta removida.', variant: 'success' });
      await loadIntents();
      if (editingUid === uid) resetForm();
    } catch (error: any) {
      toast({ title: 'Erro', description: error?.message || 'Erro ao excluir.', variant: 'error' });
    }
  };

  if (!isOwner) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <X className="h-10 w-10 text-red-600 mb-3" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Acesso restrito</h1>
        <p className="text-gray-600 dark:text-gray-300">Apenas o dono do sistema pode acessar o treinamento da GBia.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Treinamento da GBia</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Crie respostas personalizadas para perguntas frequentes.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{editingUid ? 'Editar resposta' : 'Nova resposta'}</CardTitle>
          <CardDescription>
            A GBia responde quando a pergunta coincidir com a pergunta ou palavras-chave. Cadastre perguntas gerais sobre o sistema, como: “qual foi o último atendimento registrado?” ou “qual foi a última demanda recebida?”.<br />
            Você pode usar as variáveis <code>{'{{empresa}}'}</code>, <code>{'{{ultimoAtendimento}}'}</code> e <code>{'{{ultimaDemanda}}'}</code> na resposta para deixá-la dinâmica.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pergunta">Pergunta exemplo</Label>
                <Input id="pergunta" value={form.pergunta} onChange={(e) => setForm({ ...form, pergunta: e.target.value })} placeholder="Qual foi o último atendimento registrado?" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chaves">Palavras-chave <span className="text-xs text-gray-400">(separadas por vírgula)</span></Label>
                <Input id="chaves" value={form.palavras_chave} onChange={(e) => setForm({ ...form, palavras_chave: e.target.value })} placeholder="último atendimento, demanda, sistema" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resposta">Resposta</Label>
              <Textarea id="resposta" value={form.resposta} onChange={(e) => setForm({ ...form, resposta: e.target.value })} placeholder="Aqui aparece a resposta treinada sobre o sistema." required />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch id="ativo" checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
                <Label htmlFor="ativo">Ativo</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="ordem">Ordem</Label>
                <Input id="ordem" type="number" className="w-24" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })} />
              </div>
              <div className="flex-1 flex justify-end gap-2">
                {editingUid && <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>}
                <Button type="submit" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar resposta'}</Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Respostas treinadas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-500">Carregando...</p>
          ) : intents.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma resposta treinada cadastrada.</p>
          ) : (
            <div className="space-y-3">
              {intents.map((intent) => (
                <div key={intent.uid} className="border rounded-lg p-4 bg-white dark:bg-gray-900 dark:border-gray-800">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{intent.pergunta}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{intent.resposta}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {intent.palavras_chave.split(',').map((k) => k.trim() && (
                          <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{k.trim()}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!intent.ativo && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600">Inativo</span>}
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(intent)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => intent.uid && handleDelete(intent.uid)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
