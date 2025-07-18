import { config } from './config';

export interface EmbeddingProvider {
  name: string;
  dimensions: number;
  generateEmbeddings(text: string): Promise<number[]>;
}

// OpenAI Embeddings Provider
export class OpenAIEmbeddings implements EmbeddingProvider {
  name = 'openai';
  dimensions = 1536;

  constructor(private apiKey: string, private model: string = 'text-embedding-3-small') {}

  async generateEmbeddings(text: string): Promise<number[]> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          input: text,
          model: this.model,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('OpenAI embeddings error:', error);
      throw error;
    }
  }
}

// Cohere Embeddings Provider
export class CohereEmbeddings implements EmbeddingProvider {
  name = 'cohere';
  dimensions = 1024;

  constructor(private apiKey: string, private model: string = 'embed-english-v3.0') {}

  async generateEmbeddings(text: string): Promise<number[]> {
    try {
      const response = await fetch('https://api.cohere.ai/v1/embed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          texts: [text],
          model: this.model,
          input_type: 'search_document',
        }),
      });

      if (!response.ok) {
        throw new Error(`Cohere API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.embeddings[0];
    } catch (error) {
      console.error('Cohere embeddings error:', error);
      throw error;
    }
  }
}

// Local Embeddings Provider (using transformers.js)
export class LocalEmbeddings implements EmbeddingProvider {
  name = 'local';
  dimensions = 384;
  private pipeline: any = null;

  constructor(private model: string = 'sentence-transformers/all-MiniLM-L6-v2') {}

  async initialize(): Promise<void> {
    if (this.pipeline) return;

    try {
      // Dynamic import to avoid loading in SSR
      const { pipeline } = await import('@xenova/transformers');
      this.pipeline = await pipeline('feature-extraction', this.model);
    } catch (error) {
      console.error('Failed to load local embeddings model:', error);
      throw new Error('Local embeddings not available');
    }
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    if (!this.pipeline) {
      await this.initialize();
    }

    try {
      const result = await this.pipeline(text, { pooling: 'mean', normalize: true });
      return Array.from(result.data);
    } catch (error) {
      console.error('Local embeddings error:', error);
      throw error;
    }
  }
}

// Simple Hash-based Embeddings (fallback)
export class SimpleEmbeddings implements EmbeddingProvider {
  name = 'simple';
  dimensions = 384;

  async generateEmbeddings(text: string): Promise<number[]> {
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(this.dimensions).fill(0);
    
    words.forEach((word) => {
      const hash = word.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      const position = Math.abs(hash) % this.dimensions;
      embedding[position] += 1;
    });

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }
}

// Embeddings Manager
export class EmbeddingsManager {
  private provider: EmbeddingProvider;
  private cache = new Map<string, number[]>();

  constructor(provider: EmbeddingProvider) {
    this.provider = provider;
  }

  async getEmbeddings(text: string, useCache: boolean = true): Promise<number[]> {
    const cacheKey = `${text.substring(0, 100)}_${text.length}`;
    
    if (useCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const embeddings = await this.provider.generateEmbeddings(text);
      
      if (useCache) {
        this.cache.set(cacheKey, embeddings);
      }
      
      return embeddings;
    } catch (error) {
      console.error('Embeddings generation failed:', error);
      // Fallback to simple embeddings
      const simpleProvider = new SimpleEmbeddings();
      return simpleProvider.generateEmbeddings(text);
    }
  }

  getDimensions(): number {
    return this.provider.dimensions;
  }

  getProviderName(): string {
    return this.provider.name;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// Factory function to create embeddings manager
export async function createEmbeddingsManager(
  providerType: 'openai' | 'cohere' | 'local' | 'simple',
  apiKey?: string,
  model?: string
): Promise<EmbeddingsManager> {
  let provider: EmbeddingProvider;

  switch (providerType) {
    case 'openai':
      if (!apiKey) throw new Error('OpenAI API key required');
      provider = new OpenAIEmbeddings(apiKey, model);
      break;
    case 'cohere':
      if (!apiKey) throw new Error('Cohere API key required');
      provider = new CohereEmbeddings(apiKey, model);
      break;
    case 'local':
      provider = new LocalEmbeddings(model);
      await (provider as LocalEmbeddings).initialize();
      break;
    case 'simple':
    default:
      provider = new SimpleEmbeddings();
      break;
  }

  return new EmbeddingsManager(provider);
}