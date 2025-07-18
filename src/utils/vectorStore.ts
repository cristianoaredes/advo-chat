import { DocumentChunk } from '../db';
import { EmbeddingsManager } from './embeddings';

export interface VectorStore {
  name: string;
  addChunks(chunks: DocumentChunk[]): Promise<void>;
  searchChunks(query: string, limit: number): Promise<DocumentChunk[]>;
  deleteChunks(documentId: string): Promise<void>;
  clear(): Promise<void>;
}

// Local Vector Store (using IndexedDB)
export class LocalVectorStore implements VectorStore {
  name = 'local';

  async addChunks(chunks: DocumentChunk[]): Promise<void> {
    // Chunks are already stored in IndexedDB via the RAG system
    // This is just a wrapper for compatibility
    console.log(`Added ${chunks.length} chunks to local vector store`);
  }

  async searchChunks(query: string, limit: number): Promise<DocumentChunk[]> {
    // This will be handled by the RAG system
    return [];
  }

  async deleteChunks(documentId: string): Promise<void> {
    // This will be handled by the RAG system
    console.log(`Deleted chunks for document ${documentId} from local vector store`);
  }

  async clear(): Promise<void> {
    // This will be handled by the RAG system
    console.log('Cleared local vector store');
  }
}

// Pinecone Vector Store
export class PineconeVectorStore implements VectorStore {
  name = 'pinecone';
  private apiKey: string;
  private environment: string;
  private indexName: string;
  private namespace: string;

  constructor(apiKey: string, environment: string, indexName: string, namespace: string = 'default') {
    this.apiKey = apiKey;
    this.environment = environment;
    this.indexName = indexName;
    this.namespace = namespace;
  }

  private async makeRequest(endpoint: string, method: string, body?: any): Promise<any> {
    const url = `https://${this.indexName}-${this.environment}.svc.${this.environment}.pinecone.io${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Api-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Pinecone API error: ${response.statusText}`);
    }

    return response.json();
  }

  async addChunks(chunks: DocumentChunk[]): Promise<void> {
    if (chunks.length === 0) return;

    const vectors = chunks.map(chunk => ({
      id: chunk.id,
      values: chunk.embeddings || [],
      metadata: {
        content: chunk.content,
        documentId: chunk.documentId,
        chunkIndex: chunk.chunkIndex,
        createdAt: chunk.createdAt.toISOString(),
      },
    }));

    // Pinecone has a limit of 100 vectors per request
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      
      await this.makeRequest('/vectors/upsert', 'POST', {
        vectors: batch,
        namespace: this.namespace,
      });
    }

    console.log(`Added ${chunks.length} chunks to Pinecone`);
  }

  async searchChunks(query: string, limit: number): Promise<DocumentChunk[]> {
    // Get embeddings for the query
    const { createEmbeddingsManager } = await import('./embeddings');
    const embeddingsManager = await createEmbeddingsManager('openai', this.apiKey);
    const queryEmbedding = await embeddingsManager.getEmbeddings(query);

    const response = await this.makeRequest('/query', 'POST', {
      vector: queryEmbedding,
      topK: limit,
      includeMetadata: true,
      namespace: this.namespace,
    });

    return response.matches.map((match: any) => ({
      id: match.id,
      documentId: match.metadata.documentId,
      content: match.metadata.content,
      chunkIndex: match.metadata.chunkIndex,
      embeddings: match.values,
      createdAt: new Date(match.metadata.createdAt),
    }));
  }

  async deleteChunks(documentId: string): Promise<void> {
    // Pinecone doesn't support deleting by metadata, so we need to store IDs
    // For now, we'll just log this - in a real implementation, you'd track chunk IDs
    console.log(`Would delete chunks for document ${documentId} from Pinecone`);
  }

  async clear(): Promise<void> {
    // Pinecone doesn't support clearing all vectors easily
    // In a real implementation, you'd need to track all vector IDs
    console.log('Cannot clear Pinecone index - use Pinecone console to delete vectors');
  }
}

// Vector Store Manager
export class VectorStoreManager {
  private vectorStore: VectorStore;

  constructor(vectorStore: VectorStore) {
    this.vectorStore = vectorStore;
  }

  async addChunks(chunks: DocumentChunk[]): Promise<void> {
    return this.vectorStore.addChunks(chunks);
  }

  async searchChunks(query: string, limit: number): Promise<DocumentChunk[]> {
    return this.vectorStore.searchChunks(query, limit);
  }

  async deleteChunks(documentId: string): Promise<void> {
    return this.vectorStore.deleteChunks(documentId);
  }

  async clear(): Promise<void> {
    return this.vectorStore.clear();
  }

  getName(): string {
    return this.vectorStore.name;
  }
}

// Factory function to create vector store manager
export async function createVectorStoreManager(
  storeType: 'local' | 'pinecone',
  config?: {
    apiKey?: string;
    environment?: string;
    indexName?: string;
    namespace?: string;
  }
): Promise<VectorStoreManager> {
  let vectorStore: VectorStore;

  switch (storeType) {
    case 'pinecone':
      if (!config?.apiKey || !config?.environment || !config?.indexName) {
        throw new Error('Pinecone configuration required: apiKey, environment, indexName');
      }
      vectorStore = new PineconeVectorStore(
        config.apiKey,
        config.environment,
        config.indexName,
        config.namespace
      );
      break;
    case 'local':
    default:
      vectorStore = new LocalVectorStore();
      break;
  }

  return new VectorStoreManager(vectorStore);
}