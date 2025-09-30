import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { useToast } from '../../../components/ui/use-toast';

export default function NovoProjetoParte2() {
  const navigate = useNavigate();
  const { toast } = useToast();

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

  // Verifica se existem dados da parte 1
  React.useEffect(() => {
    const parte1 = localStorage.getItem('projetoLei_parte1');
    if (!parte1) {
      toast({
        title: "⚠️ Atenção",
        description: (
          <div className="flex flex-col gap-2">
            <p>Por favor, preencha a primeira parte do formulário.</p>
            <p className="text-sm text-muted-foreground">
              Você será redirecionado para a primeira parte.
            </p>
          </div>
        ),
        variant: "default",
        duration: 5000
      });
      navigate('/app/documentos/projetos-lei/novo');
      return;
    }
  }, [navigate, toast]);

  const [formData, setFormData] = React.useState(() => {
    const savedData = localStorage.getItem('projetoLei_parte2');
    return savedData ? JSON.parse(savedData) : {
      ementa: '',
      justificativa: ''
    };
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('projetoLei_parte2', JSON.stringify(formData));
    navigate('/app/documentos/projetos-lei/novo/parte-3');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 py-2 px-2 md:py-6 md:px-4">
        <div className="flex flex-col space-y-4">
          {/* Header Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 md:p-4">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => navigate('/app/documentos/projetos-lei/novo')} 
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                aria-label="Voltar para a parte anterior"
              >
                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-gray-500 dark:text-gray-400" />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  Novo Projeto de Lei
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Parte 2 de 4 - Ementa e Justificativa
                </p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="ementa">Ementa*</Label>
                <Textarea
                  id="ementa"
                  name="ementa"
                  value={formData.ementa}
                  onChange={handleInputChange}
                  placeholder="Descreva brevemente o objetivo principal do projeto de lei"
                  className="w-full h-[100px] resize-none"
                  required
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="justificativa">Justificativa*</Label>
                <Textarea
                  id="justificativa"
                  name="justificativa"
                  value={formData.justificativa}
                  onChange={handleInputChange}
                  placeholder="Explique detalhadamente a necessidade e os benefícios esperados desta lei"
                  className="w-full h-[180px] resize-none"
                  required
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end items-center gap-3 border-t border-gray-200 dark:border-gray-700 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/app/documentos/projetos-lei/novo')}
                >
                  Voltar
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
