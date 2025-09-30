import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { useToast } from '../../../components/ui/use-toast';

export default function NovoProjetoParte3() {
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

  // Verifica se existem dados das partes anteriores
  React.useEffect(() => {
    const parte1 = localStorage.getItem('projetoLei_parte1');
    const parte2 = localStorage.getItem('projetoLei_parte2');
    
    if (!parte1 || !parte2) {
      toast({
        title: "⚠️ Atenção",
        description: (
          <div className="flex flex-col gap-2">
            <p>Por favor, preencha as partes anteriores do formulário.</p>
            <p className="text-sm text-muted-foreground">
              Você será redirecionado para o início do cadastro.
            </p>
          </div>
        ),
        variant: "default",
        duration: 5000
      });
      navigate('/app/documentos/projetos-lei/novo');
      return;
    }

    // Tenta recuperar dados da parte 3 se existirem
    const parte3 = localStorage.getItem('projetoLei_parte3');
    if (parte3) {
      setFormData(JSON.parse(parte3));
    }
  }, [navigate, toast]);

  const [formData, setFormData] = React.useState(() => {
    const savedData = localStorage.getItem('projetoLei_parte3');
    return savedData ? JSON.parse(savedData) : {
      texto_lei: {
        objetivo: '',
        artigos: [],
        disposicoesFinais: '',
      }
    };
  });

  const addArtigo = () => {
    setFormData(prev => ({
      ...prev,
      texto_lei: {
        ...prev.texto_lei,
        artigos: [...prev.texto_lei.artigos, { 
          texto: '' 
        }]
      }
    }));
  };

  const updateArtigo = (index: number, texto: string) => {
    setFormData(prev => ({
      ...prev,
      texto_lei: {
        ...prev.texto_lei,
        artigos: prev.texto_lei.artigos.map((art, i) => 
          i === index ? { ...art, texto } : art
        )
      }
    }));
  };

  const removeArtigo = (index: number) => {
    setFormData(prev => ({
      ...prev,
      texto_lei: {
        ...prev.texto_lei,
        artigos: prev.texto_lei.artigos.filter((_, i) => i !== index)
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Garante que o objetivo seja o primeiro artigo
    const artigosComObjetivo = [
      { texto: formData.texto_lei.objetivo },
      ...formData.texto_lei.artigos
    ];
    
    const dadosFormatados = {
      ...formData,
      texto_lei: {
        ...formData.texto_lei,
        artigos: artigosComObjetivo
      }
    };
    
    try {
      // Salva os dados da parte 3
      localStorage.setItem('projetoLei_parte3', JSON.stringify(dadosFormatados));
      
      // Navega para a parte 4 usando replace para evitar histórico
      navigate('/app/documentos/projetos-lei/novo/parte-4', { replace: true });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar os dados. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 py-2 px-2 md:py-6 md:px-4">
        <div className="flex flex-col space-y-4">
          {/* Header Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 md:p-4">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => navigate('/app/documentos/projetos-lei/novo/parte-2')} 
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
                  Parte 3 de 4 - Texto do Projeto
                </p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-8">
                <div className="space-y-3">
                  <Label htmlFor="objetivo">Artigo 1º - Objetivo*</Label>
                  <Textarea
                    id="objetivo"
                    value={formData.texto_lei.objetivo}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      texto_lei: { ...prev.texto_lei, objetivo: e.target.value }
                    }))}
                    placeholder="Define o objetivo e a aplicação da lei"
                    required
                    rows={4}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Demais Artigos</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={addArtigo}
                    >
                      Adicionar Artigo
                    </Button>
                  </div>
                  
                  {formData.texto_lei.artigos.map((artigo, index) => (
                    <div key={index} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Artigo {index + 2}º</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeArtigo(index)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          Remover
                        </Button>
                      </div>
                      <Textarea
                        value={artigo.texto}
                        onChange={(e) => updateArtigo(index, e.target.value)}
                        placeholder={`Texto do Artigo ${index + 2}º`}
                        rows={3}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="disposicoesFinais">Disposições Finais*</Label>
                  <Textarea
                    id="disposicoesFinais"
                    value={formData.texto_lei.disposicoesFinais}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      texto_lei: { ...prev.texto_lei, disposicoesFinais: e.target.value }
                    }))}
                    placeholder="Determina prazos, regulamentação e entrada em vigor"
                    required
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/app/documentos/projetos-lei/novo/parte-2')}
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
