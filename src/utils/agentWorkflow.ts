import { Agent, db } from '../db';
import { createChatCompletion } from './openai';

export interface WorkflowStep {
  id: string;
  agentId: string;
  input: string;
  output?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  metadata?: Record<string, any>;
}

export interface AgentWorkflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  status: 'draft' | 'active' | 'paused' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  steps: Array<{
    agentId: string;
    inputTemplate: string;
    description: string;
  }>;
}

// Predefined workflow templates
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'research-write',
    name: 'Research & Write',
    description: 'Research a topic and write a comprehensive article',
    steps: [
      {
        agentId: 'research-assistant',
        inputTemplate: 'Research the following topic thoroughly: {topic}',
        description: 'Research the topic',
      },
      {
        agentId: 'writing-coach',
        inputTemplate: 'Based on this research: {previous_output}, write a comprehensive article about {topic}',
        description: 'Write the article',
      },
    ],
  },
  {
    id: 'code-review',
    name: 'Code Review & Improve',
    description: 'Review code and suggest improvements',
    steps: [
      {
        agentId: 'code-assistant',
        inputTemplate: 'Review this code and identify issues: {code}',
        description: 'Review the code',
      },
      {
        agentId: 'code-assistant',
        inputTemplate: 'Based on the review: {previous_output}, provide improved code for: {code}',
        description: 'Improve the code',
      },
    ],
  },
  {
    id: 'creative-brainstorm',
    name: 'Creative Brainstorm',
    description: 'Generate creative ideas and develop them',
    steps: [
      {
        agentId: 'creative-partner',
        inputTemplate: 'Brainstorm creative ideas for: {topic}',
        description: 'Generate ideas',
      },
      {
        agentId: 'creative-partner',
        inputTemplate: 'Develop the best ideas from: {previous_output} into detailed concepts',
        description: 'Develop concepts',
      },
    ],
  },
];

export class WorkflowManager {
  private workflows: Map<string, AgentWorkflow> = new Map();

  // Create a new workflow from template
  async createWorkflowFromTemplate(
    templateId: string,
    name: string,
    description: string,
    variables: Record<string, string>
  ): Promise<AgentWorkflow> {
    const template = WORKFLOW_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`Workflow template ${templateId} not found`);
    }

    const workflow: AgentWorkflow = {
      id: crypto.randomUUID(),
      name,
      description,
      steps: template.steps.map((step, index) => ({
        id: crypto.randomUUID(),
        agentId: step.agentId,
        input: this.replaceVariables(step.inputTemplate, variables),
        status: 'pending',
        metadata: {
          description: step.description,
          stepIndex: index,
        },
      })),
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  // Execute a workflow
  async executeWorkflow(workflowId: string, apiKey: string): Promise<AgentWorkflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    let previousOutput = '';

    for (const step of workflow.steps) {
      try {
        step.status = 'running';
        workflow.updatedAt = new Date();

        // Get the agent for this step
        const agent = await db.agents.get(step.agentId);
        if (!agent) {
          throw new Error(`Agent ${step.agentId} not found`);
        }

        // Prepare the input with previous output if available
        let input = step.input;
        if (previousOutput && input.includes('{previous_output}')) {
          input = input.replace('{previous_output}', previousOutput);
        }

        // Execute the step
        const response = await createChatCompletion(apiKey, [
          {
            role: 'system',
            content: agent.systemPrompt,
          },
          {
            role: 'user',
            content: input,
          },
        ]);

        step.output = response.data.choices[0].message?.content || '';
        step.status = 'completed';
        previousOutput = step.output;

      } catch (error) {
        step.status = 'failed';
        step.error = error instanceof Error ? error.message : 'Unknown error';
        workflow.status = 'paused';
        break;
      }
    }

    if (workflow.steps.every(step => step.status === 'completed')) {
      workflow.status = 'completed';
    }

    return workflow;
  }

  // Get workflow by ID
  getWorkflow(workflowId: string): AgentWorkflow | undefined {
    return this.workflows.get(workflowId);
  }

  // Get all workflows
  getAllWorkflows(): AgentWorkflow[] {
    return Array.from(this.workflows.values());
  }

  // Delete workflow
  deleteWorkflow(workflowId: string): boolean {
    return this.workflows.delete(workflowId);
  }

  // Replace variables in template strings
  private replaceVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    return result;
  }
}

// Workflow execution with progress tracking
export class WorkflowExecutor {
  private workflowManager: WorkflowManager;
  private onProgress?: (workflow: AgentWorkflow) => void;

  constructor(onProgress?: (workflow: AgentWorkflow) => void) {
    this.workflowManager = new WorkflowManager();
    this.onProgress = onProgress;
  }

  async executeWorkflowWithProgress(
    templateId: string,
    name: string,
    description: string,
    variables: Record<string, string>,
    apiKey: string
  ): Promise<AgentWorkflow> {
    // Create workflow
    const workflow = await this.workflowManager.createWorkflowFromTemplate(
      templateId,
      name,
      description,
      variables
    );

    if (this.onProgress) {
      this.onProgress(workflow);
    }

    // Execute workflow
    const result = await this.workflowManager.executeWorkflow(workflow.id, apiKey);

    if (this.onProgress) {
      this.onProgress(result);
    }

    return result;
  }

  getWorkflowManager(): WorkflowManager {
    return this.workflowManager;
  }
}

// Workflow builder for custom workflows
export class WorkflowBuilder {
  private steps: Array<{
    agentId: string;
    inputTemplate: string;
    description: string;
  }> = [];

  addStep(agentId: string, inputTemplate: string, description: string): WorkflowBuilder {
    this.steps.push({ agentId, inputTemplate, description });
    return this;
  }

  build(name: string, description: string): WorkflowTemplate {
    return {
      id: crypto.randomUUID(),
      name,
      description,
      steps: this.steps,
    };
  }
}