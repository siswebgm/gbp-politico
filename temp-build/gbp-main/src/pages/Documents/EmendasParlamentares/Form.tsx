import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { CurrencyInput } from '../../../components/ui/masked-input';
import { CNPJInput } from '../../../components/ui/masked-input';
import { FileUpload } from '../../../components/ui/file-upload';
import { Textarea } from '../../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { useToast } from '../../../components/ui/use-toast';
import { useCompany } from '../../../providers/CompanyProvider';
import { useAuth } from '../../../providers/AuthProvider';
import { emendasParlamentaresService, EmendaParlamentar } from '../../../services/emendasParlamentares';

const formSchema = z.object({
  numero_emenda: z.string().min(1, 'Número da emenda é obrigatório'),
  ano: z.preprocess((val) => Number(val), z.number().min(2000, 'Ano inválido')),
  tipo: z.string().min(1, 'Tipo é obrigatório'),
  descricao: z.string().optional(),
  valor_total: z.preprocess((val) => Number(String(val).replace(/[^0-9,]/g, '').replace(',', '.')), z.number().min(0, 'Valor deve ser positivo')),
  beneficiario: z.string().optional(),
  beneficiario_cnpj: z.string().optional(),
  beneficiario_municipio: z.string().optional(),
  beneficiario_estado: z.string().optional(),
  status: z.string().min(1, 'Situação é obrigatória'),
  data_empenho: z.string().optional(),
  data_liberacao: z.string().optional(),
  data_pagamento: z.string().optional(),
  valor_empenhado: z.preprocess((val) => Number(String(val).replace(/[^0-9,]/g, '').replace(',', '.')), z.number().min(0, 'Valor deve ser positivo').optional()),
  valor_pago: z.preprocess((val) => Number(String(val).replace(/[^0-9,]/g, '').replace(',', '.')), z.number().min(0, 'Valor deve ser positivo').optional()),
  arquivos: z.array(z.object({
    nome: z.string(),
    tipo: z.string(),
    tamanho: z.number(),
    url: z.string().optional()
  })).optional()
});

export default function EmendaParlamentarForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { company } = useCompany();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numero_emenda: '',
      ano: new Date().getFullYear(),
      tipo: '',
      descricao: '',
      valor_total: 0,
      beneficiario: '',
      beneficiario_cnpj: '',
      beneficiario_municipio: '',
      beneficiario_estado: '',
      status: 'Aguardando Empenho',
      valor_empenhado: 0,
      valor_pago: 0,
      arquivos: []
    },
  });

  React.useEffect(() => {
    if (id) {
      const fetchEmenda = async () => {
        try {
          const data = await emendasParlamentaresService.getById(id);
          form.reset({
            ...data,
            ano: data.ano || new Date().getFullYear(),
            valor_total: data.valor_total || 0,
            data_empenho: data.data_empenho ? data.data_empenho.split('T')[0] : '',
            data_liberacao: data.data_liberacao ? data.data_liberacao.split('T')[0] : '',
            data_pagamento: data.data_pagamento ? data.data_pagamento.split('T')[0] : '',
          });
        } catch (error) {
          toast({ title: 'Erro ao buscar dados da emenda', variant: 'error' });
        }
      };
      fetchEmenda();
    }
  }, [id, form, toast]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!company?.uid || !user?.uid) return;
    setIsLoading(true);
    try {
            const payload: Partial<EmendaParlamentar> = {
        ...values,
        data_empenho: values.data_empenho || undefined,
        data_liberacao: values.data_liberacao || undefined,
        data_pagamento: values.data_pagamento || undefined,
        empresa_uid: company.uid,
        updated_by: user.uid,
        arquivos: values.arquivos?.map(file => ({
          nome: file.name,
          tipo: file.type,
          tamanho: file.size
        }))
      };

      if (id) {
        await emendasParlamentaresService.updateById(id, payload);
      } else {
        payload.created_by = user.uid;
        await emendasParlamentaresService.create(payload as Omit<EmendaParlamentar, 'uid' | 'created_at' | 'updated_at'>);
      }

      toast({ title: 'Emenda salva com sucesso!', variant: 'success' });
      navigate('/app/documentos/emendas-parlamentares');
    } catch (error) {
      toast({ title: 'Erro ao salvar emenda', description: 'Tente novamente.', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 p-4 sm:p-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/app/documentos/emendas-parlamentares')}>
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
              {id ? 'Editar' : 'Nova'} Emenda Parlamentar
            </h1>
          </div>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader><CardTitle>Dados da Emenda</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField name="numero_emenda" control={form.control} render={({ field }) => <FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField name="ano" control={form.control} render={({ field }) => <FormItem><FormLabel>Ano</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField name="tipo" control={form.control} render={({ field }) => <FormItem><FormLabel>Tipo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField name="descricao" control={form.control} render={({ field }) => <FormItem className="md:col-span-3"><FormLabel>Descrição/Objeto</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField name="valor_total" control={form.control} render={({ field }) => <FormItem><FormLabel>Valor Total</FormLabel><FormControl><CurrencyInput {...field} /></FormControl><FormMessage /></FormItem>} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Dados do Beneficiário</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField name="beneficiario" control={form.control} render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Órgão/Entidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField name="beneficiario_cnpj" control={form.control} render={({ field }) => <FormItem><FormLabel>CNPJ</FormLabel><FormControl><CNPJInput {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField name="beneficiario_municipio" control={form.control} render={({ field }) => <FormItem><FormLabel>Município</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField name="beneficiario_estado" control={form.control} render={({ field }) => <FormItem><FormLabel>Estado</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Execução e Pagamentos</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <FormField name="status" control={form.control} render={({ field }) => <FormItem><FormLabel>Situação</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Aguardando Empenho">Aguardando Empenho</SelectItem><SelectItem value="Empenhado">Empenhado</SelectItem><SelectItem value="Pago">Pago</SelectItem><SelectItem value="Cancelado">Cancelado</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
              <FormField name="data_empenho" control={form.control} render={({ field }) => <FormItem><FormLabel>Data do Empenho</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField name="data_liberacao" control={form.control} render={({ field }) => <FormItem><FormLabel>Data da Liberação</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField name="data_pagamento" control={form.control} render={({ field }) => <FormItem><FormLabel>Data do Pagamento</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField name="valor_empenhado" control={form.control} render={({ field }) => <FormItem><FormLabel>Valor Empenhado</FormLabel><FormControl><CurrencyInput {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField name="valor_pago" control={form.control} render={({ field }) => <FormItem><FormLabel>Valor Pago</FormLabel><FormControl><CurrencyInput {...field} /></FormControl><FormMessage /></FormItem>} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Anexos</CardTitle></CardHeader>
            <CardContent>
              <FormField name="arquivos" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Anexos</FormLabel>
                  <FormControl>
                    <FileUpload
                      value={field.value}
                      onChange={field.onChange}
                      multiple={true}
                      maxFiles={10}
                      maxSize={10 * 1024 * 1024}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/app/documentos/emendas-parlamentares')}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar</Button>
          </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
