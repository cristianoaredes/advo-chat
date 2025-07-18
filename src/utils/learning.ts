import { db, LearningSession, AgentPerformance, Agent } from '../db';

// Record a learning session with user feedback
export async function recordLearningSession(
  chatId: string,
  agentId: string | undefined,
  userFeedback: 'positive' | 'negative' | 'neutral',
  responseQuality: number,
  feedbackNotes?: string
): Promise<void> {
  try {
    await db.learningSessions.add({
      id: crypto.randomUUID(),
      chatId,
      agentId,
      userFeedback,
      responseQuality,
      feedbackNotes,
      createdAt: new Date(),
    });

    // Update agent performance if agent was used
    if (agentId) {
      await updateAgentPerformance(agentId, responseQuality);
    }
  } catch (error) {
    console.error('Error recording learning session:', error);
  }
}

// Update agent performance metrics
export async function updateAgentPerformance(agentId: string, responseQuality: number): Promise<void> {
  try {
    const existing = await db.agentPerformance.where('agentId').equals(agentId).first();
    
    if (existing) {
      const totalInteractions = existing.totalInteractions + 1;
      const newAverageQuality = (existing.averageResponseQuality * existing.totalInteractions + responseQuality) / totalInteractions;
      
      await db.agentPerformance.update(existing.id, {
        totalInteractions,
        averageResponseQuality: newAverageQuality,
        lastUsed: new Date(),
        updatedAt: new Date(),
      });
    } else {
      await db.agentPerformance.add({
        id: crypto.randomUUID(),
        agentId,
        totalInteractions: 1,
        averageResponseQuality: responseQuality,
        userSatisfactionScore: responseQuality / 10, // Convert to 0-1 scale
        lastUsed: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error('Error updating agent performance:', error);
  }
}

// Get agent performance statistics
export async function getAgentPerformance(agentId: string): Promise<AgentPerformance | null> {
  try {
    return await db.agentPerformance.where('agentId').equals(agentId).first();
  } catch (error) {
    console.error('Error getting agent performance:', error);
    return null;
  }
}

// Get all agent performance data
export async function getAllAgentPerformance(): Promise<AgentPerformance[]> {
  try {
    return await db.agentPerformance.toArray();
  } catch (error) {
    console.error('Error getting all agent performance:', error);
    return [];
  }
}

// Get learning insights from recent sessions
export async function getLearningInsights(days: number = 30): Promise<{
  totalSessions: number;
  averageQuality: number;
  feedbackDistribution: Record<string, number>;
  topAgents: Array<{ agent: Agent; performance: AgentPerformance }>;
}> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentSessions = await db.learningSessions
      .where('createdAt')
      .aboveOrEqual(cutoffDate)
      .toArray();

    const totalSessions = recentSessions.length;
    const averageQuality = recentSessions.length > 0 
      ? recentSessions.reduce((sum, session) => sum + session.responseQuality, 0) / recentSessions.length
      : 0;

    const feedbackDistribution = recentSessions.reduce((acc, session) => {
      acc[session.userFeedback] = (acc[session.userFeedback] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get top performing agents
    const agentPerformance = await getAllAgentPerformance();
    const agents = await db.agents.toArray();
    const agentMap = new Map(agents.map(agent => [agent.id, agent]));

    const topAgents = agentPerformance
      .filter(perf => perf.totalInteractions >= 5) // Only agents with sufficient data
      .sort((a, b) => b.averageResponseQuality - a.averageResponseQuality)
      .slice(0, 5)
      .map(perf => ({
        agent: agentMap.get(perf.agentId)!,
        performance: perf,
      }))
      .filter(item => item.agent); // Filter out agents that might have been deleted

    return {
      totalSessions,
      averageQuality,
      feedbackDistribution,
      topAgents,
    };
  } catch (error) {
    console.error('Error getting learning insights:', error);
    return {
      totalSessions: 0,
      averageQuality: 0,
      feedbackDistribution: {},
      topAgents: [],
    };
  }
}

// Analyze conversation patterns for improvement
export async function analyzeConversationPatterns(chatId: string): Promise<{
  messageCount: number;
  averageResponseTime?: number;
  qualityTrend: number[];
  topics: string[];
}> {
  try {
    const messages = await db.messages.where('chatId').equals(chatId).toArray();
    const learningSessions = await db.learningSessions.where('chatId').equals(chatId).toArray();

    const messageCount = messages.length;
    
    // Calculate quality trend (simplified)
    const qualityTrend = learningSessions
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map(session => session.responseQuality);

    // Extract topics from messages (simplified keyword extraction)
    const allText = messages.map(m => m.content).join(' ').toLowerCase();
    const commonTopics = ['research', 'writing', 'code', 'analysis', 'creative', 'problem', 'solution'];
    const topics = commonTopics.filter(topic => allText.includes(topic));

    return {
      messageCount,
      qualityTrend,
      topics,
    };
  } catch (error) {
    console.error('Error analyzing conversation patterns:', error);
    return {
      messageCount: 0,
      qualityTrend: [],
      topics: [],
    };
  }
}

// Generate improvement suggestions based on learning data
export async function generateImprovementSuggestions(): Promise<string[]> {
  try {
    const insights = await getLearningInsights(30);
    const suggestions: string[] = [];

    if (insights.averageQuality < 7) {
      suggestions.push('Consider providing more detailed responses to improve user satisfaction');
    }

    if (insights.feedbackDistribution.negative > insights.feedbackDistribution.positive) {
      suggestions.push('Focus on understanding user needs better before responding');
    }

    if (insights.totalSessions < 10) {
      suggestions.push('More interaction data needed for better insights');
    }

    const lowPerformingAgents = insights.topAgents.filter(item => 
      item.performance.averageResponseQuality < 6
    );

    if (lowPerformingAgents.length > 0) {
      suggestions.push(`Consider improving system prompts for: ${lowPerformingAgents.map(item => item.agent.name).join(', ')}`);
    }

    return suggestions;
  } catch (error) {
    console.error('Error generating improvement suggestions:', error);
    return ['Unable to generate suggestions at this time'];
  }
}

// Track user preferences and patterns
export async function trackUserPreferences(chatId: string, messageContent: string): Promise<void> {
  try {
    // This could be extended to track user preferences, topics of interest, etc.
    // For now, we'll just log the interaction
    console.log('User interaction tracked:', { chatId, messageLength: messageContent.length });
  } catch (error) {
    console.error('Error tracking user preferences:', error);
  }
}