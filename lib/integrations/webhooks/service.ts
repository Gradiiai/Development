import { db } from '@/lib/database/connection';
import { webhooks, webhookDeliveries } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
  companyId: string;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  response?: string;
  error?: string;
  deliveryId: string;
}

export class WebhookService {
  /**
   * Trigger webhooks for a specific event
   */
  static async triggerWebhooks(
    companyId: string,
    event: string,
    data: any
  ): Promise<WebhookDeliveryResult[]> {
    try {
      // Get active webhooks for this company and event
      const activeWebhooks = await db
        .select()
        .from(webhooks)
        .where(
          and(
            eq(webhooks.companyId, companyId),
            eq(webhooks.isActive, true)
          )
        );

      // Filter webhooks that are subscribed to this event
      const relevantWebhooks = activeWebhooks.filter(webhook => {
        const events = Array.isArray(webhook.events) ? webhook.events : [];
        return events.includes(event);
      });

      if (relevantWebhooks.length === 0) {
        return [];
      }

      const payload: WebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data,
        companyId,
      };

      // Deliver to all relevant webhooks
      const deliveryPromises = relevantWebhooks.map(webhook => 
        this.deliverWebhook(webhook, payload)
      );

      const results = await Promise.allSettled(deliveryPromises);
      
      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            success: false,
            error: result.reason?.message || 'Unknown error',
            deliveryId: `failed_${Date.now()}_${index}`,
          };
        }
      });
    } catch (error) {
      console.error('Error triggering webhooks:', error);
      return [];
    }
  }

  /**
   * Deliver webhook to a specific endpoint
   */
  private static async deliverWebhook(
    webhook: any,
    payload: WebhookPayload
  ): Promise<WebhookDeliveryResult> {
    const deliveryId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // Create webhook signature
      const signature = this.createSignature(payload, webhook.secret);
      
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Gradii-Webhooks/1.0',
        'X-Webhook-Signature': signature,
        'X-Webhook-Delivery': deliveryId,
        'X-Webhook-Event': payload.event,
        'X-Webhook-Timestamp': payload.timestamp,
        ...webhook.headers,
      };

      // Make HTTP request with retry logic
      let lastError: Error | null = null;
      let response: Response | null = null;
      
      for (let attempt = 0; attempt <= webhook.retryAttempts; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), webhook.timeout);

          response = await fetch(webhook.url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          // If successful (2xx status), break the retry loop
          if (response.ok) {
            break;
          }
          
          // If it's a client error (4xx), don't retry
          if (response.status >= 400 && response.status < 500) {
            break;
          }
          
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        } catch (error) {
          lastError = error as Error;
          
          // Wait before retry (exponential backoff)
          if (attempt < webhook.retryAttempts) {
            await this.sleep(Math.pow(2, attempt) * 1000);
          }
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      let responseText = '';
      try {
        responseText = response ? await response.text() : '';
      } catch (e) {
        // Ignore response reading errors
      }

      const success = response?.ok || false;
      const statusCode = response?.status;

      // Log delivery attempt
      await this.logDelivery({
        id: deliveryId,
        webhookId: webhook.id,
        event: payload.event,
        payload: JSON.stringify(payload),
        success,
        statusCode,
        response: responseText.substring(0, 1000), // Limit response size
        error: lastError?.message,
        duration,
        attempt: webhook.retryAttempts + 1,
      });

      return {
        success,
        statusCode,
        response: responseText,
        error: lastError?.message,
        deliveryId,
      };
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Log failed delivery
      await this.logDelivery({
        id: deliveryId,
        webhookId: webhook.id,
        event: payload.event,
        payload: JSON.stringify(payload),
        success: false,
        error: (error as Error).message,
        duration,
        attempt: 1,
      });

      return {
        success: false,
        error: (error as Error).message,
        deliveryId,
      };
    }
  }

  /**
   * Create HMAC signature for webhook verification
   */
  private static createSignature(payload: WebhookPayload, secret: string): string {
    const payloadString = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadString);
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Verify webhook signature
   */
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    const receivedSignature = signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );
  }

  /**
   * Log webhook delivery attempt
   */
  private static async logDelivery(deliveryData: {
    id: string;
    webhookId: string;
    event: string;
    payload: string;
    success: boolean;
    statusCode?: number;
    response?: string;
    error?: string;
    duration: number;
    attempt: number;
  }): Promise<void> {
    try {
      await db.insert(webhookDeliveries).values({
        id: deliveryData.id,
        webhookId: deliveryData.webhookId,
        event: deliveryData.event,
        payload: deliveryData.payload,
        success: deliveryData.success,
        statusCode: deliveryData.statusCode,
        response: deliveryData.response,
        error: deliveryData.error,
        duration: deliveryData.duration,
        attempt: deliveryData.attempt,
      });
    } catch (error) {
      console.error('Error logging webhook delivery:', error);
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get webhook delivery logs
   */
  static async getDeliveryLogs(
    webhookId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      return await db
        .select()
        .from(webhookDeliveries)
        .where(eq(webhookDeliveries.webhookId, webhookId))
        .orderBy(webhookDeliveries.createdAt)
        .limit(limit);
    } catch (error) {
      console.error('Error fetching delivery logs:', error);
      return [];
    }
  }

  /**
   * Test webhook endpoint
   */
  static async testWebhook(webhookId: string): Promise<WebhookDeliveryResult> {
    try {
      const webhook = await db
        .select()
        .from(webhooks)
        .where(eq(webhooks.id, webhookId))
        .limit(1);

      if (webhook.length === 0) {
        throw new Error('Webhook not found');
      }

      const testPayload: WebhookPayload = {
        event: 'webhook.test',
        timestamp: new Date().toISOString(),
        data: {
          message: 'This is a test webhook delivery',
          webhookId,
        },
        companyId: webhook[0].companyId,
      };

      return await this.deliverWebhook(webhook[0], testPayload);
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        deliveryId: `test_failed_${Date.now()}`,
      };
    }
  }
}

// Event trigger helpers
export const triggerCandidateEvent = (companyId: string, event: string, candidateData: any) => {
  return WebhookService.triggerWebhooks(companyId, event, candidateData);
};

export const triggerInterviewEvent = (companyId: string, event: string, interviewData: any) => {
  return WebhookService.triggerWebhooks(companyId, event, interviewData);
};

export const triggerJobEvent = (companyId: string, event: string, jobData: any) => {
  return WebhookService.triggerWebhooks(companyId, event, jobData);
};

export const triggerApplicationEvent = (companyId: string, event: string, applicationData: any) => {
  return WebhookService.triggerWebhooks(companyId, event, applicationData);
};