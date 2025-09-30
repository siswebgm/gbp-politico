import { useRouteError } from 'react-router-dom';

export function ErrorBoundary() {
  const error = useRouteError();
  console.error(error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Oops!</h1>
        <p className="text-gray-600 mb-4">Algo deu errado.</p>
        <p className="text-sm text-gray-500">
          {error instanceof Error ? error.message : 'Um erro inesperado ocorreu'}
        </p>
      </div>
    </div>
  );
}
