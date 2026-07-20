import { delay, mockDocuments } from '@/features/_shared/mockData';
import type { Document } from '@/types';

export interface DocumentsRepository {
  list(): Promise<Document[]>;
  getById(id: string): Promise<Document | null>;
  approve(id: string): Promise<Document>;
  requestChanges(id: string, reason: string): Promise<Document>;
}

class MockDocumentsRepository implements DocumentsRepository {
  async list(): Promise<Document[]> {
    await delay();
    return [...mockDocuments];
  }

  async getById(id: string): Promise<Document | null> {
    await delay();
    return mockDocuments.find((doc) => doc.id === id) ?? null;
  }

  async approve(id: string): Promise<Document> {
    await delay();
    const doc = mockDocuments.find((item) => item.id === id);
    if (!doc) throw new Error('document_not_found');
    doc.status = 'approved';
    doc.updatedAt = new Date().toISOString();
    return doc;
  }

  async requestChanges(id: string, _reason: string): Promise<Document> {
    await delay();
    const doc = mockDocuments.find((item) => item.id === id);
    if (!doc) throw new Error('document_not_found');
    doc.status = 'changes_requested';
    doc.updatedAt = new Date().toISOString();
    return doc;
  }
}

export function createDocumentsRepository(): DocumentsRepository {
  return new MockDocumentsRepository();
}
