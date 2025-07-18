import React, { useState, useEffect } from 'react';
import { Stack, Title, Group, Card, Text, Progress, Badge, SimpleGrid, Button, Modal, Textarea, NumberInput, Select } from '@mantine/core';
import { IconBrain, IconChartLine, IconTrendingUp, IconUsers, IconTarget } from '@tabler/icons-react';
import { getLearningInsights, generateImprovementSuggestions, recordLearningSession } from '../utils/learning';
import { notifications } from '@mantine/notifications';

interface LearningData {
  totalSessions: number;
  averageQuality: number;
  feedbackDistribution: Record<string, number>;
  topAgents: Array<{ agent: any; performance: any }>;
}

export function LearningAnalytics() {
  const [learningData, setLearningData] = useState<LearningData | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackData, setFeedbackData] = useState({
    chatId: '',
    agentId: '',
    userFeedback: 'positive' as 'positive' | 'negative' | 'neutral',
    responseQuality: 7,
    feedbackNotes: '',
  });

  useEffect(() => {
    loadLearningData();
  }, []);

  const loadLearningData = async () => {
    try {
      setLoading(true);
      const insights = await getLearningInsights(30);
      const improvementSuggestions = await generateImprovementSuggestions();
      
      setLearningData(insights);
      setSuggestions(improvementSuggestions);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load learning data',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    try {
      await recordLearningSession(
        feedbackData.chatId,
        feedbackData.agentId || undefined,
        feedbackData.userFeedback,
        feedbackData.responseQuality,
        feedbackData.feedbackNotes
      );

      setFeedbackModalOpen(false);
      setFeedbackData({
        chatId: '',
        agentId: '',
        userFeedback: 'positive',
        responseQuality: 7,
        feedbackNotes: '',
      });

      notifications.show({
        title: 'Success',
        message: 'Feedback recorded successfully',
        color: 'green',
      });

      // Reload data to reflect new feedback
      await loadLearningData();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to record feedback',
        color: 'red',
      });
    }
  };

  const getFeedbackColor = (feedback: string) => {
    switch (feedback) {
      case 'positive':
        return 'green';
      case 'negative':
        return 'red';
      case 'neutral':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  if (loading) {
    return (
      <Stack gap="lg">
        <Title order={2}>Learning Analytics</Title>
        <Text>Loading analytics...</Text>
      </Stack>
    );
  }

  if (!learningData) {
    return (
      <Stack gap="lg">
        <Title order={2}>Learning Analytics</Title>
        <Text>No learning data available yet.</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Group>
          <IconBrain size={24} />
          <Title order={2}>Learning Analytics</Title>
        </Group>
        <Button
          leftSection={<IconTarget size={16} />}
          onClick={() => setFeedbackModalOpen(true)}
        >
          Add Feedback
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group>
            <IconUsers size={24} />
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Total Sessions
              </Text>
              <Text fw={700} size="xl">
                {learningData.totalSessions}
              </Text>
            </div>
          </Group>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group>
            <IconTrendingUp size={24} />
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Avg Quality
              </Text>
              <Text fw={700} size="xl">
                {learningData.averageQuality.toFixed(1)}/10
              </Text>
            </div>
          </Group>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group>
            <IconChartLine size={24} />
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Top Agents
              </Text>
              <Text fw={700} size="xl">
                {learningData.topAgents.length}
              </Text>
            </div>
          </Group>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group>
            <IconBrain size={24} />
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Suggestions
              </Text>
              <Text fw={700} size="xl">
                {suggestions.length}
              </Text>
            </div>
          </Group>
        </Card>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">Feedback Distribution</Title>
          <Stack gap="sm">
            {Object.entries(learningData.feedbackDistribution).map(([feedback, count]) => (
              <div key={feedback}>
                <Group justify="space-between" mb="xs">
                  <Badge color={getFeedbackColor(feedback)} variant="light">
                    {feedback.charAt(0).toUpperCase() + feedback.slice(1)}
                  </Badge>
                  <Text size="sm">{count} sessions</Text>
                </Group>
                <Progress
                  value={(count / learningData.totalSessions) * 100}
                  color={getFeedbackColor(feedback)}
                  size="sm"
                />
              </div>
            ))}
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">Top Performing Agents</Title>
          <Stack gap="sm">
            {learningData.topAgents.slice(0, 5).map((item, index) => (
              <div key={item.agent.id}>
                <Group justify="space-between" mb="xs">
                  <Text fw={500} size="sm">
                    {index + 1}. {item.agent.name}
                  </Text>
                  <Text size="sm" fw={700}>
                    {item.performance.averageResponseQuality.toFixed(1)}/10
                  </Text>
                </Group>
                <Progress
                  value={item.performance.averageResponseQuality * 10}
                  color="blue"
                  size="sm"
                />
                <Text size="xs" c="dimmed">
                  {item.performance.totalInteractions} interactions
                </Text>
              </div>
            ))}
          </Stack>
        </Card>
      </SimpleGrid>

      {suggestions.length > 0 && (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">Improvement Suggestions</Title>
          <Stack gap="sm">
            {suggestions.map((suggestion, index) => (
              <Text key={index} size="sm">
                • {suggestion}
              </Text>
            ))}
          </Stack>
        </Card>
      )}

      <Modal
        opened={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        title="Add Learning Feedback"
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Chat ID"
            placeholder="Enter chat ID"
            value={feedbackData.chatId}
            onChange={(event) => setFeedbackData({ ...feedbackData, chatId: event.currentTarget.value })}
            required
          />

          <TextInput
            label="Agent ID (optional)"
            placeholder="Enter agent ID if applicable"
            value={feedbackData.agentId}
            onChange={(event) => setFeedbackData({ ...feedbackData, agentId: event.currentTarget.value })}
          />

          <Select
            label="User Feedback"
            placeholder="Select feedback type"
            data={[
              { value: 'positive', label: 'Positive' },
              { value: 'neutral', label: 'Neutral' },
              { value: 'negative', label: 'Negative' },
            ]}
            value={feedbackData.userFeedback}
            onChange={(value) => setFeedbackData({ ...feedbackData, userFeedback: value as any })}
            required
          />

          <NumberInput
            label="Response Quality (1-10)"
            placeholder="Rate the response quality"
            min={1}
            max={10}
            value={feedbackData.responseQuality}
            onChange={(value) => setFeedbackData({ ...feedbackData, responseQuality: value || 7 })}
            required
          />

          <Textarea
            label="Feedback Notes (optional)"
            placeholder="Additional notes about the interaction"
            value={feedbackData.feedbackNotes}
            onChange={(event) => setFeedbackData({ ...feedbackData, feedbackNotes: event.currentTarget.value })}
            minRows={3}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setFeedbackModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitFeedback}
              disabled={!feedbackData.chatId}
            >
              Submit Feedback
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}