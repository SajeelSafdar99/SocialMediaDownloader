import { adminRequest } from '../shared/api/adminApi';

/**
 * SafePay Plan Structure
 */
export interface SafePayPlan {
  token: string;
  merchant_api_key: string;
  name: string;
  amount: string;
  currency: string;
  interval_count: number;
  interval: "MONTH" | "YEAR" | "WEEK" | "DAY";
  product: string;
  type: "RECURRING" | "ONE_TIME";
  trial_period_days: number;
  description: string;
  created_at: string;
  updated_at: string;
  active: boolean;
  archived: boolean;
  number_of_billing_cycles: number;
  apply_amount_change_on_existing_subscriptions: boolean;
  price_money: {
    currency: string;
    amount: string;
  };
}

/**
 * Create Plan Request
 */
export interface CreatePlanData {
  amount: string;
  currency: string;
  interval: "MONTH" | "YEAR" | "WEEK" | "DAY";
  type: "RECURRING" | "ONE_TIME";
  interval_count: number;
  product: string;
  active: boolean;
  name?: string;
  description?: string;
  trial_period_days?: number;
  number_of_billing_cycles?: number;
}

/**
 * Update Plan Data
 */
export interface UpdatePlanData {
  product?: string;
  active?: boolean;
  trial_period_days?: number;
  name?: string;
  description?: string;
}

/**
 * Search Plans Options
 */
export interface SearchPlansOptions {
  currencies?: string[];
  intervals?: string[];
  products?: string[];
  limit?: number;
  page?: number;
  sort_by?: string;
  direction?: "ASC" | "DESC";
}

/**
 * Create a new subscription plan
 */
export async function createPlan(planData: CreatePlanData): Promise<{ plan_id: string }> {
  const response = await adminRequest('POST', '/safepay/plans', planData);
  return response;
}

/**
 * Get all plans with optional filters
 */
export async function getPlans(options?: SearchPlansOptions): Promise<{ plans: SafePayPlan[]; count: number }> {
  const params = new URLSearchParams();

  if (options?.currencies?.length) {
    params.append('currencies', options.currencies.join(','));
  }
  if (options?.intervals?.length) {
    params.append('intervals', options.intervals.join(','));
  }
  if (options?.products?.length) {
    params.append('products', options.products.join(','));
  }
  if (options?.limit) {
    params.append('limit', options.limit.toString());
  }
  if (options?.page) {
    params.append('page', options.page.toString());
  }
  if (options?.sort_by) {
    params.append('sort_by', options.sort_by);
  }
  if (options?.direction) {
    params.append('direction', options.direction);
  }

  const queryString = params.toString();
  const url = `/safepay/plans${queryString ? `?${queryString}` : ''}`;

  const response = await adminRequest('GET', url);
  return response;
}

/**
 * Get a specific plan by ID
 */
export async function getPlan(planId: string): Promise<{ plan: SafePayPlan }> {
  const response = await adminRequest('GET', `/safepay/plans/${planId}`);
  return response;
}

/**
 * Update an existing plan
 */
export async function updatePlan(planId: string, updates: UpdatePlanData): Promise<void> {
  await adminRequest('PUT', `/safepay/plans/${planId}`, updates);
}

/**
 * Archive a plan (one-way action - cannot be undone)
 */
export async function archivePlan(planId: string): Promise<void> {
  await adminRequest('DELETE', `/safepay/plans/${planId}`);
}
