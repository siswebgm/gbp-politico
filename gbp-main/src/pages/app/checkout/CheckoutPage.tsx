import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CheckCircle2, CreditCard, DollarSign, Barcode, ShieldCheck, Lock, Shield } from 'lucide-react';
import { PaymentForm } from '@/components/payment/PaymentForm';
import { useCompanyStore } from '@/store/useCompanyStore';
import { assinaturaService } from '@/services/assinatura.service';
import { createCustomer, createPayment } from '@/services/payment.service';
import { v4 as uuidv4 } from 'uuid';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Básico',
    description: 'Ideal para começar',
    price: 99.9,
    interval: 'month',
    features: [
      'Até 1000 eleitores',
      'Suporte por e-mail',
      'Relatórios básicos',
      'Atualizações de segurança',
    ],
  },
  {
    id: 'professional',
    name: 'Profissional',
    description: 'Para campanhas profissionais',
    price: 199.9,
    interval: 'month',
    features: [
      'Até 5000 eleitores',
      'Suporte prioritário',
      'Relatórios avançados',
      'Integração com redes sociais',
      'Exportação de dados',
    ],
  },
  {
    id: 'enterprise',
    name: 'Empresarial',
    description: 'Solução completa',
    price: 399.9,
    interval: 'month',
    features: [
      'Eleitores ilimitados',
      'Suporte 24/7',
      'Relatórios personalizados',
      'Integração com CRM',
      'Treinamento da equipe',
      'Conta mestre',
    ],
  },
];

interface PaymentData {
  paymentMethod: 'CREDIT_CARD' | 'PIX' | 'BOLETO';
  cardData?: {
    paymentMethod: {
      id: string;
      card: {
        brand: string;
        last4: string;
        exp_month: number;
        exp_year: number;
      };
    };
    name: string;
  };
}

export function CheckoutPage() {
  const { user } = useAuth();
  const company = useCompanyStore((state) => state.company);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'credit-card' | 'pix' | 'boleto'>('credit-card');

  useEffect(() => {
    const planId = searchParams.get('plan') || 'basic';
    const plan = PLANS.find(p => p.id === planId) || PLANS[0];
    setSelectedPlan(plan);
    setIsLoading(false);
  }, [searchParams]);

  const handlePaymentSuccess = async (paymentMethod: any) => {
    if (!user || !selectedPlan || !company) {
      toast({
        title: 'Erro',
        description: 'Dados incompletos para processar o pagamento.',
        variant: 'destructive',
      });
      return;
    }

    setPaymentStatus('processing');

    try {
      // 1. Criar ou obter o cliente no gateway de pagamento
      const customer = await createCustomer({
        name: user.nome || company.nome || 'Cliente',
        cpfCnpj: user.cpf || '',
        email: user.email,
        phone: user.telefone || '',
      });

      // 2. Criar o pagamento no gateway
      const paymentGateway = await createPayment({
        customer: customer.id,
        billingType: 'CREDIT_CARD',
        value: selectedPlan.price,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        description: `Assinatura ${selectedPlan.name} - ${company.nome}`,
        externalReference: `empresa_${company.uid}_${Date.now()}`
      });

      // 3. Registrar o pagamento no banco de dados
      const assinaturaId = uuidv4();
      await assinaturaService.criarPagamento({
        assinatura_id: assinaturaId,
        valor: selectedPlan.price,
        tipo_pagamento: 'CREDIT_CARD',
        status: 'paid',
        gateway_id: paymentGateway.id,
        gateway_url: paymentGateway.invoiceUrl || paymentGateway.bankSlipUrl || paymentGateway.pixQrCodeUrl,
        data_pagamento: new Date(),
        data_vencimento: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        empresa_uid: company.uid
      });

      setPaymentStatus('success');
      
      toast({
        title: 'Sucesso!',
        description: 'Pagamento processado com sucesso!',
      });
      
      // Redireciona após 3 segundos
      setTimeout(() => {
        navigate('/app/dashboard');
      }, 3000);

    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      setPaymentStatus('error');
      
      toast({
        title: 'Erro',
        description: 'Não foi possível processar seu pagamento. Por favor, tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handlePaymentError = (error: Error) => {
    console.error('Erro no pagamento:', error);
    setPaymentStatus('error');
    
    toast({
      title: 'Erro no pagamento',
      description: error.message || 'Ocorreu um erro ao processar seu pagamento.',
      variant: 'destructive',
    });
  };

  const handlePaymentMethodSelect = (method: 'CREDIT_CARD' | 'PIX' | 'BOLETO') => {
    setActiveTab(method === 'CREDIT_CARD' ? 'credit-card' : method === 'PIX' ? 'pix' : 'boleto');
  };

  const handlePaymentSubmit = async (paymentData: any) => {
    if (!user || !selectedPlan || !company) {
      toast({
        title: 'Erro',
        description: 'Dados incompletos para processar o pagamento.',
        variant: 'destructive',
      });
      return;
    }

    setPaymentStatus('processing');

    try {
      // 1. Criar ou obter o cliente no gateway de pagamento
      const customer = await createCustomer({
        name: user.nome || company.nome || 'Cliente',
        cpfCnpj: user.cpf || '',
        email: user.email,
        phone: user.telefone || '',
      });

      // 2. Criar o pagamento no gateway
      const paymentGateway = await createPayment({
        customer: customer.id,
        billingType: paymentData.paymentMethod,
        value: selectedPlan.price,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        description: `Assinatura ${selectedPlan.name} - ${company.nome}`,
        externalReference: `empresa_${company.uid}_${Date.now()}`
      });

      // 3. Registrar o pagamento no banco de dados
      const assinaturaId = uuidv4();
      await assinaturaService.criarPagamento({
        assinatura_id: assinaturaId,
        valor: selectedPlan.price,
        tipo_pagamento: paymentData.paymentMethod,
        status: 'pending',
        gateway_id: paymentGateway.id,
        gateway_url: paymentGateway.invoiceUrl || paymentGateway.bankSlipUrl || paymentGateway.pixQrCodeUrl || '',
        data_vencimento: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        empresa_uid: company.uid
      });

      setPaymentStatus('success');
      
      toast({
        title: 'Sucesso!',
        description: 'Pagamento processado com sucesso!',
      });
      
      // Redireciona após 3 segundos
      setTimeout(() => {
        navigate('/app/dashboard');
      }, 3000);

    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      setPaymentStatus('error');
      
      toast({
        title: 'Erro',
        description: 'Não foi possível processar seu pagamento. Por favor, tente novamente.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading || !selectedPlan || !company) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="w-full min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Finalizar Assinatura</h1>
          <p className="text-muted-foreground mt-2">Escolha a forma de pagamento para ativar seu plano {selectedPlan.name}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Resumo do Plano */}
          <div className="md:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">{selectedPlan.name}</CardTitle>
                <CardDescription>{selectedPlan.description}</CardDescription>
                <div className="mt-2">
                  <span className="text-2xl font-bold">{formatCurrency(selectedPlan.price)}</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {selectedPlan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 mr-2 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center">
                <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                Pagamento seguro
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Seus dados estão protegidos com criptografia de ponta a ponta. 
                Nós não armazenamos os dados do seu cartão de crédito.
              </p>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex flex-col items-center">
                  <ShieldCheck className="h-6 w-6 text-green-500 mb-1" />
                  <span className="text-xs text-muted-foreground">Seguro</span>
                </div>
                <div className="flex flex-col items-center">
                  <Lock className="h-6 w-6 text-blue-500 mb-1" />
                  <span className="text-xs text-muted-foreground">Criptografado</span>
                </div>
                <div className="flex flex-col items-center">
                  <Shield className="h-6 w-6 text-purple-500 mb-1" />
                  <span className="text-xs text-muted-foreground">Protegido</span>
                </div>
              </div>
            </div>
          </div>

          {/* Formulário de Pagamento */}
          <div className="md:col-span-2">
            <Card>
              <CardContent className="pt-6">
                {paymentStatus === 'processing' ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mb-4" />
                    <p className="text-center">Processando seu pagamento...</p>
                  </div>
                ) : paymentStatus === 'success' ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Pagamento realizado com sucesso!</h3>
                    <p className="text-muted-foreground mb-6">Sua assinatura foi ativada com sucesso.</p>
                    <Button onClick={() => navigate('/app/dashboard')}>
                      Ir para o painel
                    </Button>
                  </div>
                ) : (
                  <Tabs 
                    value={activeTab} 
                    onValueChange={(value) => setActiveTab(value as any)}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                      <TabsTrigger value="credit-card" className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        <span>Cartão</span>
                      </TabsTrigger>
                      <TabsTrigger value="pix" className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span>PIX</span>
                      </TabsTrigger>
                      <TabsTrigger value="boleto" className="flex items-center gap-2">
                        <Barcode className="h-4 w-4" />
                        <span>Boleto</span>
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="credit-card">
                      <PaymentForm 
                        amount={selectedPlan.price}
                        onSuccess={handlePaymentSuccess}
                        onError={handlePaymentError}
                        disabled={paymentStatus === 'processing'}
                      />
                    </TabsContent>
                    
                    <TabsContent value="pix">
                      <div className="space-y-4">
                        <div className="bg-muted p-4 rounded-md text-center">
                          <DollarSign className="h-12 w-12 mx-auto text-primary mb-4" />
                          <p className="font-medium mb-2">Pague com PIX</p>
                          <p className="text-sm text-muted-foreground mb-4">
                            Gere um QR Code e pague em até 30 minutos
                          </p>
                          <Button 
                            className="w-full"
                            onClick={() => handlePaymentMethodSelect('PIX')}
                            disabled={paymentStatus === 'processing'}
                          >
                            Gerar QR Code PIX
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="boleto">
                      <div className="space-y-4">
                        <div className="bg-muted p-4 rounded-md text-center">
                          <Barcode className="h-12 w-12 mx-auto text-primary mb-4" />
                          <p className="font-medium mb-2">Boleto Bancário</p>
                          <p className="text-sm text-muted-foreground mb-4">
                            Pague em qualquer banco ou lotérica
                          </p>
                          <Button 
                            className="w-full"
                            onClick={() => handlePaymentMethodSelect('BOLETO')}
                            disabled={paymentStatus === 'processing'}
                          >
                            Emitir Boleto
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;
