import { useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

type PlanType = 'basic' | 'professional' | 'enterprise' | null;

interface PlanDetails {
  name: string;
  price: number;
  features: string[];
}

export function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const [planDetails, setPlanDetails] = useState<PlanDetails | null>(null);
  const navigate = useNavigate();
  
  const planId = searchParams.get('plan') as PlanType;

  useEffect(() => {
    if (!planId) {
      navigate('/app/planos');
      return;
    }

    const details = getPlanDetails(planId);
    if (!details) {
      navigate('/app/planos');
      return;
    }
    
    setPlanDetails(details);
  }, [planId, navigate]);

  const handleVoltar = () => {
    navigate('/app/planos');
  };

  if (!planDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Carregando detalhes do plano...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold mb-6">Finalizar Assinatura</h1>
          
          <div className="space-y-4">
            <p>Você está assinando o plano: <span className="font-semibold">{planDetails.name}</span></p>
            <p>Valor: R$ {planDetails.price},00/mês</p>
            
            <div className="mt-4">
              <h3 className="font-medium mb-2">Recursos incluídos:</h3>
              <ul className="space-y-2">
                {planDetails.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <p className="mt-4 text-sm text-muted-foreground">
              Esta é uma página de demonstração. Em uma implementação real, você seria redirecionado para o gateway de pagamento.
            </p>
            
            <div className="mt-6 flex justify-end space-x-4">
              <Button variant="outline" onClick={handleVoltar}>
                Voltar
              </Button>
              <Button onClick={() => alert('Redirecionando para o pagamento...')}>
                Ir para o Pagamento
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Função auxiliar para obter os detalhes do plano
function getPlanDetails(planId: PlanType): PlanDetails | null {
  switch (planId) {
    case 'basic':
      return {
        name: 'Plano Básico',
        price: 400,
        features: [
          'Até 1000 eleitores',
          'Suporte por e-mail',
          'Relatórios básicos',
          'Atualizações de segurança'
        ]
      };
    case 'professional':
      return {
        name: 'Plano Profissional',
        price: 500,
        features: [
          'Até 5000 eleitores',
          'Suporte prioritário',
          'Relatórios avançados',
          'Integração com redes sociais',
          'Exportação de dados'
        ]
      };
    case 'enterprise':
      return {
        name: 'Plano Empresarial',
        price: 600,
        features: [
          'Eleitores ilimitados',
          'Suporte 24/7',
          'Relatórios personalizados',
          'Integração com CRM',
          'Treinamento da equipe',
          'Conta mestre'
        ]
      };
    default:
      return null;
  }
}
