import React, { useState, useEffect } from 'react';
import { Stack, Title, Group, Card, Text, Switch, TextInput, Select, Button, Divider, Alert } from '@mantine/core';
import { IconSettings, IconBrain, IconDatabase, IconKey } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { initializeEmbeddings, getEmbeddingsManager } from '../utils/rag';
import { createVectorStoreManager } from '../utils/vectorStore';
import { db } from '../db';

interface EmbeddingsConfig {
  provider: 'openai' | 'cohere' | 'local' | 'simple';
  apiKey?: string;
  model?: string;
}

interface VectorStoreConfig {
  provider: 'local' | 'pinecone';
  apiKey?: string;
  environment?: string;
  indexName?: string;
  namespace?: string;
}

export function AdvancedSettings() {
  const [embeddingsConfig, setEmbeddingsConfig] = useState<EmbeddingsConfig>({
    provider: 'simple',
  });
  const [vectorStoreConfig, setVectorStoreConfig] = useState<VectorStoreConfig>({
    provider: 'local',
  });
  const [isInitializing, setIsInitializing] = useState(false);
  const [currentEmbeddingsProvider, setCurrentEmbeddingsProvider] = useState<string>('simple');

  useEffect(() => {
    // Load current settings
    const loadSettings = async () => {
      try {
        const settings = await db.settings.where({ id: "general" }).first();
        if (settings) {
          // You could store embeddings config in settings
          setCurrentEmbeddingsProvider(getEmbeddingsManager()?.getProviderName() || 'simple');
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();
  }, []);

  const handleInitializeEmbeddings = async () => {
    try {
      setIsInitializing(true);
      
      let apiKey = embeddingsConfig.apiKey;
      if (embeddingsConfig.provider === 'openai' && !apiKey) {
        const settings = await db.settings.where({ id: "general" }).first();
        apiKey = settings?.openAiApiKey;
      }

      await initializeEmbeddings(
        embeddingsConfig.provider,
        apiKey,
        embeddingsConfig.model
      );

      setCurrentEmbeddingsProvider(embeddingsConfig.provider);
      
      notifications.show({
        title: 'Success',
        message: `Embeddings initialized with ${embeddingsConfig.provider} provider`,
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to initialize embeddings',
        color: 'red',
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleTestVectorStore = async () => {
    try {
      setIsInitializing(true);
      
      const vectorStoreManager = await createVectorStoreManager(
        vectorStoreConfig.provider,
        {
          apiKey: vectorStoreConfig.apiKey,
          environment: vectorStoreConfig.environment,
          indexName: vectorStoreConfig.indexName,
          namespace: vectorStoreConfig.namespace,
        }
      );

      notifications.show({
        title: 'Success',
        message: `Vector store ${vectorStoreManager.getName()} initialized successfully`,
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to initialize vector store',
        color: 'red',
      });
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <Stack gap="lg">
      <Group>
        <IconSettings size={24} />
        <Title order={2}>Advanced Settings</Title>
      </Group>

      <Card withBorder p="lg">
        <Stack gap="md">
          <Group>
            <IconBrain size={20} />
            <Title order={3}>Embeddings Configuration</Title>
          </Group>

          <Select
            label="Embeddings Provider"
            description="Choose the embeddings provider for RAG functionality"
            data={[
              { value: 'simple', label: 'Simple (Local)' },
              { value: 'openai', label: 'OpenAI Embeddings' },
              { value: 'cohere', label: 'Cohere Embeddings' },
              { value: 'local', label: 'Local Transformers' },
            ]}
            value={embeddingsConfig.provider}
            onChange={(value) => setEmbeddingsConfig(prev => ({ ...prev, provider: value as any }))}
          />

          {embeddingsConfig.provider === 'openai' && (
            <TextInput
              label="OpenAI API Key"
              description="Leave empty to use your main OpenAI API key"
              placeholder="sk-..."
              value={embeddingsConfig.apiKey || ''}
              onChange={(event) => setEmbeddingsConfig(prev => ({ 
                ...prev, 
                apiKey: event.currentTarget.value 
              }))}
            />
          )}

          {embeddingsConfig.provider === 'cohere' && (
            <>
              <TextInput
                label="Cohere API Key"
                placeholder="Enter your Cohere API key"
                value={embeddingsConfig.apiKey || ''}
                onChange={(event) => setEmbeddingsConfig(prev => ({ 
                  ...prev, 
                  apiKey: event.currentTarget.value 
                }))}
                required
              />
              <Select
                label="Cohere Model"
                data={[
                  { value: 'embed-english-v3.0', label: 'English v3.0' },
                  { value: 'embed-multilingual-v3.0', label: 'Multilingual v3.0' },
                ]}
                value={embeddingsConfig.model || 'embed-english-v3.0'}
                onChange={(value) => setEmbeddingsConfig(prev => ({ 
                  ...prev, 
                  model: value || 'embed-english-v3.0' 
                }))}
              />
            </>
          )}

          {embeddingsConfig.provider === 'openai' && (
            <Select
              label="OpenAI Model"
              data={[
                { value: 'text-embedding-3-small', label: 'Text Embedding 3 Small' },
                { value: 'text-embedding-3-large', label: 'Text Embedding 3 Large' },
              ]}
              value={embeddingsConfig.model || 'text-embedding-3-small'}
              onChange={(value) => setEmbeddingsConfig(prev => ({ 
                ...prev, 
                model: value || 'text-embedding-3-small' 
              }))}
            />
          )}

          <Group>
            <Text size="sm" c="dimmed">
              Current Provider: {currentEmbeddingsProvider}
            </Text>
            <Button
              onClick={handleInitializeEmbeddings}
              loading={isInitializing}
              disabled={embeddingsConfig.provider === 'cohere' && !embeddingsConfig.apiKey}
            >
              Initialize Embeddings
            </Button>
          </Group>
        </Stack>
      </Card>

      <Card withBorder p="lg">
        <Stack gap="md">
          <Group>
            <IconDatabase size={20} />
            <Title order={3}>Vector Store Configuration</Title>
          </Group>

          <Select
            label="Vector Store Provider"
            description="Choose the vector store for document storage"
            data={[
              { value: 'local', label: 'Local (IndexedDB)' },
              { value: 'pinecone', label: 'Pinecone' },
            ]}
            value={vectorStoreConfig.provider}
            onChange={(value) => setVectorStoreConfig(prev => ({ ...prev, provider: value as any }))}
          />

          {vectorStoreConfig.provider === 'pinecone' && (
            <>
              <TextInput
                label="Pinecone API Key"
                placeholder="Enter your Pinecone API key"
                value={vectorStoreConfig.apiKey || ''}
                onChange={(event) => setVectorStoreConfig(prev => ({ 
                  ...prev, 
                  apiKey: event.currentTarget.value 
                }))}
                required
              />
              <TextInput
                label="Environment"
                placeholder="e.g., us-west1-gcp"
                value={vectorStoreConfig.environment || ''}
                onChange={(event) => setVectorStoreConfig(prev => ({ 
                  ...prev, 
                  environment: event.currentTarget.value 
                }))}
                required
              />
              <TextInput
                label="Index Name"
                placeholder="Enter your Pinecone index name"
                value={vectorStoreConfig.indexName || ''}
                onChange={(event) => setVectorStoreConfig(prev => ({ 
                  ...prev, 
                  indexName: event.currentTarget.value 
                }))}
                required
              />
              <TextInput
                label="Namespace (Optional)"
                placeholder="default"
                value={vectorStoreConfig.namespace || 'default'}
                onChange={(event) => setVectorStoreConfig(prev => ({ 
                  ...prev, 
                  namespace: event.currentTarget.value 
                }))}
              />
            </>
          )}

          <Group>
            <Button
              onClick={handleTestVectorStore}
              loading={isInitializing}
              disabled={vectorStoreConfig.provider === 'pinecone' && 
                (!vectorStoreConfig.apiKey || !vectorStoreConfig.environment || !vectorStoreConfig.indexName)}
            >
              Test Vector Store
            </Button>
          </Group>
        </Stack>
      </Card>

      <Alert color="blue" title="Information">
        <Text size="sm">
          Advanced settings allow you to configure embeddings and vector stores for enhanced RAG functionality. 
          These settings are optional - the system will work with default configurations.
        </Text>
      </Alert>
    </Stack>
  );
}