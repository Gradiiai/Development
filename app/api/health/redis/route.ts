import { NextRequest, NextResponse } from 'next/server';
import { checkAllRedisServices } from '@/lib/redis';
import { createRedisHealthCheck, redisMonitor } from '@/lib/redis/monitor';
import { redisCircuitBreaker } from '@/lib/redis/circuit-breaker';

export async function GET(request: NextRequest) {
  try {
    // Get detailed health status from monitor
    const detailedHealth = await createRedisHealthCheck();
    
    // Test all Redis services
    const servicesHealth = await checkAllRedisServices();
    
    // Get connection statistics
    const stats = redisMonitor.getConnectionStats();
    
    // Get circuit breaker status
    const circuitBreakerStats = redisCircuitBreaker.getStats();
    
    const response = {
      success: detailedHealth.isConnected && circuitBreakerStats.state !== 'open',
      message: detailedHealth.isConnected 
        ? (circuitBreakerStats.state === 'open' 
          ? 'Redis Cloud connection healthy but circuit breaker is OPEN' 
          : 'Redis Cloud (Gradii-redis) is healthy')
        : 'Redis Cloud connection issues detected',
      connection: {
        status: detailedHealth.status,
        isConnected: detailedHealth.isConnected,
        latency: detailedHealth.latency,
        clientCount: detailedHealth.clientCount,
        memoryUsage: detailedHealth.memoryUsage,
        error: detailedHealth.error,
      },
      circuitBreaker: {
        state: circuitBreakerStats.state,
        failureCount: circuitBreakerStats.failureCount,
        lastFailureTime: circuitBreakerStats.lastFailureTime ? new Date(circuitBreakerStats.lastFailureTime).toISOString() : null,
        nextAttemptTime: circuitBreakerStats.nextAttemptTime ? new Date(circuitBreakerStats.nextAttemptTime).toISOString() : null,
      },
      services: servicesHealth,
      statistics: stats,
      timestamp: new Date().toISOString(),
      lastCheck: new Date(detailedHealth.lastCheck).toISOString(),
    };
    
    // Return appropriate status code
    const statusCode = (detailedHealth.isConnected && circuitBreakerStats.state !== 'open') ? 200 : 503;
    
    return NextResponse.json(response, { status: statusCode });
    
  } catch (error) {
    console.error('Redis health check failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Redis health check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        connection: {
          status: 'error',
          isConnected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}