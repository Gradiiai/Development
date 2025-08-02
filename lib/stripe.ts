import Stripe from 'stripe';
import { StripeWebhookService } from '@/lib/integrations/webhooks/stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil',
  typescript: true,
});

// Stripe configuration constants
export const STRIPE_CONFIG = {
  currency: 'usd',
  payment_method_types: ['card'],
  mode: 'subscription' as const,
  billing_address_collection: 'required' as const,
  customer_update: {
    address: 'auto' as const,
    name: 'auto' as const,
  },
};

// Plan mapping for Stripe Price IDs
export const STRIPE_PLANS = {
  basic: {
    monthly: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID || 'price_basic_monthly',
    yearly: process.env.STRIPE_BASIC_YEARLY_PRICE_ID || 'price_basic_yearly',
  },
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
    yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_pro_yearly',
  },
  enterprise: {
    monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || 'price_enterprise_monthly',
    yearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || 'price_enterprise_yearly',
  },
};

// Helper function to create or retrieve a Stripe customer
export async function createOrRetrieveCustomer({
  email,
  companyId,
  companyName,
}: {
  email: string;
  companyId: string;
  companyName: string;
}) {
  try {
    // First, try to find existing customer by email
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      const customer = existingCustomers.data[0];
      
      // Update customer metadata if needed
      if (customer.metadata.companyId !== companyId) {
        await stripe.customers.update(customer.id, {
          metadata: {
            companyId,
            companyName,
          },
        });
      }
      
      return customer;
    }

    // Create new customer if not found
    const customer = await stripe.customers.create({
      email,
      name: companyName,
      metadata: {
        companyId,
        companyName,
      },
    });

    // Trigger customer created webhook
    try {
      await StripeWebhookService.triggerCustomerCreated(companyId, customer);
    } catch (webhookError) {
      console.error('Error triggering customer created webhook:', webhookError);
    }

    return customer;
  } catch (error) {
    console.error('Error creating/retrieving Stripe customer:', error);
    throw error;
  }
}

// Helper function to create a checkout session
export async function createCheckoutSession({
  customerId,
  priceId,
  companyId,
  planName,
  billingPeriod,
  successUrl,
  cancelUrl,
}: {
  customerId: string;
  priceId: string;
  companyId: string;
  planName: string;
  billingPeriod: 'monthly' | 'yearly';
  successUrl: string;
  cancelUrl: string;
}) {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: STRIPE_CONFIG.payment_method_types as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
      mode: STRIPE_CONFIG.mode,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      billing_address_collection: STRIPE_CONFIG.billing_address_collection,
      customer_update: STRIPE_CONFIG.customer_update,
      metadata: {
        companyId,
        planName,
        billingPeriod,
      },
      subscription_data: {
        metadata: {
          companyId,
          planName,
          billingPeriod,
        },
      },
    });

    return session;
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    throw error;
  }
}

// Helper function to create a billing portal session
export async function createBillingPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session;
  } catch (error) {
    console.error('Error creating Stripe billing portal session:', error);
    throw error;
  }
}

// Helper function to cancel a subscription
export async function cancelSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    
    // Trigger subscription cancelled webhook
    try {
      const companyId = await StripeWebhookService.getCompanyIdFromSubscription(subscriptionId);
      if (companyId) {
        await StripeWebhookService.triggerSubscriptionCancelled(companyId, subscription);
      }
    } catch (webhookError) {
      console.error('Error triggering subscription cancelled webhook:', webhookError);
    }
    
    return subscription;
  } catch (error) {
    console.error('Error canceling Stripe subscription:', error);
    throw error;
  }
}

// Helper function to update a subscription
export async function updateSubscription({
  subscriptionId,
  newPriceId,
}: {
  subscriptionId: string;
  newPriceId: string;
}) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const oldPriceId = subscription.items.data[0]?.price.id;
    
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations',
    });

    // Trigger subscription updated webhook
    try {
      const companyId = await StripeWebhookService.getCompanyIdFromSubscription(subscriptionId);
      if (companyId) {
        await StripeWebhookService.triggerSubscriptionUpdated(
          companyId, 
          updatedSubscription,
          { previous_price_id: oldPriceId }
        );
        
        // Also trigger plan changed webhook if price changed
        if (oldPriceId !== newPriceId) {
          await StripeWebhookService.triggerPlanChanged(
            companyId,
            { priceId: oldPriceId },
            { priceId: newPriceId },
            updatedSubscription
          );
        }
      }
    } catch (webhookError) {
      console.error('Error triggering subscription updated webhook:', webhookError);
    }

    return updatedSubscription;
  } catch (error) {
    console.error('Error updating Stripe subscription:', error);
    throw error;
  }
}

// Helper function to retrieve subscription details
export async function getSubscriptionDetails(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice', 'customer'],
    });
    return subscription;
  } catch (error) {
    console.error('Error retrieving Stripe subscription:', error);
    throw error;
  }
}

// Helper function to get customer's active subscriptions
export async function getCustomerSubscriptions(customerId: string) {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      expand: ['data.latest_invoice'],
    });
    return subscriptions;
  } catch (error) {
    console.error('Error retrieving customer subscriptions:', error);
    throw error;
  }
}

// Helper function to create Stripe products and prices
export async function createStripeProduct({
  name,
  description,
  monthlyPrice,
  yearlyPrice,
}: {
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
}) {
  try {
    // Create product
    const product = await stripe.products.create({
      name,
      description,
      metadata: {
        type: 'subscription_plan',
      },
    });

    // Create monthly price
    const monthlyPriceObj = await stripe.prices.create({
      product: product.id,
      unit_amount: monthlyPrice * 100, // Convert to cents
      currency: STRIPE_CONFIG.currency,
      recurring: {
        interval: 'month',
      },
      metadata: {
        billing_period: 'monthly',
      },
    });

    // Create yearly price
    const yearlyPriceObj = await stripe.prices.create({
      product: product.id,
      unit_amount: yearlyPrice * 100, // Convert to cents
      currency: STRIPE_CONFIG.currency,
      recurring: {
        interval: 'year',
      },
      metadata: {
        billing_period: 'yearly',
      },
    });

    return {
      product,
      monthlyPrice: monthlyPriceObj,
      yearlyPrice: yearlyPriceObj,
    };
  } catch (error) {
    console.error('Error creating Stripe product:', error);
    throw error;
  }
}

// Helper function to sync local plans with Stripe
export async function syncPlanWithStripe({
  planId,
  planName,
  description,
  monthlyPrice,
  yearlyPrice,
}: {
  planId: string;
  planName: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
}) {
  try {
    const stripeData = await createStripeProduct({
      name: planName,
      description,
      monthlyPrice,
      yearlyPrice,
    });

    return {
      stripeProductId: stripeData.product.id,
      stripeMonthlyPriceId: stripeData.monthlyPrice.id,
      stripeYearlyPriceId: stripeData.yearlyPrice.id,
    };
  } catch (error) {
    console.error('Error syncing plan with Stripe:', error);
    throw error;
  }
}