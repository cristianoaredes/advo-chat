import React from 'react';
import { Card, Text, Badge, Group, ActionIcon, Stack } from '@mantine/core';
import { IconEdit, IconTrash, IconFile, IconFileText, IconWorld, IconPdf } from '@tabler/icons-react';
import { UserDocument } from '../db';

interface DocumentCardProps {
  document: UserDocument;
  onEdit: (document: UserDocument) => void;
  onDelete: (documentId: string) => void;
  onView: (document: UserDocument) => void;
}

const getDocumentIcon = (type: UserDocument['type']) => {
  switch (type) {
    case 'pdf':
      return <IconPdf size={20} />;
    case 'doc':
      return <IconFile size={20} />;
    case 'webpage':
      return <IconWorld size={20} />;
    case 'text':
    default:
      return <IconFileText size={20} />;
  }
};

const getDocumentTypeColor = (type: UserDocument['type']) => {
  switch (type) {
    case 'pdf':
      return 'red';
    case 'doc':
      return 'blue';
    case 'webpage':
      return 'green';
    case 'text':
    default:
      return 'gray';
  }
};

export function DocumentCard({ document, onEdit, onDelete, onView }: DocumentCardProps) {
  const contentPreview = document.content.length > 150 
    ? document.content.substring(0, 150) + '...'
    : document.content;

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="xs">
        <Group>
          {getDocumentIcon(document.type)}
          <Text fw={500} size="lg">
            {document.title}
          </Text>
        </Group>
        <Badge color={getDocumentTypeColor(document.type)} variant="light">
          {document.type.toUpperCase()}
        </Badge>
      </Group>

      <Text size="sm" c="dimmed" mb="md">
        Source: {document.source}
      </Text>

      <Text size="sm" mb="md" lineClamp={3}>
        {contentPreview}
      </Text>

      <Group justify="space-between">
        <Text size="xs" c="dimmed">
          Created: {new Date(document.createdAt).toLocaleDateString()}
        </Text>
        <Group gap="xs">
          <ActionIcon
            variant="subtle"
            color="blue"
            onClick={() => onView(document)}
            size="sm"
          >
            <IconFileText size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="blue"
            onClick={() => onEdit(document)}
            size="sm"
          >
            <IconEdit size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={() => onDelete(document.id)}
            size="sm"
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Group>
    </Card>
  );
}