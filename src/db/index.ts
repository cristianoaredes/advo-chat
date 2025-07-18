import Dexie, { Table } from "dexie";
import "dexie-export-import";
import { config } from "../utils/config";

export interface Chat {
  id: string;
  description: string;
  totalTokens: number;
  createdAt: Date;
  pinned: boolean;
}

export interface Message {
  id: string;
  chatId: string;
  role: "system" | "assistant" | "user";
  content: string;
  createdAt: Date;
}

export interface Prompt {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
}

export interface Settings {
  id: "general";
  openAiApiKey?: string;
  openAiModel?: string;
  openAiApiType?: 'openai' | 'custom';
  openAiApiAuth?: 'none' | 'bearer-token' | 'api-key';
  openAiApiBase?: string;
  openAiApiVersion?: string;
}

// New interfaces for agents and RAG
export interface Agent {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  capabilities: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDocument {
  id: string;
  title: string;
  content: string;
  type: 'pdf' | 'doc' | 'webpage' | 'text';
  source: string;
  metadata?: Record<string, any>;
  embeddings?: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embeddings?: number[];
  chunkIndex: number;
  createdAt: Date;
}

export interface LearningSession {
  id: string;
  chatId: string;
  agentId?: string;
  userFeedback: 'positive' | 'negative' | 'neutral';
  feedbackNotes?: string;
  responseQuality: number; // 1-10 scale
  createdAt: Date;
}

export interface AgentPerformance {
  id: string;
  agentId: string;
  totalInteractions: number;
  averageResponseQuality: number;
  userSatisfactionScore: number;
  lastUsed: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Database extends Dexie {
  chats!: Table<Chat>;
  messages!: Table<Message>;
  prompts!: Table<Prompt>;
  settings!: Table<Settings>;
  agents!: Table<Agent>;
  userDocuments!: Table<UserDocument>;
  documentChunks!: Table<DocumentChunk>;
  learningSessions!: Table<LearningSession>;
  agentPerformance!: Table<AgentPerformance>;

  constructor() {
    super("chatpad");
    this.version(3).stores({
      chats: "id, createdAt",
      messages: "id, chatId, createdAt",
      prompts: "id, createdAt",
      settings: "id",
      agents: "id, isActive, createdAt",
      userDocuments: "id, type, createdAt",
      documentChunks: "id, documentId, chunkIndex, createdAt",
      learningSessions: "id, chatId, agentId, createdAt",
      agentPerformance: "id, agentId, lastUsed, createdAt",
    });

    this.on("populate", async () => {
      db.settings.add({
        id: "general",
        openAiModel: config.defaultModel,
        openAiApiType: config.defaultType,
        openAiApiAuth: config.defaultAuth,
        ...(config.defaultKey != '' && { openAiApiKey: config.defaultKey }),
        ...(config.defaultBase != '' && { openAiApiBase: config.defaultBase }),
        ...(config.defaultVersion != '' && { openAiApiVersion: config.defaultVersion }),
      });

      // Initialize default agents
      await this.initializeDefaultAgents();
    });
  }

  private async initializeDefaultAgents() {
    const defaultAgents: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: "Research Assistant",
        description: "Specialized in research, analysis, and information gathering",
        systemPrompt: "You are a research assistant. Your role is to help users find, analyze, and synthesize information from various sources. Always provide well-researched, accurate information with proper citations when possible.",
        capabilities: ["research", "analysis", "synthesis", "citation"],
        isActive: true,
      },
      {
        name: "Writing Coach",
        description: "Expert in writing, editing, and content creation",
        systemPrompt: "You are a writing coach and editor. Help users improve their writing by providing constructive feedback, suggestions for clarity and style, and guidance on structure and flow.",
        capabilities: ["writing", "editing", "style", "structure"],
        isActive: true,
      },
      {
        name: "Code Assistant",
        description: "Specialized in programming, debugging, and technical solutions",
        systemPrompt: "You are a programming assistant. Help users write, debug, and optimize code. Provide clear explanations, best practices, and practical solutions for technical problems.",
        capabilities: ["programming", "debugging", "optimization", "best-practices"],
        isActive: true,
      },
      {
        name: "Creative Partner",
        description: "Focused on creative ideation, brainstorming, and artistic projects",
        systemPrompt: "You are a creative partner. Help users brainstorm ideas, develop creative concepts, and explore artistic and innovative solutions. Encourage out-of-the-box thinking.",
        capabilities: ["ideation", "brainstorming", "creativity", "innovation"],
        isActive: true,
      }
    ];

    for (const agent of defaultAgents) {
      await this.agents.add({
        ...agent,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }
}

export const db = new Database();
