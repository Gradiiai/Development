import { WebhookService } from './service';
import { db } from '@/lib/database/connection';
import { companies } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

export interface StripeWebhookPayload {
  event: string;
  timestamp: string;
  data: {
    subscription?: Stripe.Subscription;
    customer?: Stripe.Customer;
    invoice?: Stripe.Invoice;
    plan?: any;
    company?: any;
    [key: string]: any;
  };
  companyId: string;
}

export class StripeWebhookService {
  /**
   * Trigger subscription created webhook
   */
  static async triggerSubscriptionCreated(
    companyId: string,
    subscription: Stripe.Subscription,
    customer: Stripe.Customer
  ) {
    const payload: StripeWebhookPayload = {
      event: 'subscription.created',
      timestamp: new Date().toISOString(),
      data: {
        subscription,
        customer,
        subscriptionId: subscription.id,
        customerId: customer.id,
        status: subscription.status,
        priceId: subscription.items.data[0]?.price.id,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000).toISOString(),
      },
      companyId,
    };

    return WebhookService.triggerWebhooks(companyId, 'subscription.created', payload);
  }

  /**
   * Trigger subscription updated webhook
   */
  static async triggerSubscriptionUpdated(
    companyId: string,
    subscription: Stripe.Subscription,
    previousAttributes?: any
  ) {
    const payload: StripeWebhookPayload = {
      event: 'subscription.updated',
      timestamp: new Date().toISOString(),
      data: {
        subscription,
        subscriptionId: subscription.id,
        status: subscription.status,
        priceId: subscription.items.data[0]?.price.id,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        previousAttributes,
      },
      companyId,
    };

    return WebhookService.triggerWebhooks(companyId, 'subscription.updated', payload);
  }

  /**
   * Trigger subscription cancelled webhook
   */
  static async triggerSubscriptionCancelled(
    companyId: string,
    subscription: Stripe.Subscription
  ) {
    const payload: StripeWebhookPayload = {
      event: 'subscription.cancelled',
      timestamp: new Date().toISOString(),
      data: {
        subscription,
        subscriptionId: subscription.id,
        cancelledAt: new Date().toISOString(),
        endedAt: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
      },
      companyId,
    };

    return WebhookService.triggerWebhooks(companyId, 'subscription.cancelled', payload);
  }

  /**
   * Trigger payment succeeded webhook
   */
  static async triggerPaymentSucceeded(
    companyId: string,
    invoice: Stripe.Invoice
  ) {
    const payload: StripeWebhookPayload = {
      event: 'payment.succeeded',
      timestamp: new Date().toISOString(),
      data: {
        invoice,
        invoiceId: invoice.id,
        subscriptionId: (invoice as any).subscription,
        customerId: invoice.customer,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        paidAt: new Date().toISOString(),
        receiptUrl: invoice.hosted_invoice_url,
      },
      companyId,
    };

    return WebhookService.triggerWebhooks(companyId, 'payment.succeeded', payload);
  }

  /**
   * Trigger payment failed webhook
   */
  static async triggerPaymentFailed(
    companyId: string,
    invoice: Stripe.Invoice
  ) {
    const payload: StripeWebhookPayload = {
      event: 'payment.failed',
      timestamp: new Date().toISOString(),
      data: {
        invoice,
        invoiceId: invoice.id,
        subscriptionId: (invoice as any).subscription,
        customerId: invoice.customer,
        amountDue: invoice.amount_due,
        currency: invoice.currency,
        attemptCount: invoice.attempt_count,
        nextPaymentAttempt: invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000).toISOString() : null,
      },
      companyId,
    };

    return WebhookService.triggerWebhooks(companyId, 'payment.failed', payload);
  }

  /**
   * Trigger customer created webhook
   */
  static async triggerCustomerCreated(
    companyId: string,
    customer: Stripe.Customer
  ) {
    const payload: StripeWebhookPayload = {
      event: 'customer.created',
      timestamp: new Date().toISOString(),
      data: {
        customer,
        customerId: customer.id,
        email: customer.email,
        name: customer.name,
        createdAt: new Date(customer.created * 1000).toISOString(),
      },
      companyId,
    };

    return WebhookService.triggerWebhooks(companyId, 'customer.created', payload);
  }

  /**
   * Trigger customer updated webhook
   */
  static async triggerCustomerUpdated(
    companyId: string,
    customer: Stripe.Customer,
    previousAttributes?: any
  ) {
    const payload: StripeWebhookPayload = {
      event: 'customer.updated',
      timestamp: new Date().toISOString(),
      data: {
        customer,
        customerId: customer.id,
        email: customer.email,
        name: customer.name,
        previousAttributes,
      },
      companyId,
    };

    return WebhookService.triggerWebhooks(companyId, 'customer.updated', payload);
  }

  /**
   * Trigger plan changed webhook
   */
  static async triggerPlanChanged(
    companyId: string,
    oldPlan: any,
    newPlan: any,
    subscription: Stripe.Subscription
  ) {
    const payload: StripeWebhookPayload = {
      event: 'plan.changed',
      timestamp: new Date().toISOString(),
      data: {
        subscription,
        subscriptionId: subscription.id,
        oldPlan,
        newPlan,
        changedAt: new Date().toISOString(),
        effectiveDate: new Date((subscription as any).current_period_end * 1000).toISOString(),
      },
      companyId,
    };

    return WebhookService.triggerWebhooks(companyId, 'plan.changed', payload);
  }

  /**
   * Trigger invoice created webhook
   */
  static async triggerInvoiceCreated(
    companyId: string,
    invoice: Stripe.Invoice
  ) {
    const payload: StripeWebhookPayload = {
      event: 'invoice.created',
      timestamp: new Date().toISOString(),
      data: {
        invoice,
        invoiceId: invoice.id,
        subscriptionId: (invoice as any).subscription,
        customerId: invoice.customer,
        amountDue: invoice.amount_due,
        currency: invoice.currency,
        dueDate: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
        status: invoice.status,
      },
      companyId,
    };

    return WebhookService.triggerWebhooks(companyId, 'invoice.created', payload);
  }

  /**
   * Trigger invoice paid webhook
   */
  static async triggerInvoicePaid(
    companyId: string,
    invoice: Stripe.Invoice
  ) {
    const payload: StripeWebhookPayload = {
      event: 'invoice.paid',
      timestamp: new Date().toISOString(),
      data: {
        invoice,
        invoiceId: invoice.id,
        subscriptionId: (invoice as any).subscription,
        customerId: invoice.customer,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        paidAt: new Date().toISOString(),
        receiptUrl: invoice.hosted_invoice_url,
      },
      companyId,
    };

    return WebhookService.triggerWebhooks(companyId, 'invoice.paid', payload);
  }

  /**
   * Helper function to get company ID from Stripe customer ID
   */
  static async getCompanyIdFromCustomer(customerId: string): Promise<string | null> {
    try {
      const company = await db
        .select({ id: companies.id })
        .from(companies)
        .where(eq(companies.stripeCustomerId, customerId))
        .limit(1);

      return company.length > 0 ? company[0].id : null;
    } catch (error) {
      console.error('Error getting company ID from customer:', error);
      return null;
    }
  }

  /**
   * Helper function to get company ID from Stripe subscription
   */
  static async getCompanyIdFromSubscription(subscriptionId: string): Promise<string | null> {
    try {
      const company = await db
        .select({ id: companies.id })
        .from(companies)
        .where(eq(companies.stripeSubscriptionId, subscriptionId))
        .limit(1);

      return company.length > 0 ? company[0].id : null;
    } catch (error) {
      console.error('Error getting company ID from subscription:', error);
      return null;
    }
  }
}

// Export convenience functions
export const triggerStripeWebhook = {
  subscriptionCreated: StripeWebhookService.triggerSubscriptionCreated,
  subscriptionUpdated: StripeWebhookService.triggerSubscriptionUpdated,
  subscriptionCancelled: StripeWebhookService.triggerSubscriptionCancelled,
  paymentSucceeded: StripeWebhookService.triggerPaymentSucceeded,
  paymentFailed: StripeWebhookService.triggerPaymentFailed,
  customerCreated: StripeWebhookService.triggerCustomerCreated,
  customerUpdated: StripeWebhookService.triggerCustomerUpdated,
  planChanged: StripeWebhookService.triggerPlanChanged,
  invoiceCreated: StripeWebhookService.triggerInvoiceCreated,
  invoicePaid: StripeWebhookService.triggerInvoicePaid,
};