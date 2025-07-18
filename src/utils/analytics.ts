import { Agent, AgentPerformance, LearningSession, UserDocument } from '../db';

export interface PerformanceMetrics {
  embeddingsGenerationTime: number;
  searchResponseTime: number;
  workflowExecutionTime: number;
  documentProcessingTime: number;
  apiCallLatency: number;
  memoryUsage: number;
  errorRate: number;
}

export interface UsageAnalytics {
  totalSessions: number;
  activeUsers: number;
  documentsProcessed: number;
  workflowsExecuted: number;
  agentsUsed: Record<string, number>;
  embeddingProviders: Record<string, number>;
  popularFeatures: Record<string, number>;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  errorCount: number;
  lastUpdated: Date;
}

export interface BusinessMetrics {
  userEngagement: number;
  featureAdoption: number;
  retentionRate: number;
  satisfactionScore: number;
  productivityGains: number;
  costSavings: number;
}

export class AnalyticsManager {
  private metrics: PerformanceMetrics[] = [];
  private usageData: UsageAnalytics[] = [];
  private healthChecks: SystemHealth[] = [];
  private businessMetrics: BusinessMetrics[] = [];
  private eventListeners: Map<string, Function[]> = new Map();

  // Performance monitoring
  async trackPerformance(metric: keyof PerformanceMetrics, value: number): Promise<void> {
    const timestamp = new Date();
    const currentMetrics = this.metrics[this.metrics.length - 1] || this.createEmptyMetrics();
    
    currentMetrics[metric] = value;
    currentMetrics.timestamp = timestamp;

    this.metrics.push(currentMetrics);
    this.emit('performance_updated', { metric, value, timestamp });

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  // Track API call performance
  async trackApiCall(endpoint: string, duration: number, success: boolean): Promise<void> {
    await this.trackPerformance('apiCallLatency', duration);
    
    if (!success) {
      const currentMetrics = this.metrics[this.metrics.length - 1] || this.createEmptyMetrics();
      currentMetrics.errorRate = (currentMetrics.errorRate || 0) + 1;
    }
  }

  // Track embedding generation performance
  async trackEmbeddingsGeneration(provider: string, duration: number): Promise<void> {
    await this.trackPerformance('embeddingsGenerationTime', duration);
    this.updateUsageAnalytics('embeddingProviders', provider);
  }

  // Track search performance
  async trackSearchPerformance(duration: number, resultsCount: number): Promise<void> {
    await this.trackPerformance('searchResponseTime', duration);
    this.updateUsageAnalytics('popularFeatures', 'search');
  }

  // Track workflow execution
  async trackWorkflowExecution(workflowId: string, duration: number, success: boolean): Promise<void> {
    await this.trackPerformance('workflowExecutionTime', duration);
    this.updateUsageAnalytics('workflowsExecuted', 1);
    
    if (!success) {
      const currentMetrics = this.metrics[this.metrics.length - 1] || this.createEmptyMetrics();
      currentMetrics.errorRate = (currentMetrics.errorRate || 0) + 1;
    }
  }

  // Track document processing
  async trackDocumentProcessing(documentId: string, duration: number, size: number): Promise<void> {
    await this.trackPerformance('documentProcessingTime', duration);
    this.updateUsageAnalytics('documentsProcessed', 1);
  }

  // Update usage analytics
  private updateUsageAnalytics(category: keyof UsageAnalytics, value: any): void {
    const currentUsage = this.usageData[this.usageData.length - 1] || this.createEmptyUsageAnalytics();
    
    if (typeof value === 'number') {
      currentUsage[category] = (currentUsage[category] as number) + value;
    } else if (typeof value === 'string') {
      const record = currentUsage[category] as Record<string, number>;
      record[value] = (record[value] || 0) + 1;
    }

    this.usageData.push(currentUsage);
    this.emit('usage_updated', { category, value });
  }

  // System health monitoring
  async checkSystemHealth(): Promise<SystemHealth> {
    const health: SystemHealth = {
      status: 'healthy',
      cpuUsage: await this.getCpuUsage(),
      memoryUsage: await this.getMemoryUsage(),
      diskUsage: await this.getDiskUsage(),
      networkLatency: await this.getNetworkLatency(),
      errorCount: this.getErrorCount(),
      lastUpdated: new Date(),
    };

    // Determine status based on metrics
    if (health.cpuUsage > 80 || health.memoryUsage > 80 || health.errorCount > 10) {
      health.status = 'critical';
    } else if (health.cpuUsage > 60 || health.memoryUsage > 60 || health.errorCount > 5) {
      health.status = 'warning';
    }

    this.healthChecks.push(health);
    this.emit('health_updated', health);

    return health;
  }

  // Business metrics calculation
  async calculateBusinessMetrics(): Promise<BusinessMetrics> {
    const metrics: BusinessMetrics = {
      userEngagement: this.calculateUserEngagement(),
      featureAdoption: this.calculateFeatureAdoption(),
      retentionRate: this.calculateRetentionRate(),
      satisfactionScore: this.calculateSatisfactionScore(),
      productivityGains: this.calculateProductivityGains(),
      costSavings: this.calculateCostSavings(),
    };

    this.businessMetrics.push(metrics);
    this.emit('business_metrics_updated', metrics);

    return metrics;
  }

  // Generate insights and recommendations
  async generateInsights(): Promise<{
    performance: string[];
    usage: string[];
    recommendations: string[];
    alerts: string[];
  }> {
    const insights = {
      performance: this.generatePerformanceInsights(),
      usage: this.generateUsageInsights(),
      recommendations: this.generateRecommendations(),
      alerts: this.generateAlerts(),
    };

    this.emit('insights_generated', insights);
    return insights;
  }

  // Get performance trends
  getPerformanceTrends(days: number = 30): PerformanceMetrics[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return this.metrics.filter(metric => 
      metric.timestamp && new Date(metric.timestamp) > cutoff
    );
  }

  // Get usage trends
  getUsageTrends(days: number = 30): UsageAnalytics[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return this.usageData.filter(usage => 
      usage.timestamp && new Date(usage.timestamp) > cutoff
    );
  }

  // Event handling
  on(event: string, handler: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(handler);
  }

  off(event: string, handler: Function): void {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  // Helper methods for system metrics
  private async getCpuUsage(): Promise<number> {
    // Simulate CPU usage - in real implementation, use system APIs
    return Math.random() * 100;
  }

  private async getMemoryUsage(): Promise<number> {
    // Get memory usage from browser
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;
    }
    return Math.random() * 100;
  }

  private async getDiskUsage(): Promise<number> {
    // Simulate disk usage
    return Math.random() * 100;
  }

  private async getNetworkLatency(): Promise<number> {
    // Measure network latency
    const start = performance.now();
    try {
      await fetch('/api/ping');
      return performance.now() - start;
    } catch {
      return 0;
    }
  }

  private getErrorCount(): number {
    const recentMetrics = this.metrics.slice(-100);
    return recentMetrics.reduce((sum, metric) => sum + (metric.errorRate || 0), 0);
  }

  // Business metrics calculations
  private calculateUserEngagement(): number {
    const recentUsage = this.usageData.slice(-7);
    const totalSessions = recentUsage.reduce((sum, usage) => sum + usage.totalSessions, 0);
    return totalSessions / 7; // Average daily sessions
  }

  private calculateFeatureAdoption(): number {
    const recentUsage = this.usageData.slice(-30);
    const totalFeatures = recentUsage.reduce((sum, usage) => {
      return sum + Object.values(usage.popularFeatures).reduce((a, b) => a + b, 0);
    }, 0);
    return totalFeatures / 30;
  }

  private calculateRetentionRate(): number {
    // Simulate retention rate calculation
    return 85 + Math.random() * 10;
  }

  private calculateSatisfactionScore(): number {
    // Calculate based on error rates and performance
    const recentMetrics = this.metrics.slice(-100);
    const avgErrorRate = recentMetrics.reduce((sum, metric) => sum + (metric.errorRate || 0), 0) / recentMetrics.length;
    const avgPerformance = recentMetrics.reduce((sum, metric) => sum + metric.searchResponseTime, 0) / recentMetrics.length;
    
    let score = 100;
    score -= avgErrorRate * 10;
    score -= Math.min(avgPerformance / 1000, 20);
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateProductivityGains(): number {
    // Calculate based on workflow efficiency
    const recentUsage = this.usageData.slice(-30);
    const workflowsExecuted = recentUsage.reduce((sum, usage) => sum + usage.workflowsExecuted, 0);
    return workflowsExecuted * 0.5; // Assume 0.5 hours saved per workflow
  }

  private calculateCostSavings(): number {
    // Calculate based on automation and efficiency
    const productivityGains = this.calculateProductivityGains();
    const hourlyRate = 50; // Assume $50/hour average rate
    return productivityGains * hourlyRate;
  }

  // Insight generation
  private generatePerformanceInsights(): string[] {
    const insights: string[] = [];
    const recentMetrics = this.metrics.slice(-100);
    
    const avgSearchTime = recentMetrics.reduce((sum, m) => sum + m.searchResponseTime, 0) / recentMetrics.length;
    if (avgSearchTime > 2000) {
      insights.push('Search response times are high. Consider optimizing embeddings or vector store.');
    }

    const avgErrorRate = recentMetrics.reduce((sum, m) => sum + (m.errorRate || 0), 0) / recentMetrics.length;
    if (avgErrorRate > 5) {
      insights.push('Error rate is elevated. Review system logs and check API configurations.');
    }

    return insights;
  }

  private generateUsageInsights(): string[] {
    const insights: string[] = [];
    const recentUsage = this.usageData.slice(-7);
    
    const totalWorkflows = recentUsage.reduce((sum, usage) => sum + usage.workflowsExecuted, 0);
    if (totalWorkflows > 50) {
      insights.push('High workflow usage detected. Consider adding more workflow templates.');
    }

    const totalDocuments = recentUsage.reduce((sum, usage) => sum + usage.documentsProcessed, 0);
    if (totalDocuments > 100) {
      insights.push('High document processing volume. Consider batch processing optimizations.');
    }

    return insights;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const recentMetrics = this.metrics.slice(-100);
    
    const avgSearchTime = recentMetrics.reduce((sum, m) => sum + m.searchResponseTime, 0) / recentMetrics.length;
    if (avgSearchTime > 2000) {
      recommendations.push('Consider upgrading to a faster embedding provider or vector store.');
    }

    const recentUsage = this.usageData.slice(-7);
    const workflowsExecuted = recentUsage.reduce((sum, usage) => sum + usage.workflowsExecuted, 0);
    if (workflowsExecuted > 20) {
      recommendations.push('Consider creating custom workflow templates for common tasks.');
    }

    return recommendations;
  }

  private generateAlerts(): string[] {
    const alerts: string[] = [];
    const recentMetrics = this.metrics.slice(-10);
    
    const highErrorRate = recentMetrics.some(m => (m.errorRate || 0) > 10);
    if (highErrorRate) {
      alerts.push('High error rate detected. Check system configuration and API keys.');
    }

    const slowPerformance = recentMetrics.some(m => m.searchResponseTime > 5000);
    if (slowPerformance) {
      alerts.push('Slow performance detected. Consider optimizing search algorithms.');
    }

    return alerts;
  }

  // Utility methods
  private createEmptyMetrics(): PerformanceMetrics {
    return {
      embeddingsGenerationTime: 0,
      searchResponseTime: 0,
      workflowExecutionTime: 0,
      documentProcessingTime: 0,
      apiCallLatency: 0,
      memoryUsage: 0,
      errorRate: 0,
      timestamp: new Date(),
    };
  }

  private createEmptyUsageAnalytics(): UsageAnalytics {
    return {
      totalSessions: 0,
      activeUsers: 0,
      documentsProcessed: 0,
      workflowsExecuted: 0,
      agentsUsed: {},
      embeddingProviders: {},
      popularFeatures: {},
      timestamp: new Date(),
    };
  }
}