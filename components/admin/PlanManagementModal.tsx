'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign, 
  Users, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Star, 
  Zap, 
  Building, 
  Crown, 
  Loader2, 
  ExternalLink, 
  Copy, 
  Check, 
  AlertTriangle,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/shared/button';
import { Label } from '@/components/ui/shared/label';
import { Input } from '@/components/ui/shared/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/shared/switch';
import { Badge } from '@/components/ui/shared/badge';
import { Separator } from '@/components/ui/shared/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shared/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/shared/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/shared/tabs';
import { toast } from 'sonner';
import { getPlanConfig, formatPrice, formatLimits } from '@/lib/plan-config';

interface SubscriptionPlan {
  id: string;
  planName: string;
  description: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  maxInterviews: number;
  maxUsers: number;
  features: string[] | null;
  stripeProductId: string | null;
  stripeMonthlyPriceId: string | null;
  stripeYearlyPriceId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PlanFormData {
  planName: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxInterviews: number;
  maxUsers: number;
  features: string[];
  isActive: boolean;
  createStripeProduct: boolean;
}

interface PlanManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlansUpdated?: () => void;
}

const defaultFormData: PlanFormData = {
  planName: '',
  description: '',
  monthlyPrice: 0,
  yearlyPrice: 0,
  maxInterviews: 10,
  maxUsers: 5,
  features: [],
  isActive: true,
  createStripeProduct: true
};

export function PlanManagementModal({ isOpen, onClose, onPlansUpdated }: PlanManagementModalProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(defaultFormData);
  const [newFeature, setNewFeature] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmPlan, setDeleteConfirmPlan] = useState<SubscriptionPlan | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch plans
  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/subscription-plans');
      const data = await response.json();
      if (response.ok) {
        setPlans(data.plans || []);
      } else {
        toast.error('Failed to fetch plans');
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to fetch plans');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
    }
  }, [isOpen]);

  const getPlanIcon = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'starter':
        return <Zap className="w-5 h-5 text-blue-500" />;
      case 'scale':
        return <Star className="w-5 h-5 text-purple-500" />;
      case 'enterprise':
        return <Building className="w-5 h-5 text-green-500" />;
      case 'custom':
        return <Crown className="w-5 h-5 text-orange-500" />;
      default:
        return <DollarSign className="w-5 h-5 text-gray-500" />;
    }
  };

  const handleInputChange = (field: keyof PlanFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addFeature = () => {
    if (newFeature.trim() && !formData.features.includes(newFeature.trim())) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const resetForm = () => {
    setFormData(defaultFormData);
    setNewFeature('');
    setEditingPlan(null);
    setIsFormOpen(false);
  };

  const openEditDialog = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      planName: plan.planName,
      description: plan.description || '',
      monthlyPrice: plan.monthlyPrice,
      yearlyPrice: plan.yearlyPrice,
      maxInterviews: plan.maxInterviews,
      maxUsers: plan.maxUsers,
      features: plan.features || [],
      isActive: plan.isActive,
      createStripeProduct: false // Don't create new Stripe product when editing
    });
    setIsFormOpen(true);
    setActiveTab('form');
  };

  const handleSubmit = async (isEdit = false) => {
    if (!formData.planName.trim()) {
      toast.error('Plan name is required');
      return;
    }

    setIsLoading(true);
    
    try {
      const url = '/api/admin/subscription-plans';
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit 
        ? { id: editingPlan?.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || `Plan ${isEdit ? 'updated' : 'created'} successfully`);
        await fetchPlans();
        resetForm();
        setActiveTab('overview');
        onPlansUpdated?.();
      } else {
        toast.error(data.error || `Failed to ${isEdit ? 'update' : 'create'} plan`);
        if (data.details) {
          console.error('Validation details:', data.details);
        }
      }
    } catch (error) {
      console.error('Error submitting plan:', error);
      toast.error(`Failed to ${isEdit ? 'update' : 'create'} plan`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (plan: SubscriptionPlan) => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/admin/subscription-plans?id=${plan.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Plan deleted successfully');
        await fetchPlans();
        onPlansUpdated?.();
      } else {
        toast.error(data.error || 'Failed to delete plan');
        if (data.details) {
          toast.error(data.details);
        }
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Failed to delete plan');
    } finally {
      setIsLoading(false);
      setDeleteConfirmPlan(null);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    toast.success(`${type} copied to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Building className="w-5 h-5" />
              <span>Subscription Plans Management</span>
            </DialogTitle>
            <DialogDescription>
              Manage subscription plans, pricing, features, and Stripe integration
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Plans Overview</TabsTrigger>
              <TabsTrigger value="form">
                {editingPlan ? 'Edit Plan' : 'Create Plan'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Current Plans</h3>
                  <p className="text-sm text-gray-600">Manage your subscription plans</p>
                </div>
                <Button 
                  onClick={() => {
                    resetForm();
                    setIsFormOpen(true);
                    setActiveTab('form');
                  }}
                  disabled={isLoading}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Plan
                </Button>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Plans Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {plans.map((plan) => (
                      <div key={plan.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getPlanIcon(plan.planName)}
                            <h4 className="font-semibold">{plan.planName}</h4>
                          </div>
                          <Badge variant={plan.isActive ? "default" : "secondary"}>
                            {plan.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600">{plan.description}</p>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Monthly: {formatPrice(plan.monthlyPrice)}</div>
                          <div>Yearly: {formatPrice(plan.yearlyPrice)}</div>
                          <div>Interviews: {formatLimits(plan.maxInterviews)}</div>
                          <div>Users: {formatLimits(plan.maxUsers)}</div>
                        </div>

                        <div className="flex items-center space-x-1">
                          {plan.stripeProductId ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className="text-xs">
                            {plan.stripeProductId ? 'Stripe Connected' : 'No Stripe'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(plan)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteConfirmPlan(plan)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                          {plan.stripeProductId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`https://dashboard.stripe.com/products/${plan.stripeProductId}`, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {plans.length === 0 && (
                    <div className="text-center py-8">
                      <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No plans found</h3>
                      <p className="text-gray-500 mb-4">Create your first subscription plan to get started.</p>
                      <Button onClick={() => setActiveTab('form')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Plan
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="form" className="space-y-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="planName">Plan Name</Label>
                      <Input
                        id="planName"
                        value={formData.planName}
                        onChange={(e) => handleInputChange('planName', e.target.value)}
                        placeholder="e.g., Starter, Pro, Enterprise"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked: boolean) => handleInputChange('isActive', checked)}
                      />
                      <Label htmlFor="isActive">Active Plan</Label>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Brief description of the plan..."
                      rows={3}
                    />
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Pricing</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="monthlyPrice">Monthly Price ($)</Label>
                      <Input
                        id="monthlyPrice"
                        type="number"
                        min="0"
                        value={formData.monthlyPrice}
                        onChange={(e) => handleInputChange('monthlyPrice', Number(e.target.value))}
                        placeholder="29"
                      />
                    </div>
                    <div>
                      <Label htmlFor="yearlyPrice">Yearly Price ($)</Label>
                      <Input
                        id="yearlyPrice"
                        type="number"
                        min="0"
                        value={formData.yearlyPrice}
                        onChange={(e) => handleInputChange('yearlyPrice', Number(e.target.value))}
                        placeholder="290"
                      />
                    </div>
                  </div>
                </div>

                {/* Limits */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Plan Limits</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="maxInterviews">Max Interviews per Month</Label>
                      <Input
                        id="maxInterviews"
                        type="number"
                        min="-1"
                        value={formData.maxInterviews}
                        onChange={(e) => handleInputChange('maxInterviews', Number(e.target.value))}
                        placeholder="50"
                      />
                      <p className="text-xs text-gray-500 mt-1">Use -1 for unlimited</p>
                    </div>
                    <div>
                      <Label htmlFor="maxUsers">Max Team Members</Label>
                      <Input
                        id="maxUsers"
                        type="number"
                        min="-1"
                        value={formData.maxUsers}
                        onChange={(e) => handleInputChange('maxUsers', Number(e.target.value))}
                        placeholder="5"
                      />
                      <p className="text-xs text-gray-500 mt-1">Use -1 for unlimited</p>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Features</h3>
                  <div className="flex space-x-2">
                    <Input
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      placeholder="Add a feature..."
                      onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                    />
                    <Button type="button" onClick={addFeature} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {formData.features.map((feature, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm">{feature}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFeature(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stripe Integration */}
                {!editingPlan && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Stripe Integration</h3>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="createStripeProduct"
                        checked={formData.createStripeProduct}
                        onCheckedChange={(checked: boolean) => handleInputChange('createStripeProduct', checked)}
                      />
                      <Label htmlFor="createStripeProduct">Create Stripe Product</Label>
                    </div>
                    <p className="text-sm text-gray-500">
                      Automatically create Stripe product and prices for this plan.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {activeTab === 'form' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setActiveTab('overview');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleSubmit(!!editingPlan)}
                  disabled={isLoading || !formData.planName}
                >
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmPlan} onOpenChange={() => setDeleteConfirmPlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the "{deleteConfirmPlan?.planName}" plan? 
              This action cannot be undone and may affect existing subscriptions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmPlan && handleDelete(deleteConfirmPlan)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}