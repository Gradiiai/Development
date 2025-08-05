import { getRedisClient, getRedisStatus, checkRedisHealth } from './connection';

export interface RedisHealthStatus {
  isConnected: boolean;
  status: string;
  latency?: number;
  error?: string;
  clientCount?: number;
  memoryUsage?: string;
  lastCheck: number;
}

export class RedisMonitor {
  private static instance: RedisMonitor;
  private healthHistory: RedisHealthStatus[] = [];
  private maxHistorySize = 100;

  static getInstance(): RedisMonitor {
    if (!RedisMonitor.instance) {
      RedisMonitor.instance = new RedisMonitor();
    }
    return RedisMonitor.instance;
  }

  async getHealthStatus(): Promise<RedisHealthStatus> {
    const startTime = Date.now();
    
    try {
      const redis = await getRedisClient();
      const status = getRedisStatus();
      
      // Test connection with ping
      await redis.ping();
      const latency = Date.now() - startTime;
      
      // Get additional info
      const info = await redis.info('clients');
      const memory = await redis.info('memory');
      
      const clientCount = this.parseInfoValue(info, 'connected_clients');
      const memoryUsage = this.parseInfoValue(memory, 'used_memory_human');
      
      const healthStatus: RedisHealthStatus = {
        isConnected: true,
        status: status,
        latency,
        clientCount: clientCount ? parseInt(clientCount) : undefined,
        memoryUsage: memoryUsage || undefined,
        lastCheck: Date.now(),
      };
      
      this.addToHistory(healthStatus);
      return healthStatus;
      
    } catch (error) {
      const healthStatus: RedisHealthStatus = {
        isConnected: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: Date.now(),
      };
      
      this.addToHistory(healthStatus);
      return healthStatus;
    }
  }

  private parseInfoValue(info: string, key: string): string | null {
    const lines = info.split('\r\n');
    for (const line of lines) {
      if (line.startsWith(`${key}:`)) {
        return line.split(':')[1];
      }
    }
    return null;
  }

  private addToHistory(status: RedisHealthStatus): void {
    this.healthHistory.push(status);
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory.shift();
    }
  }

  getHealthHistory(): RedisHealthStatus[] {
    return [...this.healthHistory];
  }

  getConnectionStats(): {
    totalChecks: number;
    successfulConnections: number;
    failedConnections: number;
    averageLatency: number;
    uptime: number;
  } {
    const total = this.healthHistory.length;
    const successful = this.healthHistory.filter(h => h.isConnected).length;
    const failed = total - successful;
    
    const latencies = this.healthHistory
      .filter(h => h.latency !== undefined)
      .map(h => h.latency!);
    
    const averageLatency = latencies.length > 0 
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
      : 0;
    
    const uptime = total > 0 ? (successful / total) * 100 : 0;
    
    return {
      totalChecks: total,
      successfulConnections: successful,
      failedConnections: failed,
      averageLatency: Math.round(averageLatency),
      uptime: Math.round(uptime * 100) / 100,
    };
  }

  async startMonitoring(intervalMs: number = 30000): Promise<void> {
    console.log(`🔍 Starting Redis monitoring (interval: ${intervalMs}ms)`);
    
    const monitor = async () => {
      try {
        const status = await this.getHealthStatus();
        
        if (status.isConnected) {
          console.log(`✅ Redis Health: Connected (${status.latency}ms, ${status.clientCount} clients)`);
        } else {
          console.error(`❌ Redis Health: Disconnected - ${status.error}`);
        }
        
        // Log warnings for high latency or client count
        if (status.latency && status.latency > 1000) {
          console.warn(`⚠️ High Redis latency: ${status.latency}ms`);
        }
        
        if (status.clientCount && status.clientCount > 50) {
          console.warn(`⚠️ High Redis client count: ${status.clientCount}`);
        }
        
      } catch (error) {
        console.error('Redis monitoring error:', error);
      }
    };
    
    // Initial check
    await monitor();
    
    // Set up interval
    setInterval(monitor, intervalMs);
  }

  async generateHealthReport(): Promise<string> {
    const status = await this.getHealthStatus();
    const stats = this.getConnectionStats();
    
    return `
Redis Health Report (Gradii-redis)
==================================
Current Status: ${status.isConnected ? '✅ Connected' : '❌ Disconnected'}
Latency: ${status.latency || 'N/A'}ms
Client Count: ${status.clientCount || 'N/A'}
Memory Usage: ${status.memoryUsage || 'N/A'}
Last Check: ${new Date(status.lastCheck).toISOString()}

Statistics
----------
Total Checks: ${stats.totalChecks}
Successful: ${stats.successfulConnections}
Failed: ${stats.failedConnections}
Average Latency: ${stats.averageLatency}ms
Uptime: ${stats.uptime}%

${status.error ? `Error: ${status.error}` : ''}
    `.trim();
  }
}

// Export singleton instance
export const redisMonitor = RedisMonitor.getInstance();

// Helper function for health checks in API routes
export async function createRedisHealthCheck() {
  const monitor = RedisMonitor.getInstance();
  return await monitor.getHealthStatus();
}