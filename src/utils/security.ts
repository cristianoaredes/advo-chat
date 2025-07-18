import { db } from '../db';

export interface SecurityConfig {
  encryptionEnabled: boolean;
  auditLogging: boolean;
  dataRetention: number; // days
  accessControl: boolean;
  complianceMode: 'basic' | 'enterprise' | 'government';
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
}

export interface SecurityEvent {
  id: string;
  type: 'authentication' | 'authorization' | 'data_access' | 'system_change' | 'security_alert';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details: any;
  timestamp: Date;
  resolved: boolean;
}

export interface EncryptionKey {
  id: string;
  algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305';
  key: CryptoKey;
  createdAt: Date;
  expiresAt: Date;
}

export class SecurityManager {
  private config: SecurityConfig;
  private auditLogs: AuditLog[] = [];
  private securityEvents: SecurityEvent[] = [];
  private encryptionKeys: Map<string, EncryptionKey> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(config: SecurityConfig) {
    this.config = config;
    this.initializeSecurity();
  }

  // Initialize security features
  private async initializeSecurity(): Promise<void> {
    if (this.config.encryptionEnabled) {
      await this.generateEncryptionKeys();
    }

    if (this.config.auditLogging) {
      this.startAuditLogging();
    }

    // Set up periodic security checks
    setInterval(() => {
      this.performSecurityChecks();
    }, 300000); // Every 5 minutes
  }

  // Generate encryption keys
  private async generateEncryptionKeys(): Promise<void> {
    try {
      const algorithm = 'AES-256-GCM';
      const key = await crypto.subtle.generateKey(
        {
          name: algorithm,
          length: 256,
        },
        true,
        ['encrypt', 'decrypt']
      );

      const encryptionKey: EncryptionKey = {
        id: crypto.randomUUID(),
        algorithm: 'AES-256-GCM',
        key,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      };

      this.encryptionKeys.set(encryptionKey.id, encryptionKey);
      this.logSecurityEvent('system_change', 'medium', 'Encryption key generated', { keyId: encryptionKey.id });
    } catch (error) {
      console.error('Failed to generate encryption key:', error);
      this.logSecurityEvent('security_alert', 'high', 'Failed to generate encryption key', { error: error.message });
    }
  }

  // Encrypt sensitive data
  async encryptData(data: string): Promise<string> {
    if (!this.config.encryptionEnabled) {
      return data;
    }

    try {
      const key = Array.from(this.encryptionKeys.values())[0];
      if (!key) {
        throw new Error('No encryption key available');
      }

      const encoder = new TextEncoder();
      const encodedData = encoder.encode(data);

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: key.algorithm,
          iv,
        },
        key.key,
        encodedData
      );

      const encryptedArray = new Uint8Array(encryptedData);
      const combined = new Uint8Array(iv.length + encryptedArray.length);
      combined.set(iv);
      combined.set(encryptedArray, iv.length);

      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      this.logSecurityEvent('security_alert', 'high', 'Data encryption failed', { error: error.message });
      throw error;
    }
  }

  // Decrypt sensitive data
  async decryptData(encryptedData: string): Promise<string> {
    if (!this.config.encryptionEnabled) {
      return encryptedData;
    }

    try {
      const key = Array.from(this.encryptionKeys.values())[0];
      if (!key) {
        throw new Error('No encryption key available');
      }

      const combined = new Uint8Array(atob(encryptedData).split('').map(char => char.charCodeAt(0)));
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);

      const decryptedData = await crypto.subtle.decrypt(
        {
          name: key.algorithm,
          iv,
        },
        key.key,
        data
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedData);
    } catch (error) {
      console.error('Decryption failed:', error);
      this.logSecurityEvent('security_alert', 'high', 'Data decryption failed', { error: error.message });
      throw error;
    }
  }

  // Audit logging
  async logAuditEvent(
    userId: string,
    action: string,
    resource: string,
    resourceId: string,
    details: any,
    success: boolean = true
  ): Promise<void> {
    if (!this.config.auditLogging) return;

    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      userId,
      action,
      resource,
      resourceId,
      details,
      ipAddress: await this.getClientIP(),
      userAgent: navigator.userAgent,
      timestamp: new Date(),
      success,
    };

    this.auditLogs.push(auditLog);
    this.emit('audit_logged', auditLog);

    // Store in database for persistence
    try {
      await db.auditLogs?.add(auditLog);
    } catch (error) {
      console.error('Failed to store audit log:', error);
    }
  }

  // Security event logging
  private logSecurityEvent(
    type: SecurityEvent['type'],
    severity: SecurityEvent['severity'],
    description: string,
    details: any
  ): void {
    const event: SecurityEvent = {
      id: crypto.randomUUID(),
      type,
      severity,
      description,
      details,
      timestamp: new Date(),
      resolved: false,
    };

    this.securityEvents.push(event);
    this.emit('security_event', event);

    // Alert for high/critical events
    if (severity === 'high' || severity === 'critical') {
      this.emit('security_alert', event);
    }
  }

  // Access control
  async checkAccess(userId: string, resource: string, action: string): Promise<boolean> {
    if (!this.config.accessControl) return true;

    // Implement role-based access control
    const user = await db.users?.get(userId);
    if (!user) return false;

    const permissions = this.getUserPermissions(user.role);
    return permissions.some(p => p.resource === resource && p.actions.includes(action));
  }

  // Get user permissions based on role
  private getUserPermissions(role: string): Array<{ resource: string; actions: string[] }> {
    const permissions = {
      admin: [
        { resource: '*', actions: ['*'] },
      ],
      manager: [
        { resource: 'workflows', actions: ['read', 'write', 'execute'] },
        { resource: 'documents', actions: ['read', 'write'] },
        { resource: 'agents', actions: ['read', 'write'] },
        { resource: 'analytics', actions: ['read'] },
      ],
      user: [
        { resource: 'workflows', actions: ['read', 'execute'] },
        { resource: 'documents', actions: ['read', 'write'] },
        { resource: 'agents', actions: ['read'] },
      ],
      viewer: [
        { resource: 'workflows', actions: ['read'] },
        { resource: 'documents', actions: ['read'] },
        { resource: 'agents', actions: ['read'] },
      ],
    };

    return permissions[role as keyof typeof permissions] || permissions.viewer;
  }

  // Data retention and cleanup
  async performDataRetention(): Promise<void> {
    if (this.config.dataRetention <= 0) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.dataRetention);

    // Clean up old audit logs
    const oldAuditLogs = this.auditLogs.filter(log => log.timestamp < cutoffDate);
    this.auditLogs = this.auditLogs.filter(log => log.timestamp >= cutoffDate);

    // Clean up old security events
    const oldSecurityEvents = this.securityEvents.filter(event => event.timestamp < cutoffDate);
    this.securityEvents = this.securityEvents.filter(event => event.timestamp >= cutoffDate);

    // Clean up expired encryption keys
    const now = new Date();
    for (const [keyId, key] of this.encryptionKeys.entries()) {
      if (key.expiresAt < now) {
        this.encryptionKeys.delete(keyId);
      }
    }

    this.logSecurityEvent('system_change', 'low', 'Data retention cleanup performed', {
      auditLogsRemoved: oldAuditLogs.length,
      securityEventsRemoved: oldSecurityEvents.length,
    });
  }

  // Security checks
  private async performSecurityChecks(): Promise<void> {
    // Check for expired encryption keys
    const now = new Date();
    const expiredKeys = Array.from(this.encryptionKeys.values()).filter(key => key.expiresAt < now);
    
    if (expiredKeys.length > 0) {
      this.logSecurityEvent('security_alert', 'medium', 'Encryption keys expired', {
        expiredKeys: expiredKeys.length,
      });
      await this.generateEncryptionKeys();
    }

    // Check for suspicious activity
    const recentAuditLogs = this.auditLogs.filter(log => 
      log.timestamp > new Date(Date.now() - 60 * 60 * 1000) // Last hour
    );

    const failedLogins = recentAuditLogs.filter(log => 
      log.action === 'login' && !log.success
    );

    if (failedLogins.length > 5) {
      this.logSecurityEvent('security_alert', 'high', 'Multiple failed login attempts detected', {
        failedAttempts: failedLogins.length,
      });
    }

    // Check for unusual data access patterns
    const dataAccessLogs = recentAuditLogs.filter(log => 
      log.resource === 'documents' || log.resource === 'workflows'
    );

    if (dataAccessLogs.length > 100) {
      this.logSecurityEvent('security_alert', 'medium', 'Unusual data access pattern detected', {
        accessCount: dataAccessLogs.length,
      });
    }
  }

  // Compliance reporting
  async generateComplianceReport(): Promise<{
    auditLogs: AuditLog[];
    securityEvents: SecurityEvent[];
    dataRetention: {
      totalLogs: number;
      logsRetained: number;
      logsRemoved: number;
    };
    encryption: {
      enabled: boolean;
      activeKeys: number;
      expiredKeys: number;
    };
    accessControl: {
      enabled: boolean;
      totalChecks: number;
      deniedAccess: number;
    };
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.dataRetention);

    const totalLogs = this.auditLogs.length;
    const logsRetained = this.auditLogs.filter(log => log.timestamp >= cutoffDate).length;
    const logsRemoved = totalLogs - logsRetained;

    const activeKeys = this.encryptionKeys.size;
    const expiredKeys = Array.from(this.encryptionKeys.values()).filter(key => key.expiresAt < new Date()).length;

    return {
      auditLogs: this.auditLogs,
      securityEvents: this.securityEvents,
      dataRetention: {
        totalLogs,
        logsRetained,
        logsRemoved,
      },
      encryption: {
        enabled: this.config.encryptionEnabled,
        activeKeys,
        expiredKeys,
      },
      accessControl: {
        enabled: this.config.accessControl,
        totalChecks: this.auditLogs.filter(log => log.action === 'access_check').length,
        deniedAccess: this.auditLogs.filter(log => log.action === 'access_check' && !log.success).length,
      },
    };
  }

  // Get client IP address
  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
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

  // Start audit logging
  private startAuditLogging(): void {
    // Log system startup
    this.logSecurityEvent('system_change', 'low', 'Security system initialized', {
      config: this.config,
    });
  }

  // Get security configuration
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  // Update security configuration
  async updateConfig(newConfig: Partial<SecurityConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.encryptionEnabled && !this.config.encryptionEnabled) {
      await this.generateEncryptionKeys();
    }

    this.logSecurityEvent('system_change', 'medium', 'Security configuration updated', {
      changes: newConfig,
    });
  }
}