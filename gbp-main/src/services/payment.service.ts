import axios from 'axios';

// Configuração do cliente Asaas
const asaasApi = axios.create({
  baseURL: import.meta.env.VITE_ASAAS_ENV === 'production' 
    ? 'https://www.asaas.com/api/v3' 
    : 'https://sandbox.asaas.com/api/v3',
  headers: {
    'Content-Type': 'application/json',
    'access_token': import.meta.env.VITE_ASAAS_API_KEY || ''
  }
});

interface CustomerData {
  name: string;
  cpfCnpj: string;
  email: string;
  phone: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
}

interface PaymentData {
  customer: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
}

/**
 * Cria um novo cliente no Asaas
 */
export async function createCustomer(customerData: CustomerData) {
  try {
    const response = await asaasApi.post('/customers', {
      name: customerData.name,
      cpfCnpj: customerData.cpfCnpj.replace(/[^\d]/g, ''), // Remove formatação
      email: customerData.email,
      mobilePhone: customerData.phone.replace(/[^\d]/g, ''), // Remove formatação
      address: customerData.address,
      addressNumber: customerData.addressNumber,
      complement: customerData.complement,
      province: customerData.province,
      postalCode: customerData.postalCode?.replace(/[^\d]/g, ''), // Remove formatação
      notificationDisabled: false,
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao criar cliente no Asaas:', error);
    throw error;
  }
}

/**
 * Cria um novo pagamento no Asaas
 */
export async function createPayment(paymentData: PaymentData) {
  try {
    const response = await asaasApi.post('/payments', paymentData);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar pagamento no Asaas:', error);
    throw error;
  }
}

/**
 * Obtém o status de um pagamento
 */
export async function getPaymentStatus(paymentId: string) {
  try {
    const response = await asaasApi.get(`/payments/${paymentId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao obter status do pagamento:', error);
    throw error;
  }
}

/**
 * Cria uma assinatura recorrente
 */
export async function createSubscription(subscriptionData: {
  customer: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
  value: number;
  nextDueDate: string;
  cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
  description?: string;
  maxPayments?: number;
  externalReference?: string;
}) {
  try {
    const response = await asaasApi.post('/subscriptions', subscriptionData);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar assinatura no Asaas:', error);
    throw error;
  }
}

/**
 * Cria um token de cartão de crédito para cobranças futuras
 */
export async function createCreditCardToken(creditCardData: {
  customer: string;
  creditCard: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    addressComplement?: string;
    phone: string;
  };
}) {
  try {
    const response = await asaasApi.post('/creditCard/tokenize', creditCardData);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar token de cartão de crédito:', error);
    throw error;
  }
}
