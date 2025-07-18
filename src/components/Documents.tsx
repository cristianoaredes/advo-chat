import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Stack, Title, Button, Group, Text, SimpleGrid, Modal, TextInput, Textarea, Select, FileInput, Progress, Badge } from '@mantine/core';
import { IconPlus, IconUpload, IconFileText } from '@tabler/icons-react';
import { db, UserDocument } from '../db';
import { DocumentCard } from './DocumentCard';
import { notifications } from '@mantine/notifications';
import { processDocument } from '../utils/rag';

export function Documents() {
  const documents = useLiveQuery(() => db.userDocuments.toArray());
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<UserDocument | null>(null);
  const [viewingDocument, setViewingDocument] = useState<UserDocument | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'text' as UserDocument['type'],
    source: '',
  });

  const handleCreateDocument = async () => {
    try {
      const newDocument: Omit<UserDocument, 'id' | 'createdAt' | 'updatedAt'> = {
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

              const documentWithId = {
          ...newDocument,
          id: crypto.randomUUID(),
        };

        await db.userDocuments.add(documentWithId);

        // Process document for RAG
        try {
          await processDocument(documentWithId);
          notifications.show({
            title: 'Success',
            message: 'Document created and processed for RAG successfully',
            color: 'green',
          });
        } catch (error) {
          notifications.show({
            title: 'Warning',
            message: 'Document created but RAG processing failed',
            color: 'yellow',
          });
        }

        setCreateModalOpen(false);
        setFormData({
          title: '',
          content: '',
          type: 'text',
          source: '',
        });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to create document',
        color: 'red',
      });
    }
  };

  const handleEditDocument = (document: UserDocument) => {
    setEditingDocument(document);
    setFormData({
      title: document.title,
      content: document.content,
      type: document.type,
      source: document.source,
    });
    setCreateModalOpen(true);
  };

  const handleUpdateDocument = async () => {
    if (!editingDocument) return;

    try {
      await db.userDocuments.update(editingDocument.id, {
        ...formData,
        updatedAt: new Date(),
      });

      setCreateModalOpen(false);
      setEditingDocument(null);
      setFormData({
        title: '',
        content: '',
        type: 'text',
        source: '',
      });

      notifications.show({
        title: 'Success',
        message: 'Document updated successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to update document',
        color: 'red',
      });
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await db.userDocuments.delete(documentId);
      notifications.show({
        title: 'Success',
        message: 'Document deleted successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete document',
        color: 'red',
      });
    }
  };

  const handleViewDocument = (document: UserDocument) => {
    setViewingDocument(document);
  };

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;

    setUploadProgress(0);
    
    try {
      // Simulate file processing
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        
        // Simulate processing progress
        for (let i = 0; i <= 100; i += 10) {
          setUploadProgress(i);
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const newDocument: Omit<UserDocument, 'id' | 'createdAt' | 'updatedAt'> = {
          title: file.name,
          content: content,
          type: file.type.includes('pdf') ? 'pdf' : 'doc',
          source: 'File Upload',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const documentWithId = {
          ...newDocument,
          id: crypto.randomUUID(),
        };

        await db.userDocuments.add(documentWithId);

        // Process document for RAG
        try {
          await processDocument(documentWithId);
          notifications.show({
            title: 'Success',
            message: 'Document uploaded and processed for RAG successfully',
            color: 'green',
          });
        } catch (error) {
          notifications.show({
            title: 'Warning',
            message: 'Document uploaded but RAG processing failed',
            color: 'yellow',
          });
        }

        setUploadProgress(0);
      };

      reader.readAsText(file);
    } catch (error) {
      setUploadProgress(0);
      notifications.show({
        title: 'Error',
        message: 'Failed to process uploaded file',
        color: 'red',
      });
    }
  };

  const handleModalClose = () => {
    setCreateModalOpen(false);
    setEditingDocument(null);
    setFormData({
      title: '',
      content: '',
      type: 'text',
      source: '',
    });
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Group>
          <IconFileText size={24} />
          <Title order={2}>Knowledge Base</Title>
        </Group>
        <Group>
          <FileInput
            placeholder="Upload document"
            accept=".txt,.pdf,.doc,.docx"
            onChange={handleFileUpload}
            leftSection={<IconUpload size={16} />}
          />
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setCreateModalOpen(true)}
          >
            Add Document
          </Button>
        </Group>
      </Group>

      {uploadProgress > 0 && (
        <Progress value={uploadProgress} label={`Processing: ${uploadProgress}%`} size="sm" />
      )}

      {documents && documents.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {documents.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              onEdit={handleEditDocument}
              onDelete={handleDeleteDocument}
              onView={handleViewDocument}
            />
          ))}
        </SimpleGrid>
      ) : (
        <Text c="dimmed" ta="center" py="xl">
          No documents added yet. Upload or create your first document to build your knowledge base.
        </Text>
      )}

      <Modal
        opened={createModalOpen}
        onClose={handleModalClose}
        title={editingDocument ? 'Edit Document' : 'Add New Document'}
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label="Document Title"
            placeholder="Enter document title"
            value={formData.title}
            onChange={(event) => setFormData({ ...formData, title: event.currentTarget.value })}
            required
          />

          <Select
            label="Document Type"
            placeholder="Select document type"
            data={[
              { value: 'text', label: 'Text Document' },
              { value: 'pdf', label: 'PDF Document' },
              { value: 'doc', label: 'Word Document' },
              { value: 'webpage', label: 'Web Page' },
            ]}
            value={formData.type}
            onChange={(value) => setFormData({ ...formData, type: value as UserDocument['type'] })}
            required
          />

          <TextInput
            label="Source"
            placeholder="Document source or URL"
            value={formData.source}
            onChange={(event) => setFormData({ ...formData, source: event.currentTarget.value })}
            required
          />

          <Textarea
            label="Content"
            placeholder="Enter document content"
            value={formData.content}
            onChange={(event) => setFormData({ ...formData, content: event.currentTarget.value })}
            minRows={6}
            required
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={handleModalClose}>
              Cancel
            </Button>
            <Button
              onClick={editingDocument ? handleUpdateDocument : handleCreateDocument}
              disabled={!formData.title || !formData.content || !formData.source}
            >
              {editingDocument ? 'Update Document' : 'Add Document'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={!!viewingDocument}
        onClose={() => setViewingDocument(null)}
        title={viewingDocument?.title}
        size="xl"
      >
        {viewingDocument && (
          <Stack gap="md">
            <Group>
              <Badge color={viewingDocument.type === 'pdf' ? 'red' : 'blue'}>
                {viewingDocument.type.toUpperCase()}
              </Badge>
              <Text size="sm" c="dimmed">
                Source: {viewingDocument.source}
              </Text>
            </Group>
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
              {viewingDocument.content}
            </Text>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}