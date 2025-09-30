import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { VoterFormContent } from '../VoterForm/components/VoterFormContent';

export function EditarEleitor() {
  return (
    <div className="min-h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-2">
          <Link 
            to="/app/eleitores"
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">
            Editar Eleitor
          </h1>
        </div>
      </div>

      {/* Form Content */}
      <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <VoterFormContent />
      </div>
    </div>
  );
}
