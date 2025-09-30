import { useRouter } from 'next/router';
import { Button as MuiButton, Typography as MuiTypography } from '@mui/material';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="text-center">
        <MuiTypography variant="h1" className="text-6xl font-bold text-gray-900 mb-4">
          404
        </MuiTypography>
        <MuiTypography variant="h2" className="text-2xl font-semibold text-gray-700 mb-4">
          Página não encontrada
        </MuiTypography>
        <MuiTypography className="text-gray-500 mb-8">
          O formulário que você está procurando não está disponível no momento.
        </MuiTypography>
        <MuiButton
          variant="contained"
          color="primary"
          onClick={() => router.push('/')}
        >
          Voltar para o início
        </MuiButton>
      </div>
    </div>
  );
}
