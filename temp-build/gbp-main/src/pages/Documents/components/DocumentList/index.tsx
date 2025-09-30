import { useState } from 'react';
import { FileText, Download, Share2, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Document } from '../../types';

interface DocumentListProps {
  documents: Document[];
  onEdit: (document: Document) => void;
  onDelete: (document: Document) => void;
  onShare: (document: Document) => void;
}

const documentTypeLabels = {
  law_project: 'Projeto de Lei',
  requirement: 'Requerimento',
  official_letter: 'Ofício'
};

const statusLabels = {
  draft: 'Em Elaboração',
  pending: 'Em Tramitação',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  completed: 'Concluído'
};

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800'
};

export function DocumentList({ documents, onEdit, onDelete, onShare }: DocumentListProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !selectedType || doc.type === selectedType;
    const matchesStatus = !selectedStatus || doc.status === selectedStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 gap-4">
          <input
            type="text"
            placeholder="Buscar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos os tipos</option>
            <option value="law_project">Projeto de Lei</option>
            <option value="requirement">Requerimento</option>
            <option value="official_letter">Ofício</option>
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos os status</option>
            <option value="draft">Em Elaboração</option>
            <option value="pending">Em Tramitação</option>
            <option value="approved">Aprovado</option>
            <option value="rejected">Rejeitado</option>
            <option value="completed">Concluído</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Documento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Eleitor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Data
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredDocuments.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center">
                    <FileText className="mr-3 h-5 w-5 text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900">{doc.title}</div>
                      <div className="text-sm text-gray-500">Nº {doc.number}</div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div 
                    className="text-sm text-gray-900 cursor-pointer hover:text-primary-600"
                    onClick={() => navigate(`/app/eleitores/${doc.voterId}`)}
                  >
                    {doc.voterName}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {documentTypeLabels[doc.type]}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${statusColors[doc.status]}`}>
                    {statusLabels[doc.status]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {format(doc.createdAt, 'dd/MM/yyyy')}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-3">
                    {doc.attachmentUrl && (
                      <a
                        href={doc.attachmentUrl}
                        download
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <Download className="h-5 w-5" />
                      </a>
                    )}
                    <button
                      onClick={() => onShare(doc)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <Share2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => onEdit(doc)}
                      className="text-blue-400 hover:text-blue-500"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => onDelete(doc)}
                      className="text-red-400 hover:text-red-500"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
