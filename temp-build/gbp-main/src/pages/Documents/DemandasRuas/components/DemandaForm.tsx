import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { FormDescription } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DemandaRua } from '@/services/demandasRuasService';
import { Loader2, Save, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

const formSchema = z.object({
  cpf: z.string().min(11, 'CPF deve ter 11 dígitos').max(14, 'CPF inválido'),
  tipo_de_demanda: z.string().min(1, 'O tipo de demanda é obrigatório'),
  descricao_do_problema: z.string().min(10, 'A descrição deve ter pelo menos 10 caracteres'),
  nivel_de_urgencia: z.enum(['baixa', 'média', 'alta']),
  logradouro: z.string().min(1, 'O logradouro é obrigatório'),
  numero: z.string().optional(),
  bairro: z.string().min(1, 'O bairro é obrigatório'),
  cidade: z.string().min(1, 'A cidade é obrigatória'),
  uf: z.string().length(2, 'UF deve ter 2 caracteres'),
  cep: z.string().min(8, 'CEP inválido'),
  referencia: z.string().optional(),
  boletim_ocorrencia: z.enum(['sim', 'não']),
  link_da_demanda: z.string().url('URL inválida').or(z.literal('')),  
  aceite_termos: z.boolean().refine(val => val === true, { message: 'Você deve aceitar os termos para continuar' }),
  status: z.enum(['pendente', 'em_andamento', 'concluido', 'cancelado']),
  observacoes: z.string().optional(),
  anexar_boletim_de_correncia: z.string().optional(),
  documento_protocolado: z.string().optional(),
  observação_resposta: z.array(z.string()).optional(),
});

interface DemandaFormProps {
  demanda?: DemandaRua;
  onSave?: (data: Partial<DemandaRua>) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  empresaUid: string;
  cpfInicial?: string | null;
}

export function DemandaForm({ demanda, onSave, onCancel, loading, empresaUid, cpfInicial }: DemandaFormProps) {
  const { showSuccessToast, showErrorToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [novaObservacao, setNovaObservacao] = useState('');
  
  // Estilo para os cards de seção
  const sectionCardStyle = "bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:border-gray-200 transition-colors";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cpf: demanda?.cpf || cpfInicial || '',
      tipo_de_demanda: demanda?.tipo_de_demanda || '',
      descricao_do_problema: demanda?.descricao_do_problema || '',
      nivel_de_urgencia: demanda?.nivel_de_urgencia || 'média',
      logradouro: demanda?.logradouro || '',
      numero: demanda?.numero || '',
      bairro: demanda?.bairro || '',
      cidade: demanda?.cidade || '',
      uf: demanda?.uf || '',
      cep: demanda?.cep || '',
      referencia: demanda?.referencia || '',
      boletim_ocorrencia: (demanda?.boletim_ocorrencia as 'sim' | 'não') || 'não',
      link_da_demanda: demanda?.link_da_demanda || '',
      aceite_termos: demanda?.aceite_termos || false,
      status: demanda?.status || 'pendente',
      observacoes: demanda?.observacoes || '',
      anexar_boletim_de_correncia: demanda?.anexar_boletim_de_correncia || '',
      documento_protocolado: demanda?.documento_protocolado || '',
      observação_resposta: demanda?.observação_resposta || [],
    },
  });


  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      await onSave(data);
      showSuccessToast('Demanda salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar demanda:', error);
      showErrorToast('Erro ao salvar demanda. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const adicionarObservacao = () => {
    if (!novaObservacao.trim()) return;
    
    const observacoesAtuais = form.getValues('observação_resposta') || [];
    form.setValue('observação_resposta', [...observacoesAtuais, novaObservacao]);
    setNovaObservacao('');
  };

  const removerObservacao = (index: number) => {
    const observacoesAtuais = form.getValues('observação_resposta') || [];
    const novasObservacoes = [...observacoesAtuais];
    novasObservacoes.splice(index, 1);
    form.setValue('observação_resposta', novasObservacoes);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-6">
          {/* Dados Básicos */}
          <div className={sectionCardStyle}>
            <h3 className="text-lg font-medium mb-4 pb-2 border-b">Dados da Demanda</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF do Solicitante</FormLabel>
                    <FormControl>
                      <Input placeholder="000.000.000-00" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo_de_demanda"
                render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Demanda</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Buraco na rua, Iluminação, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nivel_de_urgencia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nível de Urgência</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o nível de urgência" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="média">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao_do_problema"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição do Problema</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva detalhadamente o problema..." 
                      className="min-h-[120px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>
          </div>
          
          {/* Endereço */}
          <div className={sectionCardStyle}>
            <h3 className="text-lg font-medium mb-4 pb-2 border-b">Localização</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cep"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <Input placeholder="00000-000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="uf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UF</FormLabel>
                    <FormControl>
                      <Input placeholder="UF" maxLength={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="cidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade</FormLabel>
                  <FormControl>
                    <Input placeholder="Cidade" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bairro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bairro</FormLabel>
                  <FormControl>
                    <Input placeholder="Bairro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="logradouro"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Logradouro</FormLabel>
                    <FormControl>
                      <Input placeholder="Rua, Avenida, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input placeholder="Nº" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="referencia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ponto de Referência</FormLabel>
                  <FormControl>
                    <Input placeholder="Próximo a..." {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
          
        {/* Documentação */}
        <div className={sectionCardStyle}>
          <h3 className="text-lg font-medium mb-4 pb-2 border-b">Documentação</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <FormField
              control={form.control}
              name="boletim_ocorrencia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Possui Boletim de Ocorrência?</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma opção" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="não">Não</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('boletim_ocorrencia') === 'sim' && (
              <FormField
                control={form.control}
                name="anexar_boletim_de_correncia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anexar Boletim de Ocorrência</FormLabel>
                    <FormControl>
                      <Input 
                        type="file" 
                        onChange={(e) => field.onChange(e.target.files?.[0])}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="documento_protocolado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Documento Protocolado</FormLabel>
                  <FormControl>
                    <Input 
                      type="file" 
                      onChange={(e) => field.onChange(e.target.files?.[0])}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="link_da_demanda"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link da Demanda (Opcional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://exemplo.com/demanda/123" 
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
          
        {/* Observações */}
        <div className={sectionCardStyle}>
          <h3 className="text-lg font-medium mb-4 pb-2 border-b">Observações e Acompanhamento</h3>
            
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações Gerais</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Observações adicionais..." 
                      className="min-h-[100px]"
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>Histórico de Observações</FormLabel>
                <span className="text-xs text-gray-500">
                  {form.watch('observação_resposta')?.length || 0} registros
                </span>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto p-2 border rounded-md">
                {form.watch('observação_resposta')?.length ? (
                  form.watch('observação_resposta')?.map((obs, index) => (
                    <div 
                      key={index} 
                      className="p-3 text-sm bg-gray-50 dark:bg-gray-800 rounded-md relative group"
                    >
                      <p>{obs}</p>
                      <button
                        type="button"
                        onClick={() => removerObservacao(index)}
                        className="absolute top-1 right-1 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Nenhuma observação registrada
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Input
                  placeholder="Adicionar observação..."
                  value={novaObservacao}
                  onChange={(e) => setNovaObservacao(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), adicionarObservacao())}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={adicionarObservacao}
                  disabled={!novaObservacao.trim()}
                >
                  Adicionar
                </Button>
              </div>
            </div>
          </div>
        </div>

        
        <FormField
          control={form.control}
          name="aceite_termos"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Aceito os termos e condições
                </FormLabel>
                <FormDescription>
                  Você concorda com nossos termos de serviço e políticas de privacidade.
                </FormDescription>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={loading || isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={loading || isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
