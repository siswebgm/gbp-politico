import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { format, parse } from 'date-fns';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useUserStore } from '../../store/useUserStore';
import { criarPesquisa } from '../../services/pesquisaService';

export function NovaPesquisa() {
  const { company } = useCompanyStore();
  const { user } = useUserStore();
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    data_inicio: new Date(),
    data_fim: null as Date | null,
    ativa: true, // Definido como true por padrão e não mais editável
    tipo_pesquisa: 'eleitoral',
    empresa_uid: company?.uid || '',
    created_by: user?.uid || null,
  });
  
  const [errors, setErrors] = useState({
    data_inicio: ''
  });
  
  const validateDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    
    return selectedDate >= today;
  };
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (company?.uid) {
      setFormData(prev => ({
        ...prev,
        empresa_uid: company.uid
      }));
    }
  }, [company?.uid]);

  useEffect(() => {
    if (user?.uid) {
      setFormData(prev => ({
        ...prev,
        created_by: user.uid
      }));
    }
  }, [user?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo.trim()) {
      toast.error('Por favor, insira um título para a pesquisa');
      return;
    }

    if (!formData.empresa_uid) {
      toast.error('Não foi possível identificar a empresa');
      return;
    }

    // Validar data de início
    if (!validateDate(formData.data_inicio)) {
      setErrors(prev => ({
        ...prev,
        data_inicio: 'A data de início não pode ser anterior à data atual'
      }));
      return;
    }

    setLoading(true);
    
    try {
      const pesquisaCriada = await criarPesquisa({
        ...formData,
        data_inicio: formData.data_inicio.toISOString(),
        data_fim: formData.data_fim ? formData.data_fim.toISOString() : null,
      });
      
      if (pesquisaCriada) {
        toast.success('Pesquisa criada com sucesso!');
        navigate(`/app/pesquisas/${pesquisaCriada.uid}/editar`);
      }
    } catch (error) {
      console.error('Erro ao criar pesquisa:', error);
      toast.error('Erro ao criar pesquisa. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="pb-6">
            <div className="mx-auto sm:px-0 md:px-0">
              {/* Header Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mx-5">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-4">
                    <Link
                      to="/app/pesquisas"
                      className="inline-flex items-center justify-center w-10 h-10 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Link>

                    <div>
                      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                        Nova Pesquisa {formData.tipo_pesquisa === 'eleitoral' ? 'Eleitoral' : 
                                      formData.tipo_pesquisa === 'satisfacao' ? 'de Satisfação' :
                                      formData.tipo_pesquisa === 'opiniao' ? 'de Opinião Pública' : ''}
                      </h1>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Preencha os campos abaixo para criar uma nova pesquisa
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Section */}
              <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mx-5">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800/50">
                      <Label htmlFor="tipo_pesquisa" className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                        Tipo de Pesquisa <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex flex-wrap gap-3">
                        {[
                          { value: 'eleitoral', label: 'Eleitoral' },
                          { value: 'satisfacao', label: 'Satisfação' },
                          { value: 'opiniao', label: 'Opinião Pública' },
                          { value: 'outro', label: 'Outro' }
                        ].map((tipo) => (
                          <button
                            key={tipo.value}
                            type="button"
                            onClick={() => setFormData({...formData, tipo_pesquisa: tipo.value})}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                              formData.tipo_pesquisa === tipo.value
                                ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                            }`}
                          >
                            {tipo.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="titulo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Título da Pesquisa <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="titulo"
                        value={formData.titulo}
                        onChange={(e) => setFormData({...formData, titulo: e.target.value.toUpperCase()})}
                        onBlur={(e) => setFormData({...formData, titulo: e.target.value.trim().toUpperCase()})}
                        placeholder="EX: PESQUISA DE INTENÇÃO DE VOTOS - ELEIÇÕES 2024"
                        className="w-full uppercase"
                        style={{ textTransform: 'uppercase' }}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="descricao" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Descrição <span className="text-gray-400">(opcional)</span>
                      </Label>
                      <Textarea
                        id="descricao"
                        value={formData.descricao}
                        onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                        placeholder="Forneça uma breve descrição sobre o objetivo desta pesquisa..."
                        rows={4}
                        className="w-full"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="data_inicio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Data de Início <span className="text-red-500">*</span>
                        </Label>
                        <div>
                          <Input
                            id="data_inicio"
                            type="date"
                            value={formData.data_inicio ? format(formData.data_inicio, 'yyyy-MM-dd') : ''}
                            min={format(new Date(), 'yyyy-MM-dd')}
                            onChange={(e) => {
                              const date = e.target.value ? parse(e.target.value, 'yyyy-MM-dd', new Date()) : new Date();
                              setFormData({...formData, data_inicio: date});
                              
                              // Limpar erro ao alterar a data
                              if (errors.data_inicio) {
                                setErrors(prev => ({...prev, data_inicio: ''}));
                              }
                            }}
                            className={`w-full ${errors.data_inicio ? 'border-red-500' : ''}`}
                            required
                          />
                          {errors.data_inicio && (
                            <p className="mt-1 text-sm text-red-600">{errors.data_inicio}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="data_fim" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Data de Término <span className="text-gray-400">(opcional)</span>
                        </Label>
                        <Input
                          id="data_fim"
                          type="date"
                          value={formData.data_fim ? format(formData.data_fim, 'yyyy-MM-dd') : ''}
                          onChange={(e) => {
                            const date = e.target.value ? parse(e.target.value, 'yyyy-MM-dd', new Date()) : null;
                            setFormData({...formData, data_fim: date});
                          }}
                          min={format(formData.data_inicio, 'yyyy-MM-dd')}
                          className="w-full"
                        />
                      </div>
                    </div>


                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/app/pesquisas')}
                      disabled={loading}
                      className="px-4 py-2"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={loading || !formData.titulo.trim() || !formData.empresa_uid}
                      className="px-4 py-2"
                    >
                      {loading ? 'Criando...' : 'Criar Pesquisa'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NovaPesquisa;
