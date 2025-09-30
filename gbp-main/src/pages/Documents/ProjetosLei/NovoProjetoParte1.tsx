import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { useCompany } from '../../../providers/CompanyProvider';
import { useToast } from '../../../components/ui/use-toast';

export default function NovoProjetoParte1() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const { toast } = useToast();
  const [newCoautor, setNewCoautor] = React.useState('');

  // Limpa os dados apenas quando a página é recarregada
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.removeItem('projetoLei_parte1');
      localStorage.removeItem('projetoLei_parte2');
      localStorage.removeItem('projetoLei_parte3');
      localStorage.removeItem('projetoLei_parte4');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Verifica se existem dados da empresa
  React.useEffect(() => {
    if (!company?.nome) {
      toast({
        title: "⚠️ Atenção",
        description: (
          <div className="flex flex-col gap-2">
            <p>Não foi possível carregar os dados da empresa.</p>
            <p className="text-sm text-muted-foreground">
              Por favor, selecione uma empresa antes de continuar.
            </p>
          </div>
        ),
        variant: "default",
        duration: 5000
      });
      navigate('/app/documentos/projetos-lei');
    }
  }, [company, navigate, toast]);

  const [formData, setFormData] = React.useState(() => {
    const savedData = localStorage.getItem('projetoLei_parte1');
    return savedData ? JSON.parse(savedData) : {
      numero: '',
      ano: new Date().getFullYear().toString(),
      titulo: '',
      autor: company?.nome || '',
      coautores: [] as string[],
      data_protocolo: new Date().toLocaleDateString('pt-BR'),
      status: 'em_andamento'
    };
  });

  const addCoautor = () => {
    if (newCoautor.trim() && !formData.coautores.includes(newCoautor.trim())) {
      setFormData(prev => ({
        ...prev,
        coautores: [...prev.coautores, newCoautor.trim()]
      }));
      setNewCoautor('');
    }
  };

  const removeCoautor = (coautor: string) => {
    setFormData(prev => ({
      ...prev,
      coautores: prev.coautores.filter(c => c !== coautor)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('projetoLei_parte1', JSON.stringify(formData));
    navigate('/app/documentos/projetos-lei/novo/parte-2');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 py-2 px-2 md:py-6 md:px-4">
        <div className="flex flex-col space-y-4">
          {/* Header Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 md:p-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/app/documentos/projetos-lei')} 
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                aria-label="Voltar para Projetos de Lei"
              >
                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-gray-500 dark:text-gray-400" />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  Novo Projeto de Lei
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Parte 1 de 4 - Informações Básicas
                </p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="numero">Número do Projeto</Label>
                  <Input
                    id="numero"
                    value={formData.numero}
                    onChange={(e) => setFormData(prev => ({ ...prev, numero: e.target.value }))}
                    placeholder="Ex: 001/2025"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ano">Ano*</Label>
                  <Select
                    value={formData.ano}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, ano: value }))}
                  >
                    <SelectTrigger id="ano">
                      <SelectValue placeholder="Selecione o ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((ano) => (
                        <SelectItem key={ano} value={ano.toString()}>
                          {ano}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="titulo">Título do Projeto*</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Título completo do projeto"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="autor">Autor*</Label>
                <Input
                  id="autor"
                  value={company?.nome || ''}
                  readOnly
                  required
                  className="bg-gray-50 dark:bg-gray-800"
                />
                <p className="text-sm text-gray-500">
                  Nome da empresa atual
                </p>
              </div>

              <div className="space-y-2">
                <Label>Coautores</Label>
                <div className="flex gap-2">
                  <Input
                    value={newCoautor}
                    onChange={(e) => setNewCoautor(e.target.value)}
                    placeholder="Nome do coautor"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCoautor())}
                  />
                  <Button 
                    type="button" 
                    onClick={addCoautor}
                    variant="outline"
                  >
                    Adicionar
                  </Button>
                </div>
                {formData.coautores.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.coautores.map((coautor, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {coautor}
                        <button
                          type="button"
                          onClick={() => removeCoautor(coautor)}
                          className="ml-1 hover:text-red-500"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_protocolo">Data de Protocolo*</Label>
                <Input
                  id="data_protocolo"
                  type="text"
                  value={formData.data_protocolo}
                  readOnly
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/app/documentos/projetos-lei')}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  Próximo
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
