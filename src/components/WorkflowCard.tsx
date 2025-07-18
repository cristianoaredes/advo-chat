import React from 'react';
import { Card, Text, Badge, Group, ActionIcon, Progress, Stack, Collapse } from '@mantine/core';
import { IconPlay, IconPause, IconTrash, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { AgentWorkflow, WorkflowStep } from '../utils/agentWorkflow';

interface WorkflowCardProps {
  workflow: AgentWorkflow;
  onExecute: (workflowId: string) => void;
  onDelete: (workflowId: string) => void;
  onPause: (workflowId: string) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'blue';
    case 'completed':
      return 'green';
    case 'paused':
      return 'yellow';
    case 'draft':
      return 'gray';
    default:
      return 'gray';
  }
};

const getStepStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'green';
    case 'running':
      return 'blue';
    case 'failed':
      return 'red';
    case 'pending':
      return 'gray';
    default:
      return 'gray';
  }
};

export function WorkflowCard({ workflow, onExecute, onDelete, onPause }: WorkflowCardProps) {
  const [expanded, setExpanded] = React.useState(false);

  const completedSteps = workflow.steps.filter(step => step.status === 'completed').length;
  const totalSteps = workflow.steps.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const isExecutable = workflow.status === 'active' || workflow.status === 'draft';
  const isPausable = workflow.status === 'active';

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="xs">
        <Group>
          <Text fw={500} size="lg">
            {workflow.name}
          </Text>
          <Badge color={getStatusColor(workflow.status)} variant="light">
            {workflow.status.toUpperCase()}
          </Badge>
        </Group>
        <Group gap="xs">
          {isExecutable && (
            <ActionIcon
              variant="subtle"
              color="green"
              onClick={() => onExecute(workflow.id)}
              size="sm"
            >
              <IconPlay size={16} />
            </ActionIcon>
          )}
          {isPausable && (
            <ActionIcon
              variant="subtle"
              color="yellow"
              onClick={() => onPause(workflow.id)}
              size="sm"
            >
              <IconPause size={16} />
            </ActionIcon>
          )}
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={() => onDelete(workflow.id)}
            size="sm"
          >
            <IconTrash size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            onClick={() => setExpanded(!expanded)}
            size="sm"
          >
            {expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </ActionIcon>
        </Group>
      </Group>

      <Text size="sm" c="dimmed" mb="md">
        {workflow.description}
      </Text>

      <Group mb="md">
        <Text size="sm" fw={500}>
          Progress: {completedSteps}/{totalSteps} steps
        </Text>
        <Progress value={progress} size="sm" style={{ flex: 1 }} />
      </Group>

      <Collapse in={expanded}>
        <Stack gap="sm" mt="md">
          {workflow.steps.map((step, index) => (
            <Card key={step.id} withBorder p="xs">
              <Group justify="space-between" mb="xs">
                <Text size="sm" fw={500}>
                  Step {index + 1}: {step.metadata?.description || 'Unknown'}
                </Text>
                <Badge color={getStepStatusColor(step.status)} size="xs">
                  {step.status.toUpperCase()}
                </Badge>
              </Group>
              
              {step.output && (
                <Text size="xs" c="dimmed" lineClamp={3}>
                  Output: {step.output}
                </Text>
              )}
              
              {step.error && (
                <Text size="xs" c="red">
                  Error: {step.error}
                </Text>
              )}
            </Card>
          ))}
        </Stack>
      </Collapse>

      <Text size="xs" c="dimmed" mt="md">
        Created: {new Date(workflow.createdAt).toLocaleDateString()}
      </Text>
    </Card>
  );
}