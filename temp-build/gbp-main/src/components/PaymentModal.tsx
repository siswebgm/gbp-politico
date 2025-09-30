import { useState } from 'react';
import { QrCode, CreditCard, Copy, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PaymentService } from '../services/PaymentService';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../utils/format';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planoId: string;
  empresaUid: string;
  planoNome: string;
  planoValor: number;
}

export function PaymentModal({
  isOpen,
  onClose,
  planoId,
  empresaUid,
  planoNome,
  planoValor
}: PaymentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'boleto' | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const handleSelectPaymentMethod = async (method: 'pix' | 'boleto') => {
    try {
      setIsLoading(true);
      setPaymentMethod(method);

      // Cria a assinatura
      const assinatura = await PaymentService.createSubscription(empresaUid, planoId);

      // Gera o pagamento
      const payment = await PaymentService.generatePayment(assinatura.id, method);
      setPaymentData(payment);
    } catch (error) {
      console.error('Erro ao gerar pagamento:', error);
      toast.error('Erro ao gerar pagamento. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPixCode = () => {
    if (paymentData?.pixCopyPaste) {
      navigator.clipboard.writeText(paymentData.pixCopyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Código PIX copiado!');
    }
  };

  const handleOpenBoleto = () => {
    if (paymentData?.paymentUrl) {
      window.open(paymentData.paymentUrl, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pagamento - {planoNome}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="text-center mb-6">
            <p className="text-3xl font-bold text-blue-600">
              {formatCurrency(planoValor)}
            </p>
          </div>

          {!paymentMethod ? (
            <div className="space-y-4">
              <p className="text-center text-gray-600 mb-4">
                Escolha como deseja pagar:
              </p>
              <Button
                onClick={() => handleSelectPaymentMethod('pix')}
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={isLoading}
              >
                <QrCode className="w-4 h-4 mr-2" />
                Pagar com PIX
              </Button>
              <Button
                onClick={() => handleSelectPaymentMethod('boleto')}
                className="w-full"
                variant="outline"
                disabled={isLoading}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Pagar com Boleto
              </Button>
            </div>
          ) : paymentMethod === 'pix' ? (
            <div className="space-y-4">
              {paymentData?.qrCode && (
                <div className="flex justify-center">
                  <img
                    src={`data:image/png;base64,${paymentData.qrCode}`}
                    alt="QR Code PIX"
                    className="w-48 h-48"
                  />
                </div>
              )}
              <Button
                onClick={handleCopyPixCode}
                className="w-full"
                variant="outline"
                disabled={!paymentData?.pixCopyPaste}
              >
                {copied ? (
                  <Check className="w-4 h-4 mr-2" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                {copied ? 'Copiado!' : 'Copiar código PIX'}
              </Button>
              <p className="text-sm text-center text-gray-500">
                Escaneie o QR Code ou copie o código PIX para pagar
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-gray-600 mb-4">
                Clique no botão abaixo para visualizar o boleto:
              </p>
              <Button
                onClick={handleOpenBoleto}
                className="w-full"
                disabled={!paymentData?.paymentUrl}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Abrir Boleto
              </Button>
              <p className="text-sm text-center text-gray-500">
                O boleto será aberto em uma nova janela
              </p>
            </div>
          )}

          {paymentMethod && (
            <Button
              onClick={() => {
                setPaymentMethod(null);
                setPaymentData(null);
              }}
              className="w-full mt-4"
              variant="outline"
            >
              Escolher outro método de pagamento
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 