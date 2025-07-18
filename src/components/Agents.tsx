import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Stack, Title, Button, Group, Text, SimpleGrid, Modal, TextInput, Textarea, MultiSelect, Switch } from '@mantine/core';
import { IconPlus, IconBrain } from '@tabler/icons-react';
import { db, Agent } from '../db';
import { AgentCard } from './AgentCard';
import { notifications } from '@mantine/notifications';

export function Agents() {
  const agents = useLiveQuery(() => db.agents.toArray());
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    capabilities: [] as string[],
    isActive: true,
  });

  const capabilityOptions = [
    'research', 'analysis', 'synthesis', 'citation',
    'writing', 'editing', 'style', 'structure',
    'programming', 'debugging', 'optimization', 'best-practices',
    'ideation', 'brainstorming', 'creativity', 'innovation',
    'data-analysis', 'visualization', 'presentation', 'communication'
  ];

  const handleCreateAgent = async () => {
    try {
      const newAgent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'> = {
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.agents.add({
        ...newAgent,
        id: crypto.randomUUID(),
      });

      setCreateModalOpen(false);
      setFormData({
        name: '',
        description: '',
        systemPrompt: '',
        capabilities: [],
        isActive: true,
      });

      notifications.show({
        title: 'Success',
        message: 'Agent created successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to create agent',
        color: 'red',
      });
    }
  };

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      capabilities: agent.capabilities,
      isActive: agent.isActive,
    });
    setCreateModalOpen(true);
  };

  const handleUpdateAgent = async () => {
    if (!editingAgent) return;

    try {
      await db.agents.update(editingAgent.id, {
        ...formData,
        updatedAt: new Date(),
      });

      setCreateModalOpen(false);
      setEditingAgent(null);
      setFormData({
        name: '',
        description: '',
        systemPrompt: '',
        capabilities: [],
        isActive: true,
      });

      notifications.show({
        title: 'Success',
        message: 'Agent updated successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to update agent',
        color: 'red',
      });
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    try {
      await db.agents.delete(agentId);
      notifications.show({
        title: 'Success',
        message: 'Agent deleted successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete agent',
        color: 'red',
      });
    }
  };

  const handleToggleActive = async (agentId: string, isActive: boolean) => {
    try {
      await db.agents.update(agentId, {
        isActive,
        updatedAt: new Date(),
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to update agent status',
        color: 'red',
      });
    }
  };

  const handleModalClose = () => {
    setCreateModalOpen(false);
    setEditingAgent(null);
    setFormData({
      name: '',
      description: '',
      systemPrompt: '',
      capabilities: [],
      isActive: true,
    });
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Group>
          <IconBrain size={24} />
          <Title order={2}>AI Agents</Title>
        </Group>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setCreateModalOpen(true)}
        >
          Create Agent
        </Button>
      </Group>

      {agents && agents.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={handleEditAgent}
              onDelete={handleDeleteAgent}
              onToggleActive={handleToggleActive}
            />
          ))}
        </SimpleGrid>
      ) : (
        <Text c="dimmed" ta="center" py="xl">
          No agents created yet. Create your first agent to get started.
        </Text>
      )}

      <Modal
        opened={createModalOpen}
        onClose={handleModalClose}
        title={editingAgent ? 'Edit Agent' : 'Create New Agent'}
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label="Agent Name"
            placeholder="Enter agent name"
            value={formData.name}
            onChange={(event) => setFormData({ ...formData, name: event.currentTarget.value })}
            required
          />

          <TextInput
            label="Description"
            placeholder="Brief description of the agent's purpose"
            value={formData.description}
            onChange={(event) => setFormData({ ...formData, description: event.currentTarget.value })}
            required
          />

          <Textarea
            label="System Prompt"
            placeholder="Define the agent's behavior and capabilities"
            value={formData.systemPrompt}
            onChange={(event) => setFormData({ ...formData, systemPrompt: event.currentTarget.value })}
            minRows={4}
            required
          />

          <MultiSelect
            label="Capabilities"
            placeholder="Select agent capabilities"
            data={capabilityOptions}
            value={formData.capabilities}
            onChange={(value) => setFormData({ ...formData, capabilities: value })}
            searchable
            creatable
            getCreateLabel={(query) => `+ Create ${query}`}
            onCreate={(query) => {
              const item = query;
              setFormData({ ...formData, capabilities: [...formData.capabilities, item] });
              return item;
            }}
          />

          <Switch
            label="Active"
            checked={formData.isActive}
            onChange={(event) => setFormData({ ...formData, isActive: event.currentTarget.checked })}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={handleModalClose}>
              Cancel
            </Button>
            <Button
              onClick={editingAgent ? handleUpdateAgent : handleCreateAgent}
              disabled={!formData.name || !formData.description || !formData.systemPrompt}
            >
              {editingAgent ? 'Update Agent' : 'Create Agent'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}