import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2, CreditCard } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface PaymentFormProps {
  amount: number;
  onSuccess: (paymentMethod: any) => void;
  onError: (error: Error) => void;
  disabled?: boolean;
}

export function PaymentForm({ amount, onSuccess, onError, disabled = false }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [cardComplete, setCardComplete] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement)!,
        billing_details: {
          name,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao processar o cartão');
      }

      onSuccess(paymentMethod);
    } catch (error) {
      console.error('Erro no pagamento:', error);
      onError(error instanceof Error ? error : new Error('Erro ao processar o pagamento'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="cardholder-name">Nome no Cartão</Label>
          <Input
            id="cardholder-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome como está no cartão"
            className="mt-1"
            required
          />
        </div>

        <div>
          <Label>Detalhes do Cartão</Label>
          <div className="mt-1 p-3 border rounded-md">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#1a1a1a',
                    '::placeholder': {
                      color: '#a0aec0',
                    },
                  },
                },
              }}
              onChange={(e) => setCardComplete(e.complete)}
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-500">Total a pagar:</span>
          <span className="text-lg font-bold">{formatCurrency(amount)}</span>
        </div>
      </div>

      <Button
        type="submit"
        disabled={!stripe || !cardComplete || !name || isLoading || disabled}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processando...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pagar {formatCurrency(amount)}
          </>
        )}
      </Button>

      <div className="text-xs text-center text-gray-500 mt-4">
        <p>Seu pagamento é processado de forma segura com criptografia de ponta a ponta.</p>
      </div>
    </form>
  );
}

export default PaymentForm;
