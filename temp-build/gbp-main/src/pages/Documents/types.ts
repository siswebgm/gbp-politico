export type DocumentStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'completed';

export type DocumentType = 'law_project' | 'requirement' | 'official_letter' | 'minutes' | 'resolution' | 'ordinance';

export interface Document {
  id: string;
  title: string;
  type: DocumentType;
  number: string;
  createdAt: Date;
  description?: string;
  attachmentUrl?: string;
  status: DocumentStatus;
  voterId: string;
  voterName: string;
  
  // Law Project specific fields
  authors?: string[];
  presentationDate?: Date;
  
  // Requirement specific fields
  destination?: string;
  responseDeadline?: Date;
  
  // Official Letter specific fields
  sender?: string;
  recipient?: string;
}

export interface DocumentFormData extends Omit<Document, 'id' | 'createdAt'> {
  attachment?: File;
}
