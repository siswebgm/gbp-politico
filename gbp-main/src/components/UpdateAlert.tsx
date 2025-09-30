import { useAppVersion } from '../hooks/useAppVersion';

export function UpdateAlert() {
  const { needsUpdate, forceUpdate } = useAppVersion();

  if (!needsUpdate) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg flex items-center gap-4">
      <span>Uma nova versão está disponível!</span>
      <button
        onClick={forceUpdate}
        className="bg-white text-blue-600 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors"
      >
        Atualizar agora
      </button>
    </div>
  );
}
