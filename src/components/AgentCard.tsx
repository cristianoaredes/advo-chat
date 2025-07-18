import React from 'react';
import { Card, Text, Badge, Group, ActionIcon, Switch } from '@mantine/core';
import { IconEdit, IconTrash, IconBrain } from '@tabler/icons-react';
import { Agent } from '../db';

interface AgentCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onDelete: (agentId: string) => void;
  onToggleActive: (agentId: string, isActive: boolean) => void;
}

export function AgentCard({ agent, onEdit, onDelete, onToggleActive }: AgentCardProps) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="xs">
        <Group>
          <IconBrain size={20} />
          <Text fw={500} size="lg">
            {agent.name}
          </Text>
        </Group>
        <Switch
          checked={agent.isActive}
          onChange={(event) => onToggleActive(agent.id, event.currentTarget.checked)}
          size="sm"
        />
      </Group>

      <Text size="sm" c="dimmed" mb="md">
        {agent.description}
      </Text>

      <Group mb="md">
        {agent.capabilities.map((capability) => (
          <Badge key={capability} variant="light" size="sm">
            {capability}
          </Badge>
        ))}
      </Group>

      <Text size="xs" c="dimmed" mb="md" lineClamp={3}>
        {agent.systemPrompt}
      </Text>

      <Group justify="space-between">
        <Text size="xs" c="dimmed">
          Created: {new Date(agent.createdAt).toLocaleDateString()}
        </Text>
        <Group gap="xs">
          <ActionIcon
            variant="subtle"
            color="blue"
            onClick={() => onEdit(agent)}
            size="sm"
          >
            <IconEdit size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={() => onDelete(agent.id)}
            size="sm"
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Group>
    </Card>
  );
}