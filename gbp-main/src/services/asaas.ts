import axios from 'axios';
import { handleAxiosError } from '../utils/errorHandling';

const ASAAS_API = 'https://sandbox.asaas.com/api/v3';
const ASAAS_TOKEN = '$aact_YTU5YTE0M2M2N2I4MTliNzk0YTI5N2U5MzdjNWZmNDQ6OjAwMDAwMDAwMDAwMDAwNTc1NDI6OiRhYWNoXzgwZmE4NjBjLTc4NjYtNDJiYS05ZDZiLTI5ZmQ3ZTg5NjVkNw==';

const api = axios.create({
  baseURL: ASAAS_API,
  headers: {
    'Content-Type': 'application/json',
    access_token: ASAAS_TOKEN,
  },
  timeout: 10000, // 10 second timeout
});

export interface AsaasCustomer {
  id: string;
  name: string;
  cpfCnpj: string;
  phone: string;
  notificationDisabled: boolean;
}

export interface AsaasPayment {
  id: string;
  customer: string;
  billingType: 'PIX';
  value: number;
  dueDate: string;
  description: string;
  externalReference?: string;
  discount?: {
    value: number;
    dueDateLimitDays: number;
  };
  fine?: {
    value: number;
  };
  interest?: {
    value: number;
  };
}

export const asaasService = {
  createCustomer: async (data: Omit<AsaasCustomer, 'id'>): Promise<AsaasCustomer> => {
    try {
      const response = await api.post('/customers', {
        ...data,
        notificationDisabled: true,
      });
      return response.data;
    } catch (error) {
      throw handleAxiosError(error, 'criar cliente ASAAS');
    }
  },

  createPayment: async (data: Omit<AsaasPayment, 'id'>): Promise<AsaasPayment> => {
    try {
      const response = await api.post('/payments', {
        ...data,
        billingType: 'PIX',
        discount: {
          value: 0,
          dueDateLimitDays: 0,
        },
        fine: {
          value: 0,
        },
        interest: {
          value: 0,
        },
      });
      return response.data;
    } catch (error) {
      throw handleAxiosError(error, 'criar cobrança ASAAS');
    }
  },

  getPaymentStatus: async (id: string): Promise<string> => {
    try {
      const response = await api.get(`/payments/${id}/status`);
      return response.data.status;
    } catch (error) {
      throw handleAxiosError(error, 'verificar status do pagamento');
    }
  },

  getPixQRCode: async (id: string): Promise<{ encodedImage: string; payload: string }> => {
    try {
      const response = await api.get(`/payments/${id}/pixQrCode`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error, 'gerar QR Code PIX');
    }
  },
};