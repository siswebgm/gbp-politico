```tsx
import React, { useState } from 'react';
import { FileText, MessageSquare, CheckSquare } from 'lucide-react';
import { DocumentChat } from './DocumentChat';
import { ApprovalFlow } from './ApprovalFlow';
import { useAuthStore } from '../../../store/useAuthStore';
import { documentService } from '../../../services/documents';
import type { Document } from '../../../types/document';

interface DocumentDetailsProps {
  document: Document;
  onUpdate: () => void;
}

const tabs = [
  { id: 'details', label: 'Detalhes', icon: FileText },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'approvals', label: 'Aprovações', icon: CheckSquare },
];

export function DocumentDetails({ document, onUpdate }: DocumentDetailsProps) {
  const [activeTab, setActiveTab] = useState('details');
  const { user } = useAuthStore();

  const handleApprove = async (etapa: number) => {
    if (!user?.id) return;
    try {
      await documentService.updateApproval(document.id, Number(user.id), etapa, 'approved');
      onUpdate();
    } catch (error) {
      console.error('Error approving document:', error);
    }
  };

  const handleReject = async (etapa: number) => {
    if (!user?.id) return;
    try {
      await documentService.updateApproval(document.id, Number(user.id), etapa, 'rejected');
      onUpdate();
    } catch (error) {
      console.error('Error rejecting document:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b dark:border-gray-700">
        <nav className="flex space-x-4 px-4" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-3 py-2 text-sm font-medium border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'details' && (
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {document.titulo}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {document.descricao}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Status
                </p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                  {document.status}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Tipo
                </p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                  {document.tipo}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <DocumentChat
            documentId={document.id}
            messages={document.messages || []}
            onNewMessage={onUpdate}
          />
        )}

        {activeTab === 'approvals' && (
          <div className="p-4">
            <ApprovalFlow
              approvals={document.approvals || []}
              onApprove={handleApprove}
              onReject={handleReject}
              currentUserId={Number(user?.id)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
```