import React, { useState, useEffect } from 'react';
import { Stack, Title, Group, Card, Text, Grid, Progress, RingProgress, Badge, Alert, Button, Modal, Textarea } from '@mantine/core';
import { IconChartLine, IconActivity, IconAlertTriangle, IconTrendingUp, IconUsers, IconDatabase, IconShield } from '@tabler/icons-react';
import { AnalyticsManager, PerformanceMetrics, UsageAnalytics, SystemHealth, BusinessMetrics } from '../utils/analytics';
import { SecurityManager, SecurityConfig } from '../utils/security';
import { notifications } from '@mantine/notifications';

export function AdvancedAnalytics() {
  const [analyticsManager] = useState(() => new AnalyticsManager());
  const [securityManager] = useState(() => new SecurityManager({
    encryptionEnabled: true,
    auditLogging: true,
    dataRetention: 90,
    accessControl: true,
    complianceMode: 'enterprise',
  }));

  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [usageAnalytics, setUsageAnalytics] = useState<UsageAnalytics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null);
  const [insights, setInsights] = useState<{
    performance: string[];
    usage: string[];
    recommendations: string[];
    alerts: string[];
  } | null>(null);
  const [complianceReport, setComplianceReport] = useState<any>(null);
  const [insightsModalOpen, setInsightsModalOpen] = useState(false);

  useEffect(() => {
    // Set up event listeners
    analyticsManager.on('performance_updated', (data) => {
      setPerformanceMetrics(data);
    });

    analyticsManager.on('usage_updated', (data) => {
      setUsageAnalytics(data);
    });

    analyticsManager.on('health_updated', (health) => {
      setSystemHealth(health);
    });

    analyticsManager.on('business_metrics_updated', (metrics) => {
      setBusinessMetrics(metrics);
    });

    analyticsManager.on('insights_generated', (insights) => {
      setInsights(insights);
    });

    securityManager.on('security_alert', (event) => {
      notifications.show({
        title: 'Security Alert',
        message: event.description,
        color: 'red',
      });
    });

    // Initial data load
    loadAnalyticsData();
    
    // Set up periodic updates
    const interval = setInterval(loadAnalyticsData, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const loadAnalyticsData = async () => {
    try {
      // Load performance metrics
      const metrics = await analyticsManager.checkSystemHealth();
      setSystemHealth(metrics);

      // Load business metrics
      const business = await analyticsManager.calculateBusinessMetrics();
      setBusinessMetrics(business);

      // Load insights
      const insightsData = await analyticsManager.generateInsights();
      setInsights(insightsData);

      // Load compliance report
      const compliance = await securityManager.generateComplianceReport();
      setComplianceReport(compliance);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'green';
      case 'warning': return 'yellow';
      case 'critical': return 'red';
      default: return 'gray';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'blue';
      case 'medium': return 'yellow';
      case 'high': return 'orange';
      case 'critical': return 'red';
      default: return 'gray';
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Group>
          <IconChartLine size={24} />
          <Title order={2}>Advanced Analytics</Title>
        </Group>
        <Button onClick={() => setInsightsModalOpen(true)}>
          View Insights
        </Button>
      </Group>

      {/* System Health Overview */}
      <Card withBorder p="lg">
        <Stack gap="md">
          <Group>
            <IconActivity size={20} />
            <Title order={3}>System Health</Title>
          </Group>
          
          {systemHealth && (
            <Grid>
              <Grid.Col span={3}>
                <Card withBorder p="xs">
                  <Text size="sm" fw={500}>Status</Text>
                  <Badge color={getHealthColor(systemHealth.status)} size="lg">
                    {systemHealth.status.toUpperCase()}
                  </Badge>
                </Card>
              </Grid.Col>
              <Grid.Col span={3}>
                <Card withBorder p="xs">
                  <Text size="sm" fw={500}>CPU Usage</Text>
                  <Progress value={systemHealth.cpuUsage} color={systemHealth.cpuUsage > 80 ? 'red' : 'blue'} />
                  <Text size="xs" c="dimmed">{systemHealth.cpuUsage.toFixed(1)}%</Text>
                </Card>
              </Grid.Col>
              <Grid.Col span={3}>
                <Card withBorder p="xs">
                  <Text size="sm" fw={500}>Memory Usage</Text>
                  <Progress value={systemHealth.memoryUsage} color={systemHealth.memoryUsage > 80 ? 'red' : 'blue'} />
                  <Text size="xs" c="dimmed">{systemHealth.memoryUsage.toFixed(1)}%</Text>
                </Card>
              </Grid.Col>
              <Grid.Col span={3}>
                <Card withBorder p="xs">
                  <Text size="sm" fw={500}>Network Latency</Text>
                  <Text size="lg" fw={500}>{systemHealth.networkLatency.toFixed(0)}ms</Text>
                </Card>
              </Grid.Col>
            </Grid>
          )}
        </Stack>
      </Card>

      {/* Performance Metrics */}
      <Grid>
        <Grid.Col span={6}>
          <Card withBorder p="lg">
            <Stack gap="md">
              <Group>
                <IconTrendingUp size={20} />
                <Title order={3}>Performance Metrics</Title>
              </Group>
              
              {performanceMetrics && (
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text size="sm">Search Response Time</Text>
                    <Text size="sm" fw={500}>{performanceMetrics.searchResponseTime.toFixed(0)}ms</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Embeddings Generation</Text>
                    <Text size="sm" fw={500}>{performanceMetrics.embeddingsGenerationTime.toFixed(0)}ms</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Workflow Execution</Text>
                    <Text size="sm" fw={500}>{performanceMetrics.workflowExecutionTime.toFixed(0)}ms</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">API Call Latency</Text>
                    <Text size="sm" fw={500}>{performanceMetrics.apiCallLatency.toFixed(0)}ms</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Error Rate</Text>
                    <Text size="sm" fw={500" c={performanceMetrics.errorRate > 5 ? 'red' : 'green'}>
                      {performanceMetrics.errorRate.toFixed(1)}%
                    </Text>
                  </Group>
                </Stack>
              )}
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={6}>
          <Card withBorder p="lg">
            <Stack gap="md">
              <Group>
                <IconUsers size={20} />
                <Title order={3}>Business Metrics</Title>
              </Group>
              
              {businessMetrics && (
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text size="sm">User Engagement</Text>
                    <RingProgress
                      sections={[{ value: businessMetrics.userEngagement, color: 'blue' }]}
                      label={<Text size="xs" ta="center">{businessMetrics.userEngagement.toFixed(1)}</Text>}
                      size={60}
                    />
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Feature Adoption</Text>
                    <RingProgress
                      sections={[{ value: businessMetrics.featureAdoption, color: 'green' }]}
                      label={<Text size="xs" ta="center">{businessMetrics.featureAdoption.toFixed(1)}</Text>}
                      size={60}
                    />
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Retention Rate</Text>
                    <Text size="sm" fw={500">{businessMetrics.retentionRate.toFixed(1)}%</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Satisfaction Score</Text>
                    <Text size="sm" fw={500">{businessMetrics.satisfactionScore.toFixed(1)}/100</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Productivity Gains</Text>
                    <Text size="sm" fw={500">{businessMetrics.productivityGains.toFixed(1)} hours</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Cost Savings</Text>
                    <Text size="sm" fw={500" c="green">${businessMetrics.costSavings.toFixed(0)}</Text>
                  </Group>
                </Stack>
              )}
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Security & Compliance */}
      <Grid>
        <Grid.Col span={6}>
          <Card withBorder p="lg">
            <Stack gap="md">
              <Group>
                <IconShield size={20} />
                <Title order={3}>Security Overview</Title>
              </Group>
              
              {complianceReport && (
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text size="sm">Encryption</Text>
                    <Badge color={complianceReport.encryption.enabled ? 'green' : 'red'}>
                      {complianceReport.encryption.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Active Keys</Text>
                    <Text size="sm" fw={500">{complianceReport.encryption.activeKeys}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Access Control</Text>
                    <Badge color={complianceReport.accessControl.enabled ? 'green' : 'red'}>
                      {complianceReport.accessControl.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Total Checks</Text>
                    <Text size="sm" fw={500">{complianceReport.accessControl.totalChecks}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Denied Access</Text>
                    <Text size="sm" fw={500" c="red">{complianceReport.accessControl.deniedAccess}</Text>
                  </Group>
                </Stack>
              )}
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={6}>
          <Card withBorder p="lg">
            <Stack gap="md">
              <Group>
                <IconDatabase size={20} />
                <Title order={3}>Data Retention</Title>
              </Group>
              
              {complianceReport && (
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text size="sm">Total Logs</Text>
                    <Text size="sm" fw={500">{complianceReport.dataRetention.totalLogs}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Logs Retained</Text>
                    <Text size="sm" fw={500">{complianceReport.dataRetention.logsRetained}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Logs Removed</Text>
                    <Text size="sm" fw={500">{complianceReport.dataRetention.logsRemoved}</Text>
                  </Group>
                  <Progress 
                    value={(complianceReport.dataRetention.logsRetained / complianceReport.dataRetention.totalLogs) * 100} 
                    color="blue" 
                  />
                </Stack>
              )}
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Alerts */}
      {insights?.alerts && insights.alerts.length > 0 && (
        <Alert icon={<IconAlertTriangle size={16} />} title="Security Alerts" color="red">
          <Stack gap="xs">
            {insights.alerts.map((alert, index) => (
              <Text key={index} size="sm">{alert}</Text>
            ))}
          </Stack>
        </Alert>
      )}

      {/* Insights Modal */}
      <Modal opened={insightsModalOpen} onClose={() => setInsightsModalOpen(false)} title="Analytics Insights" size="lg">
        <Stack gap="md">
          {insights && (
            <>
              <Card withBorder>
                <Title order={4} mb="sm">Performance Insights</Title>
                <Stack gap="xs">
                  {insights.performance.map((insight, index) => (
                    <Text key={index} size="sm">• {insight}</Text>
                  ))}
                </Stack>
              </Card>

              <Card withBorder>
                <Title order={4} mb="sm">Usage Insights</Title>
                <Stack gap="xs">
                  {insights.usage.map((insight, index) => (
                    <Text key={index} size="sm">• {insight}</Text>
                  ))}
                </Stack>
              </Card>

              <Card withBorder>
                <Title order={4} mb="sm">Recommendations</Title>
                <Stack gap="xs">
                  {insights.recommendations.map((recommendation, index) => (
                    <Text key={index} size="sm">• {recommendation}</Text>
                  ))}
                </Stack>
              </Card>
            </>
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}