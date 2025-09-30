import { useState, useEffect, useCallback } from 'react';
import { Loader2, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabaseClient } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Button } from '../../../components/ui/button';
import { formatCurrency } from '../../../utils/format';
import { format } from 'date-fns';
import { Card, CardHeader, CardContent, CardFooter } from '../../../components/ui/card';
import { useAuth } from '../../../providers/AuthProvider';

interface Plano {
  id: string;
  nome: string;
  descricao: string;
  valor: number;
  periodo_dias: number;
  recursos: string[];
  mais_popular?: boolean;
}

export function PlanosPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [planoAtual, setPlanoAtual] = useState<{nome: string, data_fim: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Planos disponíveis para assinatura
  const planos: Plano[] = [
    {
      id: 'basic',
      nome: 'Básico',
      descricao: 'Ideal para começar',
      valor: 400,
      periodo_dias: 30,
      recursos: [
        'Até 1000 eleitores',
        'Suporte por e-mail',
        'Relatórios básicos',
        'Atualizações de segurança'
      ]
    },
    {
      id: 'professional',
      nome: 'Profissional',
      descricao: 'Para campanhas profissionais',
      valor: 500,
      periodo_dias: 30,
      mais_popular: true,
      recursos: [
        'Até 5000 eleitores',
        'Suporte prioritário',
        'Relatórios avançados',
        'Integração com redes sociais',
        'Exportação de dados'
      ]
    },
    {
      id: 'enterprise',
      nome: 'Empresarial',
      descricao: 'Solução completa',
      valor: 600,
      periodo_dias: 30,
      recursos: [
        'Eleitores ilimitados',
        'Suporte 24/7',
        'Relatórios personalizados',
        'Integração com CRM',
        'Treinamento da equipe',
        'Conta mestre'
      ]
    }
  ];

  const loadPlanoAtual = useCallback(async () => {
    if (!user?.empresa_uid) {
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      const { data, error } = await supabaseClient
        .from('gbp_planos')
        .select('*')
        .eq('empresa_uid', user.empresa_uid)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setPlanoAtual({
          nome: data.nome,
          data_fim: data.data_fim
        });
      }
    } catch (error) {
      console.error('Erro ao carregar plano atual:', error);
      toast.error('Erro ao carregar informações do plano');
    } finally {
      setIsLoading(false);
    }
  }, [user?.empresa_uid]); // Apenas empresa_uid como dependência

  useEffect(() => {
    const controller = new AbortController();
    
    if (user?.empresa_uid) {
      loadPlanoAtual();
    } else {
      setIsLoading(false);
    }

    return () => {
      controller.abort();
    };
  }, [user?.empresa_uid, loadPlanoAtual]);

  const handleAssinarPlano = (planoId: string) => {
    navigate(`/app/checkout?plan=${planoId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
          <h2 className="text-xl font-semibold mb-2">Carregando planos...</h2>
          <p className="text-muted-foreground">Estamos preparando as melhores ofertas para você.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Planos e Preços</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Escolha o plano que melhor atende às necessidades da sua campanha política.
        </p>
      </div>

      {planoAtual && (
        <div className="mb-8 text-center">
          <p className="text-muted-foreground">
            Seu plano atual é o <span className="font-medium text-foreground">{planoAtual.nome}</span>.
            {planoAtual.data_fim && (
              <span> Válido até {format(new Date(planoAtual.data_fim), "dd/MM/yyyy")}.</span>
            )}
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {planos.map((plano) => (
          <Card 
            key={plano.id} 
            className={`relative overflow-hidden ${
              plano.mais_popular ? 'border-2 border-primary' : ''
            }`}
          >
            {plano.mais_popular && (
              <div className="bg-primary text-primary-foreground text-xs font-medium text-center py-1 px-3 absolute right-0 top-4 rounded-l-full">
                MAIS POPULAR
              </div>
            )}
            
            <CardHeader>
              <h3 className="text-2xl font-semibold">{plano.nome}</h3>
              <p className="text-sm text-muted-foreground">{plano.descricao}</p>
              <div className="mt-4">
                <span className="text-4xl font-bold">
                  {formatCurrency(plano.valor)}
                </span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </CardHeader>
            
            <CardContent>
              <ul className="space-y-3">
                {plano.recursos.map((recurso, index) => (
                  <li key={index} className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span>{recurso}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            
            <CardFooter>
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => handleAssinarPlano(plano.id)}
              >
                {planoAtual?.nome === plano.nome ? 'Plano Atual' : 'Assinar Agora'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>Precisa de um plano personalizado? Entre em contato com nosso suporte.</p>
          </div>
        </div>
      </div>
    </div>
  );
}