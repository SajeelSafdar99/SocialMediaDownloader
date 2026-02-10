import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  type SafePayPlan,
  type CreatePlanData,
  type UpdatePlanData,
  getPlans,
  createPlan,
  updatePlan,
  archivePlan,
} from "../../services/safepayPlansApi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function SubscriptionPlansPage() {
  const [plans, setPlans] = useState<SafePayPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SafePayPlan | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Form state for creating new plan
  const [newPlan, setNewPlan] = useState<CreatePlanData>({
    amount: "",
    currency: "PKR",
    interval: "MONTH",
    type: "RECURRING",
    interval_count: 1,
    product: "Premium Subscription",
    active: true,
    name: "",
    description: "",
    trial_period_days: 0,
  });

  // Form state for editing plan
  const [editData, setEditData] = useState<UpdatePlanData>({});

  // Load plans
  const loadPlans = async () => {
    try {
      setLoading(true);
      const { plans: fetchedPlans } = await getPlans({ sort_by: "created_at", direction: "DESC" });
      setPlans(fetchedPlans || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load plans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  // Handle create plan
  const handleCreatePlan = async () => {
    try {
      setCreating(true);

      // Validate required fields
      if (!newPlan.amount || parseFloat(newPlan.amount) <= 0) {
        toast({
          title: "Validation Error",
          description: "Amount must be greater than 0",
          variant: "destructive",
        });
        return;
      }

      if (!newPlan.product || newPlan.product.trim() === "") {
        toast({
          title: "Validation Error",
          description: "Product name is required",
          variant: "destructive",
        });
        return;
      }

      const result = await createPlan(newPlan);

      toast({
        title: "Success",
        description: `Plan created successfully! Plan ID: ${result.plan_id}`,
      });

      setShowCreateDialog(false);
      setNewPlan({
        amount: "",
        currency: "PKR",
        interval: "MONTH",
        type: "RECURRING",
        interval_count: 1,
        product: "Premium Subscription",
        active: true,
        name: "",
        description: "",
        trial_period_days: 0,
      });

      loadPlans();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create plan",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  // Handle edit plan
  const handleEditPlan = async () => {
    if (!selectedPlan) return;

    try {
      setCreating(true);
      await updatePlan(selectedPlan.token, editData);

      toast({
        title: "Success",
        description: "Plan updated successfully!",
      });

      setShowEditDialog(false);
      setSelectedPlan(null);
      setEditData({});
      loadPlans();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update plan",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  // Handle archive plan
  const handleArchivePlan = async (planId: string, planName: string) => {
    if (!confirm(`Are you sure you want to archive "${planName}"? This action cannot be undone!`)) {
      return;
    }

    try {
      await archivePlan(planId);

      toast({
        title: "Success",
        description: "Plan archived successfully. New subscribers cannot be added.",
      });

      loadPlans();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to archive plan",
        variant: "destructive",
      });
    }
  };

  // Handle toggle active status
  const handleToggleActive = async (plan: SafePayPlan) => {
    try {
      await updatePlan(plan.token, { active: !plan.active });

      toast({
        title: "Success",
        description: `Plan ${!plan.active ? "activated" : "deactivated"} successfully!`,
      });

      loadPlans();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update plan",
        variant: "destructive",
      });
    }
  };

  // Open edit dialog
  const openEditDialog = (plan: SafePayPlan) => {
    setSelectedPlan(plan);
    setEditData({
      name: plan.name,
      description: plan.description,
      trial_period_days: plan.trial_period_days,
      active: plan.active,
    });
    setShowEditDialog(true);
  };

  // Format currency - convert from smallest unit to major unit
  const formatCurrency = (amount: string, currency: string) => {
    // Amount from SafePay is in smallest unit (cents/paisa)
    // Convert to major unit by dividing by 100
    const numAmount = parseFloat(amount) / 100;

    if (currency === "PKR") {
      return `PKR ${numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${numAmount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-primary mb-4"></i>
          <p className="text-muted-foreground">Loading plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Subscription Plans</h1>
          <p className="text-muted-foreground">Manage your SafePay subscription plans</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <i className="fas fa-plus mr-2"></i>
          Create New Plan
        </Button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan.token} className={`relative ${!plan.active ? "opacity-60" : ""}`}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-xl">
                    {plan.name || plan.product}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {plan.description || "No description"}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {plan.active ? (
                    <Badge variant="default">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                  {plan.type === "RECURRING" && (
                    <Badge variant="outline">Recurring</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pricing */}
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-3xl font-bold text-primary">
                  {formatCurrency(plan.amount, plan.currency)}
                </div>
                <div className="text-sm text-muted-foreground">
                  per {plan.interval_count} {plan.interval.toLowerCase()}{plan.interval_count > 1 ? "s" : ""}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product:</span>
                  <span className="font-medium">{plan.product}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trial Period:</span>
                  <span className="font-medium">{plan.trial_period_days} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium">
                    {new Date(plan.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditDialog(plan)}
                >
                  <i className="fas fa-edit mr-2"></i>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant={plan.active ? "secondary" : "default"}
                  onClick={() => handleToggleActive(plan)}
                >
                  <i className={`fas fa-${plan.active ? "pause" : "play"} mr-2`}></i>
                  {plan.active ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleArchivePlan(plan.token, plan.name || plan.product)}
                >
                  <i className="fas fa-archive"></i>
                </Button>
              </div>

              {/* Plan ID */}
              <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                ID: {plan.token}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {plans.length === 0 && (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <i className="fas fa-box-open text-6xl text-muted-foreground"></i>
            <h3 className="text-2xl font-semibold">No Plans Yet</h3>
            <p className="text-muted-foreground">
              Create your first subscription plan to get started
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <i className="fas fa-plus mr-2"></i>
              Create Your First Plan
            </Button>
          </div>
        </Card>
      )}

      {/* Create Plan Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Subscription Plan</DialogTitle>
            <DialogDescription>
              Create a new recurring or one-time payment plan for your service
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Plan Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name (Display Name)</Label>
              <Input
                id="name"
                placeholder="e.g., Monthly Premium"
                value={newPlan.name}
                onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
              />
            </div>

            {/* Product */}
            <div className="space-y-2">
              <Label htmlFor="product">Product *</Label>
              <Input
                id="product"
                placeholder="e.g., Premium Subscription"
                value={newPlan.product}
                onChange={(e) => setNewPlan({ ...newPlan, product: e.target.value })}
                required
              />
            </div>

            {/* Amount and Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="9.99"
                  value={newPlan.amount}
                  onChange={(e) => setNewPlan({ ...newPlan, amount: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter decimal amount (e.g., 9.99 for $9.99 or 1500 for PKR 1500)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency *</Label>
                <Select
                  value={newPlan.currency}
                  onValueChange={(value) => setNewPlan({ ...newPlan, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PKR">PKR - Pakistani Rupee</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Billing Interval */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interval_count">Interval Count *</Label>
                <Input
                  id="interval_count"
                  type="number"
                  min="1"
                  value={newPlan.interval_count}
                  onChange={(e) => setNewPlan({ ...newPlan, interval_count: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interval">Interval *</Label>
                <Select
                  value={newPlan.interval}
                  onValueChange={(value: any) => setNewPlan({ ...newPlan, interval: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAY">Day</SelectItem>
                    <SelectItem value="WEEK">Week</SelectItem>
                    <SelectItem value="MONTH">Month</SelectItem>
                    <SelectItem value="YEAR">Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Plan Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Plan Type *</Label>
              <Select
                value={newPlan.type}
                onValueChange={(value: any) => setNewPlan({ ...newPlan, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECURRING">Recurring (Subscription)</SelectItem>
                  <SelectItem value="ONE_TIME">One-Time Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Trial Period */}
            <div className="space-y-2">
              <Label htmlFor="trial_period_days">Trial Period (Days)</Label>
              <Input
                id="trial_period_days"
                type="number"
                min="0"
                placeholder="0"
                value={newPlan.trial_period_days}
                onChange={(e) => setNewPlan({ ...newPlan, trial_period_days: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Number of days users can try before being charged
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this plan includes..."
                value={newPlan.description}
                onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                rows={3}
              />
            </div>

            {/* Active */}
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={newPlan.active}
                onCheckedChange={(checked) => setNewPlan({ ...newPlan, active: checked })}
              />
              <Label htmlFor="active">Active (allow new subscriptions)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePlan} disabled={creating}>
              {creating ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Creating...
                </>
              ) : (
                <>
                  <i className="fas fa-check mr-2"></i>
                  Create Plan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Plan Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Plan</DialogTitle>
            <DialogDescription>
              Update plan details. Note: Amount and billing interval cannot be changed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_name">Plan Name</Label>
              <Input
                id="edit_name"
                value={editData.name || ""}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={editData.description || ""}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_trial">Trial Period (Days)</Label>
              <Input
                id="edit_trial"
                type="number"
                min="0"
                value={editData.trial_period_days || 0}
                onChange={(e) => setEditData({ ...editData, trial_period_days: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Only affects new subscriptions
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit_active"
                checked={editData.active ?? true}
                onCheckedChange={(checked) => setEditData({ ...editData, active: checked })}
              />
              <Label htmlFor="edit_active">Active (allow new subscriptions)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditPlan} disabled={creating}>
              {creating ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Updating...
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2"></i>
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
