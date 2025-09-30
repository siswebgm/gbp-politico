import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Star, Check, X, ArrowLeft } from 'lucide-react';

interface Candidato {
  id: string;
  nome: string;
  partido: string;
  imagem: string | null;
}

interface Pergunta {
  id: string;
  texto: string;
  tipo: 'estrelas' | 'nota' | 'votacao';
}

interface Resposta {
  perguntaId: string;
  candidatoId: string;
  valor: number | boolean | null;
}

export function ResponderPesquisa() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  
  // Dados do participante
  const [nome, setNome] = useState('');
  const [faixaEtaria, setFaixaEtaria] = useState('');
  const [telefone, setTelefone] = useState('');

  // Carregar dados da pesquisa
  useEffect(() => {
    const carregarPesquisa = async () => {
      try {
        // Simulando carregamento de dados
        setTimeout(() => {
          setTitulo('Pesquisa de intenção de votos - Eleições 2024');
          setCandidatos([
            { id: '1', nome: 'João Silva', partido: 'PSDB', imagem: null },
            { id: '2', nome: 'Maria Souza', partido: 'PT', imagem: null },
          ]);
          setPerguntas([
            { id: '1', texto: 'Qual a sua avaliação sobre o candidato?', tipo: 'estrelas' },
            { id: '2', texto: 'De 0 a 10, qual a chance de você votar neste candidato?', tipo: 'nota' },
            { id: '3', texto: 'Você votaria neste candidato?', tipo: 'votacao' },
          ]);
          
          // Inicializar respostas vazias
          const respostasIniciais: Resposta[] = [];
          candidatos.forEach(candidato => {
            perguntas.forEach(pergunta => {
              respostasIniciais.push({
                perguntaId: pergunta.id,
                candidatoId: candidato.id,
                valor: pergunta.tipo === 'votacao' ? null : 0,
              });
            });
          });
          setRespostas(respostasIniciais);
          
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Erro ao carregar pesquisa:', error);
        toast.error('Erro ao carregar a pesquisa');
        setLoading(false);
      }
    };

    carregarPesquisa();
  }, [id]);

  const handleResposta = (candidatoId: string, perguntaId: string, valor: any) => {
    setRespostas(prev => 
      prev.map(resposta => 
        resposta.candidatoId === candidatoId && resposta.perguntaId === perguntaId
          ? { ...resposta, valor }
          : resposta
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) {
      toast.error('Por favor, informe seu nome');
      return;
    }
    
    if (!faixaEtaria) {
      toast.error('Por favor, selecione sua faixa etária');
      return;
    }
    
    // Verificar se todas as perguntas obrigatórias foram respondidas
    const perguntasObrigatorias = perguntas.filter(p => p.tipo !== 'votacao' || p.tipo === 'votacao');
    const respostasObrigatorias = respostas.filter(r => 
      perguntasObrigatorias.some(p => p.id === r.perguntaId)
    );
    
    const todasRespondidas = respostasObrigatorias.every(r => {
      if (r.valor === null || r.valor === undefined) return false;
      if (typeof r.valor === 'number' && r.valor === 0) return false;
      return true;
    });
    
    if (!todasRespondidas) {
      toast.error('Por favor, responda todas as perguntas obrigatórias');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Aqui você fará a chamada para a API para salvar as respostas
      const dadosResposta = {
        pesquisaId: id,
        participante: { nome, faixaEtaria, telefone },
        respostas,
      };
      
      console.log('Dados da resposta:', dadosResposta);
      
      // Simulando envio
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('Obrigado por participar da pesquisa!');
      
      // Redirecionar para página de agradecimento
      navigate(`/pesquisa/${id}/obrigado`);
    } catch (error) {
      console.error('Erro ao enviar respostas:', error);
      toast.error('Erro ao enviar as respostas. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => window.history.back()}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        
        <Card className="mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{titulo}</CardTitle>
            <p className="text-gray-600 mt-2">
              Sua opinião é muito importante para nós. Por favor, responda as perguntas abaixo com atenção.
            </p>
          </CardHeader>
        </Card>
        
        <form onSubmit={handleSubmit}>
          {candidatos.map((candidato, index) => (
            <Card key={candidato.id} className="mb-8">
              <CardHeader className="bg-gray-50 border-b">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                    {candidato.imagem ? (
                      <img 
                        src={candidato.imagem} 
                        alt={candidato.nome} 
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl text-gray-500">
                        {candidato.nome.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{candidato.nome}</h3>
                    <p className="text-gray-600">{candidato.partido}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {perguntas.map((pergunta) => {
                  const respostaAtual = respostas.find(
                    r => r.candidatoId === candidato.id && r.perguntaId === pergunta.id
                  );
                  
                  return (
                    <div key={pergunta.id} className="space-y-3">
                      <p className="font-medium">{pergunta.texto}</p>
                      
                      {pergunta.tipo === 'estrelas' && (
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4, 5].map((estrela) => (
                            <button
                              key={estrela}
                              type="button"
                              className={`p-1 ${(respostaAtual?.valor as number) >= estrela ? 'text-yellow-400' : 'text-gray-300'}`}
                              onClick={() => handleResposta(candidato.id, pergunta.id, estrela)}
                            >
                              <Star 
                                className="h-8 w-8 fill-current"
                              />
                            </button>
                          ))}
                          <span className="ml-2 text-sm text-gray-500 self-center">
                            {(respostaAtual?.valor as number) || 0} de 5 estrelas
                          </span>
                        </div>
                      )}
                      
                      {pergunta.tipo === 'nota' && (
                        <div className="flex flex-wrap gap-2">
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((nota) => (
                            <button
                              key={nota}
                              type="button"
                              className={`w-10 h-10 flex items-center justify-center rounded-full border ${
                                respostaAtual?.valor === nota 
                                  ? 'bg-blue-600 text-white border-blue-600' 
                                  : 'border-gray-300 hover:bg-gray-50'
                              }`}
                              onClick={() => handleResposta(candidato.id, pergunta.id, nota)}
                            >
                              {nota}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {pergunta.tipo === 'votacao' && (
                        <div className="flex space-x-4">
                          <Button
                            type="button"
                            variant={respostaAtual?.valor === true ? 'default' : 'outline'}
                            className={`flex-1 ${respostaAtual?.valor === true ? 'bg-green-600 hover:bg-green-700' : ''}`}
                            onClick={() => handleResposta(candidato.id, pergunta.id, true)}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Sim
                          </Button>
                          <Button
                            type="button"
                            variant={respostaAtual?.valor === false ? 'destructive' : 'outline'}
                            className="flex-1"
                            onClick={() => handleResposta(candidato.id, pergunta.id, false)}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Não
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
          
          {/* Seção de Dados do Participante */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Seus Dados</CardTitle>
              <p className="text-sm text-gray-500">
                Preencha as informações abaixo para concluir a pesquisa.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Digite seu nome completo"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="faixa-etaria">Faixa Etária *</Label>
                <Select 
                  value={faixaEtaria} 
                  onValueChange={setFaixaEtaria}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione sua faixa etária" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="18-24">18-24 anos</SelectItem>
                    <SelectItem value="25-34">25-34 anos</SelectItem>
                    <SelectItem value="35-44">35-44 anos</SelectItem>
                    <SelectItem value="45-54">45-54 anos</SelectItem>
                    <SelectItem value="55-64">55-64 anos</SelectItem>
                    <SelectItem value="65+">65+ anos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone (opcional)</Label>
                <Input
                  id="telefone"
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
                <p className="text-xs text-gray-500">
                  Seu telefone não será compartilhado e será usado apenas para contato, se necessário.
                </p>
              </div>
            </CardContent>
          </Card>
          
          <div className="text-center">
            <Button 
              type="submit" 
              size="lg"
              disabled={submitting}
              className="min-w-[200px]"
            >
              {submitting ? 'Enviando...' : 'Enviar Respostas'}
            </Button>
            <p className="mt-2 text-sm text-gray-500">
              Suas respostas são anônimas e serão tratadas com confidencialidade.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ResponderPesquisa;
