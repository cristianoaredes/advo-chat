import React, { useState } from 'react';
import { Stack, Title, Button, Group, Text, SimpleGrid, Modal, TextInput, Textarea, Select, Card, Badge } from '@mantine/core';
import { IconPlus, IconPlay, IconWorkflow } from '@tabler/icons-react';
import { WorkflowCard } from './WorkflowCard';
import { AgentWorkflow, WorkflowExecutor, WORKFLOW_TEMPLATES } from '../utils/agentWorkflow';
import { notifications } from '@mantine/notifications';
import { db } from '../db';

export function Workflows() {
  const [workflows, setWorkflows] = useState<AgentWorkflow[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [executingWorkflow, setExecutingWorkflow] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    templateId: '',
    name: '',
    description: '',
    variables: {} as Record<string, string>,
  });

  const workflowExecutor = new WorkflowExecutor((workflow) => {
    // Update workflow in the list
    setWorkflows(prev => {
      const index = prev.findIndex(w => w.id === workflow.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = workflow;
        return updated;
      } else {
        return [...prev, workflow];
      }
    });
  });

  const handleCreateWorkflow = async () => {
    try {
      const apiKey = (await db.settings.where({ id: "general" }).first())?.openAiApiKey;
      if (!apiKey) {
        notifications.show({
          title: 'Error',
          message: 'OpenAI API key required to execute workflows',
          color: 'red',
        });
        return;
      }

      const workflow = await workflowExecutor.executeWorkflowWithProgress(
        formData.templateId,
        formData.name,
        formData.description,
        formData.variables,
        apiKey
      );

      setCreateModalOpen(false);
      setFormData({
        templateId: '',
        name: '',
        description: '',
        variables: {},
      });

      notifications.show({
        title: 'Success',
        message: 'Workflow created and executed successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to create workflow',
        color: 'red',
      });
    }
  };

  const handleExecuteWorkflow = async (workflowId: string) => {
    try {
      setExecutingWorkflow(workflowId);
      const apiKey = (await db.settings.where({ id: "general" }).first())?.openAiApiKey;
      if (!apiKey) {
        notifications.show({
          title: 'Error',
          message: 'OpenAI API key required to execute workflows',
          color: 'red',
        });
        return;
      }

      const workflowManager = workflowExecutor.getWorkflowManager();
      await workflowManager.executeWorkflow(workflowId, apiKey);

      notifications.show({
        title: 'Success',
        message: 'Workflow executed successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to execute workflow',
        color: 'red',
      });
    } finally {
      setExecutingWorkflow(null);
    }
  };

  const handleDeleteWorkflow = (workflowId: string) => {
    const workflowManager = workflowExecutor.getWorkflowManager();
    workflowManager.deleteWorkflow(workflowId);
    setWorkflows(prev => prev.filter(w => w.id !== workflowId));
    notifications.show({
      title: 'Success',
      message: 'Workflow deleted successfully',
      color: 'green',
    });
  };

  const handlePauseWorkflow = (workflowId: string) => {
    setWorkflows(prev => prev.map(w => 
      w.id === workflowId ? { ...w, status: 'paused' as const } : w
    ));
    notifications.show({
      title: 'Success',
      message: 'Workflow paused successfully',
      color: 'yellow',
    });
  };

  const getTemplateVariables = (templateId: string): string[] => {
    const template = WORKFLOW_TEMPLATES.find(t => t.id === templateId);
    if (!template) return [];

    const variables = new Set<string>();
    template.steps.forEach(step => {
      const matches = step.inputTemplate.match(/\{([^}]+)\}/g);
      if (matches) {
        matches.forEach(match => {
          const variable = match.slice(1, -1);
          if (variable !== 'previous_output') {
            variables.add(variable);
          }
        });
      }
    });

    return Array.from(variables);
  };

  const handleTemplateChange = (templateId: string) => {
    setFormData(prev => ({
      ...prev,
      templateId,
      variables: {},
    }));
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Group>
          <IconWorkflow size={24} />
          <Title order={2}>Agent Workflows</Title>
        </Group>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setCreateModalOpen(true)}
        >
          Create Workflow
        </Button>
      </Group>

      {workflows.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {workflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              onExecute={handleExecuteWorkflow}
              onDelete={handleDeleteWorkflow}
              onPause={handlePauseWorkflow}
            />
          ))}
        </SimpleGrid>
      ) : (
        <Text c="dimmed" ta="center" py="xl">
          No workflows created yet. Create your first workflow to get started.
        </Text>
      )}

      <Modal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Workflow"
        size="lg"
      >
        <Stack gap="md">
          <Select
            label="Workflow Template"
            placeholder="Select a template"
            data={WORKFLOW_TEMPLATES.map(template => ({
              value: template.id,
              label: template.name,
            }))}
            value={formData.templateId}
            onChange={(value) => handleTemplateChange(value || '')}
            required
          />

          {formData.templateId && (
            <Card withBorder p="xs">
              <Text size="sm" fw={500} mb="xs">
                Template Description
              </Text>
              <Text size="sm" c="dimmed">
                {WORKFLOW_TEMPLATES.find(t => t.id === formData.templateId)?.description}
              </Text>
            </Card>
          )}

          <TextInput
            label="Workflow Name"
            placeholder="Enter workflow name"
            value={formData.name}
            onChange={(event) => setFormData({ ...formData, name: event.currentTarget.value })}
            required
          />

          <Textarea
            label="Description"
            placeholder="Enter workflow description"
            value={formData.description}
            onChange={(event) => setFormData({ ...formData, description: event.currentTarget.value })}
            minRows={2}
            required
          />

          {formData.templateId && getTemplateVariables(formData.templateId).length > 0 && (
            <Card withBorder p="xs">
              <Text size="sm" fw={500} mb="xs">
                Template Variables
              </Text>
              <Stack gap="xs">
                {getTemplateVariables(formData.templateId).map(variable => (
                  <TextInput
                    key={variable}
                    label={variable}
                    placeholder={`Enter value for ${variable}`}
                    value={formData.variables[variable] || ''}
                    onChange={(event) => setFormData({
                      ...formData,
                      variables: {
                        ...formData.variables,
                        [variable]: event.currentTarget.value,
                      },
                    })}
                    required
                  />
                ))}
              </Stack>
            </Card>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateWorkflow}
              disabled={!formData.templateId || !formData.name || !formData.description}
              loading={executingWorkflow !== null}
            >
              Create & Execute Workflow
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}