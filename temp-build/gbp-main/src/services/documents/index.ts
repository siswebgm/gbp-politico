import { createDocument } from './create';
import { listDocuments } from './list';
import { updateDocument } from './update';
import { deleteDocument } from './delete';
import { addDocumentTag } from './tags';
import { addDocumentMessage } from './messages';
import { updateDocumentApproval } from './approvals';

export const documentService = {
  create: createDocument,
  list: listDocuments,
  update: updateDocument,
  delete: deleteDocument,
  addTag: addDocumentTag,
  addMessage: addDocumentMessage,
  updateApproval: updateDocumentApproval,
};