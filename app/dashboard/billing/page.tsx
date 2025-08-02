'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Button } from '@/components/ui/shared/button';
import { Badge } from '@/components/ui/shared/badge';
import { Separator } from '@/components/ui/shared/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, Calendar, Users, FileText, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface SubscriptionPlan {
  id: string;
  planName: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxInterviews: number;
  maxUsers: number;
  features: string[];
  stripeProductId: string;
  stripeMonthlyPriceId: string;
  stripeYearlyPriceId: string;
  isActive: boolean;
}

interface Company {
  id: string;
  name: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripeCurrentPeriodStart: string;
  stripeCurrentPeriodEnd: string;
  maxInterviews: number;
  maxUsers: number;
}

interface Transaction {
  id: string;
  transactionAmount: number;
  currency: string;
  paymentStatus: string;
  subscriptionPeriod: string;
  startDate: string;
  endDate: string;
  receiptUrl: string;
  createdAt: string;
}

export default function BillingPage() {
  const { data: session } = useSession();
  const [company, setCompany] = useState<Company | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch company data
      const companyRes = await fetch('/api/user/company');
      if (companyRes.ok) {
        const companyData = await companyRes.json();
        setCompany(companyData.company);
      }

      // Fetch available plans
      const plansRes = await fetch('/api/subscription-plans');
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData.plans.filter((plan: SubscriptionPlan) => plan.isActive));
      }

      // Fetch transaction history
      const transactionsRes = await fetch('/api/user/subscription/transactions');
      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json();
        setTransactions(transactionsData.transactions);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    try {
      setActionLoading(true);
      
      const priceId = selectedPeriod === 'monthly' 
        ? plan.stripeMonthlyPriceId 
        : plan.stripeYearlyPriceId;

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          planId: plan.id,
          billingPeriod: selectedPeriod,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to start checkout process');
    } finally {
      setActionLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setActionLoading(true);
      
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error creating portal session:', error);
      toast.error('Failed to open billing portal');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount / 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Current Subscription */}
      {company && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="text-lg font-semibold capitalize">{company.subscriptionPlan}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge 
                  variant={company.subscriptionStatus === 'active' ? 'default' : 'secondary'}
                  className="capitalize"
                >
                  {company.subscriptionStatus}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Usage</p>
                <p className="text-sm">
                  <Users className="h-4 w-4 inline mr-1" />
                  {company.maxUsers} users
                </p>
                <p className="text-sm">
                  <FileText className="h-4 w-4 inline mr-1" />
                  {company.maxInterviews} interviews
                </p>
              </div>
            </div>
            
            {company.stripeCurrentPeriodEnd && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Current period ends on {formatDate(company.stripeCurrentPeriodEnd)}
                </p>
              </div>
            )}

            {company.stripeCustomerId && (
              <div className="mt-4">
                <Button 
                  onClick={handleManageBilling}
                  disabled={actionLoading}
                  variant="outline"
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Manage Billing
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>
            Choose the plan that best fits your needs
          </CardDescription>
          <div className="flex gap-2">
            <Button
              variant={selectedPeriod === 'monthly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('monthly')}
            >
              Monthly
            </Button>
            <Button
              variant={selectedPeriod === 'yearly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('yearly')}
            >
              Yearly
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const price = selectedPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
              const isCurrentPlan = company?.subscriptionPlan === plan.planName;
              
              return (
                <Card key={plan.id} className={`relative ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}>
                  {isCurrentPlan && (
                    <Badge className="absolute -top-2 left-4">Current Plan</Badge>
                  )}
                  <CardHeader>
                    <CardTitle className="text-xl">{plan.planName}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="text-3xl font-bold">
                      ${price}
                      <span className="text-sm font-normal text-muted-foreground">
                        /{selectedPeriod === 'monthly' ? 'month' : 'year'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {plan.maxUsers} users
                      </li>
                      <li className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {plan.maxInterviews} interviews
                      </li>
                      {plan.features?.map((feature, index) => (
                        <li key={index} className="text-sm text-muted-foreground">
                          • {feature}
                        </li>
                      ))}
                    </ul>
                    
                    {!isCurrentPlan && (
                      <Button 
                        className="w-full"
                        onClick={() => handleSubscribe(plan)}
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Subscribe to {plan.planName}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              Your recent billing transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {formatCurrency(transaction.transactionAmount, transaction.currency)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(transaction.createdAt)} • {transaction.subscriptionPeriod}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={transaction.paymentStatus === 'success' ? 'default' : 'destructive'}
                      className="capitalize"
                    >
                      {transaction.paymentStatus}
                    </Badge>
                    {transaction.receiptUrl && (
                      <div className="mt-2">
                        <Button variant="outline" size="sm" asChild>
                          <a href={transaction.receiptUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Receipt
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}