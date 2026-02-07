import type { KnowledgeSource } from '../../types/ai-knowledge.types';

export const mockSources: KnowledgeSource[] = [
  {
    id: '1',
    fileName: 'Employee_Handbook_2024.pdf',
    fileType: 'pdf',
    uploadedAt: new Date('2024-02-15'),
    uploadedBy: 'admin',
    status: 'ready',
    accessLevel: 'all',
    pageCount: 47,
  },
  {
    id: '3',
    fileName: 'Salary_Bands_Confidential.xlsx',
    fileType: 'xlsx',
    uploadedAt: new Date('2024-02-20'),
    uploadedBy: 'admin',
    status: 'ready',
    accessLevel: 'admin',
    pageCount: 3,
  },
  {
    id: '4',
    fileName: 'PTO_Policy_Updates.pdf',
    fileType: 'pdf',
    uploadedAt: new Date('2024-02-22'),
    uploadedBy: 'admin',
    status: 'indexing',
    accessLevel: 'all',
    pageCount: 8,
  },
  
];
