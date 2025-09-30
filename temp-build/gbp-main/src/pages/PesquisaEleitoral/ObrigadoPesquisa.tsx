import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { CheckCircle } from 'lucide-react';

export function ObrigadoPesquisa() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Obrigado por participar!
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sua opinião é muito importante para nós. Agradecemos por dedicar seu tempo para responder nossa pesquisa.
          </p>
          <div className="mt-8">
            <Button 
              onClick={() => window.location.href = 'https://www.google.com/'}
              className="px-6"
            >
              Sair da pesquisa
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ObrigadoPesquisa;
