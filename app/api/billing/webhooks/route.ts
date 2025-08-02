import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/database/connection';
import { companies, subscriptionTransactions, subscriptionPlans } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { StripeWebhookService } from '@/lib/integrations/webhooks/stripe';

// Stripe webhook endpoint secret
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!endpointSecret) {
  throw new Error('STRIPE_WEBHOOK_SECRET is not set in environment variables');
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  if (!endpointSecret) {
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  console.log('Received Stripe webhook event:', event.type);

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.created':
        await handleCustomerCreated(event.data.object as Stripe.Customer);
        break;

      case 'customer.updated':
        await handleCustomerUpdated(event.data.object as Stripe.Customer);
        break;

      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'invoice.created':
        // Handle invoice creation
        const createdInvoice = event.data.object as Stripe.Invoice;
        
        if ((createdInvoice as any).subscription && typeof (createdInvoice as any).subscription === 'string') {
          const companyId = await StripeWebhookService.getCompanyIdFromSubscription((createdInvoice as any).subscription);
          if (companyId) {
            await StripeWebhookService.triggerInvoiceCreated(companyId, createdInvoice);
          }
        }
        break;

      case 'invoice.paid':
        // Handle invoice paid (different from payment_succeeded)
        const paidInvoice = event.data.object as Stripe.Invoice;
        
        if ((paidInvoice as any).subscription && typeof (paidInvoice as any).subscription === 'string') {
          const companyId = await StripeWebhookService.getCompanyIdFromSubscription((paidInvoice as any).subscription);
          if (companyId) {
            await StripeWebhookService.triggerInvoicePaid(companyId, paidInvoice);
          }
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Handle subscription created
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const priceId = subscription.items.data[0]?.price.id;
  const status = subscription.status;
  const currentPeriodStart = new Date((subscription as any).current_period_start * 1000);
  const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000);
  const cancelAtPeriodEnd = subscription.cancel_at_period_end;

  try {
    // Find company by Stripe customer ID
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.stripeCustomerId, customerId))
      .limit(1);

    if (company.length === 0) {
      console.error('Company not found for customer ID:', customerId);
      return;
    }

    // Get subscription plan details
    const monthlyPlan = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.stripeMonthlyPriceId, priceId))
      .limit(1);
    
    let plan = monthlyPlan;
    if (plan.length === 0) {
      const yearlyPlan = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.stripeYearlyPriceId, priceId))
        .limit(1);
      plan = yearlyPlan;
    }

    const planName = plan.length > 0 ? plan[0].planName : 'unknown';
    const maxInterviews = plan.length > 0 ? plan[0].maxInterviews : 10;
    const maxUsers = plan.length > 0 ? plan[0].maxUsers : 5;

    // Update company with subscription details
    await db
      .update(companies)
      .set({
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        stripeCurrentPeriodStart: currentPeriodStart,
        stripeCurrentPeriodEnd: currentPeriodEnd,
        stripeStatus: status,
        stripeCancelAtPeriodEnd: cancelAtPeriodEnd,
        subscriptionPlan: planName,
        subscriptionStatus: 'active',
        maxInterviews,
        maxUsers,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, company[0].id));

    // Trigger application webhook
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    await StripeWebhookService.triggerSubscriptionCreated(company[0].id, subscription, customer);

    console.log('Subscription created for company:', company[0].name);
  } catch (error) {
    console.error('Error handling subscription created:', error);
    throw error;
  }
}

// Handle subscription updated
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const priceId = subscription.items.data[0]?.price.id;
  const status = subscription.status;
  const currentPeriodStart = new Date((subscription as any).current_period_start * 1000);
  const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000);
  const cancelAtPeriodEnd = subscription.cancel_at_period_end;

  try {
    // Find company by Stripe customer ID
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.stripeCustomerId, customerId))
      .limit(1);

    if (company.length === 0) {
      console.error('Company not found for customer ID:', customerId);
      return;
    }

    // Get subscription plan details
    const monthlyPlan = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.stripeMonthlyPriceId, priceId))
      .limit(1);
    
    let plan = monthlyPlan;
    if (plan.length === 0) {
      const yearlyPlan = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.stripeYearlyPriceId, priceId))
        .limit(1);
      plan = yearlyPlan;
    }

    const planName = plan.length > 0 ? plan[0].planName : company[0].subscriptionPlan;
    const maxInterviews = plan.length > 0 ? plan[0].maxInterviews : company[0].maxInterviews;
    const maxUsers = plan.length > 0 ? plan[0].maxUsers : company[0].maxUsers;

    // Determine subscription status based on Stripe status
    let subscriptionStatus = 'active';
    if (status === 'canceled' || status === 'incomplete_expired') {
      subscriptionStatus = 'cancelled';
    } else if (status === 'past_due') {
      subscriptionStatus = 'past_due';
    } else if (status === 'unpaid') {
      subscriptionStatus = 'unpaid';
    }

    // Update company with subscription details
    await db
      .update(companies)
      .set({
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        stripeCurrentPeriodStart: currentPeriodStart,
        stripeCurrentPeriodEnd: currentPeriodEnd,
        stripeStatus: status,
        stripeCancelAtPeriodEnd: cancelAtPeriodEnd,
        subscriptionPlan: planName,
        subscriptionStatus,
        maxInterviews,
        maxUsers,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, company[0].id));

    // Trigger application webhook
    await StripeWebhookService.triggerSubscriptionUpdated(company[0].id, subscription, {});

    console.log('Subscription updated for company:', company[0].name);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
    throw error;
  }
}

// Handle subscription deleted/cancelled
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  try {
    // Find company by Stripe customer ID
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.stripeCustomerId, customerId))
      .limit(1);

    if (company.length === 0) {
      console.error('Company not found for customer ID:', customerId);
      return;
    }

    // Update company to free plan
    await db
      .update(companies)
      .set({
        stripeSubscriptionId: null,
        stripePriceId: null,
        stripeStatus: 'canceled',
        subscriptionPlan: 'free',
        subscriptionStatus: 'cancelled',
        maxInterviews: 10, // Free plan limits
        maxUsers: 5,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, company[0].id));

    // Trigger application webhook
    await StripeWebhookService.triggerSubscriptionCancelled(company[0].id, subscription);

    console.log('Subscription cancelled for company:', company[0].name);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
    throw error;
  }
}

// Handle successful invoice payment
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const subscriptionId = typeof (invoice as any).subscription === 'string' ? (invoice as any).subscription : (invoice as any).subscription?.id || '';
  const amountPaid = invoice.amount_paid;
  const currency = invoice.currency;
  const invoiceId = invoice.id;

  try {
    // Find company by Stripe customer ID
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.stripeCustomerId, customerId))
      .limit(1);

    if (company.length === 0) {
      console.error('Company not found for customer ID:', customerId);
      return;
    }

    // Get subscription plan
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price.id;
    
    const monthlyPlan = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.stripeMonthlyPriceId, priceId))
      .limit(1);
    
    let plan = monthlyPlan;
    if (plan.length === 0) {
      const yearlyPlan = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.stripeYearlyPriceId, priceId))
        .limit(1);
      plan = yearlyPlan;
    }

    if (plan.length > 0) {
      // Determine billing period
      const billingPeriod = priceId === plan[0].stripeMonthlyPriceId ? 'monthly' : 'yearly';
      
      // Create transaction record
      await db.insert(subscriptionTransactions).values({
        companyId: company[0].id,
        planId: plan[0].id,
        transactionAmount: amountPaid,
        currency: currency.toUpperCase(),
        paymentStatus: 'success',
        subscriptionPeriod: billingPeriod,
        startDate: new Date((subscription as any).current_period_start * 1000),
        endDate: new Date((subscription as any).current_period_end * 1000),
        stripeInvoiceId: invoiceId,
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
        paymentProcessor: 'stripe',
        receiptUrl: invoice.hosted_invoice_url,
      });

      // Trigger application webhook
      await StripeWebhookService.triggerPaymentSucceeded(company[0].id, invoice);
    }

    // Update company subscription status
    await db
      .update(companies)
      .set({
        subscriptionStatus: 'active',
        updatedAt: new Date(),
      })
      .where(eq(companies.id, company[0].id));

    console.log('Payment succeeded for company:', company[0].name);
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
    throw error;
  }
}

// Handle failed invoice payment
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  try {
    // Find company by Stripe customer ID
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.stripeCustomerId, customerId))
      .limit(1);

    if (company.length === 0) {
      console.error('Company not found for customer ID:', customerId);
      return;
    }

    // Update company subscription status
    await db
      .update(companies)
      .set({
        subscriptionStatus: 'past_due',
        updatedAt: new Date(),
      })
      .where(eq(companies.id, company[0].id));

    // Trigger application webhook
    await StripeWebhookService.triggerPaymentFailed(company[0].id, invoice);

    console.log('Payment failed for company:', company[0].name);
  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
    throw error;
  }
}

// Handle customer created
async function handleCustomerCreated(customer: Stripe.Customer) {
  const customerId = customer.id;
  const email = customer.email;
  const companyId = customer.metadata?.companyId;

  if (!companyId) {
    console.log('No companyId in customer metadata');
    return;
  }

  try {
    // Update company with Stripe customer ID
    await db
      .update(companies)
      .set({
        stripeCustomerId: customerId,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId));

    console.log('Customer created and linked to company:', companyId);
  } catch (error) {
    console.error('Error handling customer created:', error);
    throw error;
  }
}

// Handle customer updated
async function handleCustomerUpdated(customer: Stripe.Customer) {
  const customerId = customer.id;
  const companyId = customer.metadata?.companyId;

  if (!companyId) {
    console.log('No companyId in customer metadata');
    return;
  }

  try {
    // Update company with any relevant customer changes
    await db
      .update(companies)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId));

    // Trigger application webhook
    await StripeWebhookService.triggerCustomerUpdated(companyId, customer);

    console.log('Customer updated for company:', companyId);
  } catch (error) {
    console.error('Error handling customer updated:', error);
    throw error;
  }
}

// Handle checkout session completed
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const companyId = session.metadata?.companyId;

  if (!companyId) {
    console.log('No companyId in session metadata');
    return;
  }

  try {
    // The subscription.created event will handle the main logic
    // This is just for logging and any additional checkout-specific logic
    console.log('Checkout session completed for company:', companyId);
    
    // Update company to ensure Stripe IDs are set
    await db
      .update(companies)
      .set({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId));

    // Trigger application webhook for checkout completion
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      await StripeWebhookService.triggerSubscriptionCreated(companyId, subscription, customer);
    }
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
    throw error;
  }
}