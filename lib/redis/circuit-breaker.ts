import { getRedisClient } from './connection';

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  recoveryTimeout: number; // Time to wait before attempting recovery (ms)
  monitorInterval: number; // How often to check circuit status (ms)
}

export enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Circuit is open, rejecting requests
  HALF_OPEN = 'half_open' // Testing if service has recovered
}

export class RedisCircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private nextAttemptTime = 0;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: 3,
      recoveryTimeout: 30000, // 30 seconds
      monitorInterval: 5000,   // 5 seconds
      ...config
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error('Circuit breaker is OPEN - Redis operations temporarily disabled');
      }
      // Time to test if service has recovered
      this.state = CircuitState.HALF_OPEN;
      console.log('🔄 Circuit breaker moving to HALF_OPEN state');
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      console.log('✅ Circuit breaker recovered - moving to CLOSED state');
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
      console.error(`🚨 Circuit breaker OPENED after ${this.failureCount} failures - Redis operations disabled for ${this.config.recoveryTimeout}ms`);
    }
  }

  // Special method for SSL/TLS configuration errors that should immediately open the circuit
  onConfigurationError(): void {
    console.error('🚨 Redis configuration error detected - immediately opening circuit breaker');
    this.state = CircuitState.OPEN;
    this.failureCount = this.config.failureThreshold;
    this.lastFailureTime = Date.now();
    this.nextAttemptTime = Date.now() + (this.config.recoveryTimeout * 2); // Double the recovery time for config issues
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats(): {
    state: CircuitState;
    failureCount: number;
    lastFailureTime: number;
    nextAttemptTime: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
    console.log('🔄 Circuit breaker manually reset');
  }
}

// Global circuit breaker instance for Redis operations
export const redisCircuitBreaker = new RedisCircuitBreaker({
  failureThreshold: 3,
  recoveryTimeout: 30000, // 30 seconds
  monitorInterval: 5000,
});

// Wrapper function for Redis operations with circuit breaker
export async function executeWithCircuitBreaker<T>(
  operation: () => Promise<T>,
  fallback?: () => T
): Promise<T> {
  try {
    return await redisCircuitBreaker.execute(operation);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Circuit breaker is OPEN')) {
      console.warn('⚠️ Redis circuit breaker is open, using fallback if available');
      if (fallback) {
        return fallback();
      }
    }
    throw error;
  }
}

// Enhanced Redis client getter with circuit breaker
export async function getRedisClientWithCircuitBreaker() {
  return executeWithCircuitBreaker(async () => {
    const client = await getRedisClient();
    
    // Ensure client is ready before testing
    if (client.status !== 'ready') {
      throw new Error('Redis client is not ready');
    }
    
    // Test the connection with a simple ping
    const result = await client.ping();
    if (result !== 'PONG') {
      throw new Error('Redis ping failed');
    }
    
    return client;
  });
}