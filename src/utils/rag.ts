import { UserDocument, DocumentChunk, db } from '../db';
import { createEmbeddingsManager, EmbeddingsManager } from './embeddings';

// Global embeddings manager
let embeddingsManager: EmbeddingsManager | null = null;

// Initialize embeddings manager
export async function initializeEmbeddings(
  providerType: 'openai' | 'cohere' | 'local' | 'simple' = 'simple',
  apiKey?: string,
  model?: string
): Promise<void> {
  try {
    embeddingsManager = await createEmbeddingsManager(providerType, apiKey, model);
    console.log(`Initialized embeddings with provider: ${embeddingsManager.getProviderName()}`);
  } catch (error) {
    console.error('Failed to initialize embeddings:', error);
    // Fallback to simple embeddings
    embeddingsManager = await createEmbeddingsManager('simple');
  }
}

// Get current embeddings manager
export function getEmbeddingsManager(): EmbeddingsManager | null {
  return embeddingsManager;
}

// Simple text chunking utility
export function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunk = text.slice(start, end);

    // Try to break at sentence boundaries
    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('.');
      const lastQuestion = chunk.lastIndexOf('?');
      const lastExclamation = chunk.lastIndexOf('!');
      const lastBreak = Math.max(lastPeriod, lastQuestion, lastExclamation);

      if (lastBreak > start + chunkSize * 0.7) {
        chunk = chunk.slice(0, lastBreak + 1);
      }
    }

    chunks.push(chunk.trim());
    start = end - overlap;
  }

  return chunks.filter(chunk => chunk.length > 50); // Filter out very short chunks
}

// Simple similarity search using cosine similarity
export function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Generate embeddings using the current embeddings manager
export async function generateEmbeddings(text: string): Promise<number[]> {
  if (!embeddingsManager) {
    // Initialize with simple embeddings if not set
    await initializeEmbeddings('simple');
  }
  
  return embeddingsManager!.getEmbeddings(text);
}

// Process document and create chunks
export async function processDocument(document: UserDocument): Promise<void> {
  try {
    // Create chunks from document content
    const chunks = chunkText(document.content);
    
    // Delete existing chunks for this document
    await db.documentChunks.where('documentId').equals(document.id).delete();
    
    // Create new chunks with embeddings
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embeddings = await generateEmbeddings(chunk);
      
      await db.documentChunks.add({
        id: crypto.randomUUID(),
        documentId: document.id,
        content: chunk,
        embeddings,
        chunkIndex: i,
        createdAt: new Date(),
      });
    }
  } catch (error) {
    console.error('Error processing document:', error);
    throw error;
  }
}

// Search for relevant chunks
export async function searchChunks(query: string, limit: number = 5): Promise<DocumentChunk[]> {
  try {
    const queryEmbedding = await generateEmbeddings(query);
    const allChunks = await db.documentChunks.toArray();
    
    // Calculate similarities
    const chunksWithSimilarity = await Promise.all(allChunks.map(async chunk => ({
      ...chunk,
      similarity: chunk.embeddings ? calculateCosineSimilarity(queryEmbedding, chunk.embeddings) : 0
    })));
    
    // Sort by similarity and return top results
    return chunksWithSimilarity
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(({ similarity, ...chunk }) => chunk);
  } catch (error) {
    console.error('Error searching chunks:', error);
    return [];
  }
}

// Get context from relevant documents
export async function getRelevantContext(query: string, maxChunks: number = 3): Promise<string> {
  try {
    const relevantChunks = await searchChunks(query, maxChunks);
    
    if (relevantChunks.length === 0) {
      return '';
    }
    
    // Get document titles for context
    const documentIds = [...new Set(relevantChunks.map(chunk => chunk.documentId))];
    const documents = await db.userDocuments.where('id').anyOf(documentIds).toArray();
    const documentMap = new Map(documents.map(doc => [doc.id, doc]));
    
    // Build context string
    const contextParts = relevantChunks.map(chunk => {
      const document = documentMap.get(chunk.documentId);
      return `[From: ${document?.title || 'Unknown Document'}]\n${chunk.content}`;
    });
    
    return contextParts.join('\n\n');
  } catch (error) {
    console.error('Error getting relevant context:', error);
    return '';
  }
}

// Process all documents in the database
export async function processAllDocuments(): Promise<void> {
  try {
    const documents = await db.userDocuments.toArray();
    
    for (const document of documents) {
      await processDocument(document);
    }
  } catch (error) {
    console.error('Error processing all documents:', error);
    throw error;
  }
}