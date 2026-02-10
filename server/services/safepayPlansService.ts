/**
 * SafePay Plans API Service
 * Ref: https://apidocs.getsafepay.com/#plans-api
 */

const SAFEPAY_API_URL = process.env.SAFEPAY_ENV === "production"
  ? "https://api.getsafepay.com"
  : "https://sandbox.api.getsafepay.com";

/**
 * Get SafePay Merchant Secret dynamically
 */
function getSafePayMerchantSecret(): string {
  const secret = process.env.SAFEPAY_SECRET;
  if (!secret) {
    throw new Error("SAFEPAY_SECRET is not configured");
  }
  return secret;
}

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
export interface CreatePlanRequest {
  amount: string; // User provides as decimal (e.g., "9.99")
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
 * SafePay API Plan Request (what API expects)
 */
interface SafePayApiPlanRequest {
  name: string; // Required
  amount: number; // Required: int64 in smallest currency unit
  currency: string; // Required
  interval_count: number; // Required
  interval: "MONTH" | "YEAR" | "WEEK" | "DAY"; // Required
  product: string; // Required
  type: "RECURRING" | "ONE_TIME"; // Required
  active: boolean; // Required
  trial_period_days?: number; // Optional
  description?: string; // Optional
  number_of_billing_cycles?: number; // Optional
}

/**
 * Update Plan Request
 */
export interface UpdatePlanRequest {
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
  plan_ids?: string[];
  intervals?: string[];
  products?: string[];
  currencies?: string[];
  limit?: number;
  page?: number;
  sort_by?: string;
  direction?: "ASC" | "DESC";
}

/**
 * Create a new subscription plan
 */
export async function createPlan(planData: CreatePlanRequest): Promise<{ ok: boolean; plan_id?: string; error?: string }> {
  try {
    const SAFEPAY_MERCHANT_SECRET = getSafePayMerchantSecret();

    // Convert amount from decimal to smallest currency unit
    // e.g., "9.99" USD -> "999" cents, "100" PKR -> "10000" paisa
    const amountDecimal = parseFloat(planData.amount);
    if (isNaN(amountDecimal) || amountDecimal <= 0) {
      return { ok: false, error: "Invalid amount. Must be a positive number." };
    }

    // Convert to smallest unit (multiply by 100 for both USD cents and PKR paisa)
    const amountInSmallestUnit = Math.round(amountDecimal * 100); // Integer, not string

    console.log("📋 Creating SafePay Plan:");
    console.log("   Amount (user input):", planData.amount, planData.currency);
    console.log("   Amount (API format):", amountInSmallestUnit, "(smallest unit)");
    console.log("   Interval:", planData.interval_count, planData.interval);
    console.log("   Product:", planData.product);

    // Prepare API request with all required fields in correct format
    const apiRequest: SafePayApiPlanRequest = {
      name: planData.name || planData.product, // Required field
      amount: amountInSmallestUnit, // Required: int64 (number, not string)
      currency: planData.currency, // Required
      interval_count: planData.interval_count, // Required
      interval: planData.interval, // Required
      product: planData.product, // Required
      type: planData.type, // Required
      active: planData.active, // Required
      ...(planData.trial_period_days !== undefined && { trial_period_days: planData.trial_period_days }),
      ...(planData.description && { description: planData.description }),
      ...(planData.number_of_billing_cycles && { number_of_billing_cycles: planData.number_of_billing_cycles }),
    };

    console.log("📤 SafePay API Request:", JSON.stringify(apiRequest, null, 2));

    const response = await fetch(`${SAFEPAY_API_URL}/client/plans/v1/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SFPY-MERCHANT-SECRET": SAFEPAY_MERCHANT_SECRET,
      },
      body: JSON.stringify(apiRequest),
    });

    const responseText = await response.text();
    console.log("📥 SafePay Response Status:", response.status);
    console.log("📥 SafePay Response:", responseText);

    if (!response.ok) {
      console.error("❌ Failed to create plan:", responseText);
      try {
        const errorData = JSON.parse(responseText);
        return { ok: false, error: errorData.message || errorData.error || "Failed to create plan" };
      } catch {
        return { ok: false, error: `API Error: ${response.statusText}` };
      }
    }

    const result = JSON.parse(responseText);
    console.log("✅ Plan created:", result.data.plan_id);

    return { ok: true, plan_id: result.data.plan_id };
  } catch (error: any) {
    console.error("❌ Error creating plan:", error);
    return { ok: false, error: error.message };
  }
}

/**
 * Get plan by ID
 */
export async function getPlan(planId: string): Promise<{ ok: boolean; plan?: SafePayPlan; error?: string }> {
  try {
    const SAFEPAY_MERCHANT_SECRET = getSafePayMerchantSecret();

    const response = await fetch(`${SAFEPAY_API_URL}/client/plans/v1/${planId}/`, {
      method: "GET",
      headers: {
        "X-SFPY-MERCHANT-SECRET": SAFEPAY_MERCHANT_SECRET,
      },
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error("❌ Failed to get plan:", responseText);
      const errorData = JSON.parse(responseText);
      return { ok: false, error: errorData.message || "Failed to get plan" };
    }

    const result = JSON.parse(responseText);
    return { ok: true, plan: result.data.plan };
  } catch (error: any) {
    console.error("❌ Error getting plan:", error);
    return { ok: false, error: error.message };
  }
}

/**
 * Update an existing plan
 */
export async function updatePlan(planId: string, updates: UpdatePlanRequest): Promise<{ ok: boolean; error?: string }> {
  try {
    const SAFEPAY_MERCHANT_SECRET = getSafePayMerchantSecret();

    console.log("📝 Updating plan:", planId);
    console.log("   Updates:", JSON.stringify(updates, null, 2));

    const response = await fetch(`${SAFEPAY_API_URL}/client/plans/v1/${planId}/`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-SFPY-MERCHANT-SECRET": SAFEPAY_MERCHANT_SECRET,
      },
      body: JSON.stringify(updates),
    });

    const responseText = await response.text();
    console.log("📥 SafePay Response:", responseText);

    if (!response.ok) {
      console.error("❌ Failed to update plan:", responseText);
      const errorData = JSON.parse(responseText);
      return { ok: false, error: errorData.message || "Failed to update plan" };
    }

    console.log("✅ Plan updated successfully");
    return { ok: true };
  } catch (error: any) {
    console.error("❌ Error updating plan:", error);
    return { ok: false, error: error.message };
  }
}

/**
 * Search/list plans with filters
 */
export async function searchPlans(options: SearchPlansOptions = {}): Promise<{ ok: boolean; plans?: SafePayPlan[]; count?: number; error?: string }> {
  try {
    const SAFEPAY_MERCHANT_SECRET = getSafePayMerchantSecret();

    // Build query string
    const params = new URLSearchParams();
    if (options.plan_ids?.length) params.append("plan_ids", options.plan_ids.join(","));
    if (options.intervals?.length) params.append("intervals", options.intervals.join(","));
    if (options.products?.length) params.append("products", options.products.join(","));
    if (options.currencies?.length) params.append("currencies", options.currencies.join(","));
    if (options.limit) params.append("limit", options.limit.toString());
    if (options.page) params.append("page", options.page.toString());
    if (options.sort_by) params.append("sort_by", options.sort_by);
    if (options.direction) params.append("direction", options.direction);

    const url = `${SAFEPAY_API_URL}/client/plans/v1/search${params.toString() ? `?${params.toString()}` : ""}`;
    console.log("🔍 Searching plans:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-SFPY-MERCHANT-SECRET": SAFEPAY_MERCHANT_SECRET,
      },
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error("❌ Failed to search plans:", responseText);
      const errorData = JSON.parse(responseText);
      return { ok: false, error: errorData.message || "Failed to search plans" };
    }

    const result = JSON.parse(responseText);
    const planCount = typeof result.data.count === 'string' ? parseInt(result.data.count) : result.data.count;
    console.log(`✅ Found ${planCount} plans:`, result.data.plans?.length);

    return { ok: true, plans: result.data.plans || [], count: planCount };
  } catch (error: any) {
    console.error("❌ Error searching plans:", error);
    return { ok: false, error: error.message };
  }
}

/**
 * Archive a plan (one-way action)
 */
export async function archivePlan(planId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const SAFEPAY_MERCHANT_SECRET = getSafePayMerchantSecret();

    console.log("🗑️ Archiving plan:", planId);

    const response = await fetch(`${SAFEPAY_API_URL}/client/plans/v1/${planId}/`, {
      method: "DELETE",
      headers: {
        "X-SFPY-MERCHANT-SECRET": SAFEPAY_MERCHANT_SECRET,
      },
    });

    const responseText = await response.text();
    console.log("📥 SafePay Response:", responseText);

    if (!response.ok) {
      console.error("❌ Failed to archive plan:", responseText);
      const errorData = JSON.parse(responseText);
      return { ok: false, error: errorData.message || "Failed to archive plan" };
    }

    console.log("✅ Plan archived successfully (cannot be unarchived)");
    return { ok: true };
  } catch (error: any) {
    console.error("❌ Error archiving plan:", error);
    return { ok: false, error: error.message };
  }
}
