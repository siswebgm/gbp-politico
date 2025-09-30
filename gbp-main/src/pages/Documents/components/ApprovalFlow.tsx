```tsx
import React from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import type { DocumentApproval } from '../../../types/document';

interface ApprovalFlowProps {
  approvals: DocumentApproval[];
  onApprove: (etapa: number) => void;
  onReject: (etapa: number) => void;
  currentUserId: number;
}

export function ApprovalFlow({ approvals, onApprove, onReject, currentUserId }: ApprovalFlowProps) {
  const isUserApprover = (approval: DocumentApproval) => approval.usuario_id === currentUserId;
  const isPending = (approval: DocumentApproval) => approval.status === 'pending';

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        Fluxo de Aprovação
      </h3>

      <div className="space-y-4">
        {approvals.map((approval) => (
          <div
            key={approval.id}
            className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center space-x-4">
              {approval.status === 'approved' && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              {approval.status === 'rejected' && (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              {approval.status === 'pending' && (
                <Clock className="h-5 w-5 text-yellow-500" />
              )}

              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Etapa {approval.etapa}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {approval.usuario_id === currentUserId ? 'Você' : 'Outro aprovador'}
                </p>
              </div>
            </div>

            {isUserApprover(approval) && isPending(approval) && (
              <div className="flex space-x-2">
                <button
                  onClick={() => onApprove(approval.etapa)}
                  className="px-3 py-1 text-sm text-white bg-green-500 rounded-md hover:bg-green-600"
                >
                  Aprovar
                </button>
                <button
                  onClick={() => onReject(approval.etapa)}
                  className="px-3 py-1 text-sm text-white bg-red-500 rounded-md hover:bg-red-600"
                >
                  Rejeitar
                </button>
              </div>
            )}

            {!isPending(approval) && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {approval.data_aprovacao
                  ? new Date(approval.data_aprovacao).toLocaleDateString()
                  : '-'}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```