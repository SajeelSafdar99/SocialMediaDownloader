/**
 * SafePay Subscriptions API Service
 * Ref: https://apidocs.getsafepay.com/#subscriptions-api
 */

const SAFEPAY_API_URL = process.env.SAFEPAY_ENV === "production"
  ? "https://api.getsafepay.com"
  : "https://sandbox.api.getsafepay.com";

const SAFEPAY_MERCHANT_SECRET = process.env.SAFEPAY_SECRET;

/**
 * SafePay Subscription Structure
 */
export interface SafePaySubscription {
  token: string;
  plan_id: string;
  user_id: string;
  instrument_id: string;
  status: string; // ACTIVE, PAUSED, CANCELED, TRAILING, INCOMPLETE
  billing_cycle_anchor: string;
  price_amount: string;
  price_currency: string;
  balance: string;
  start_date: string;
  end_date?: string;
  trial_start_date?: string;
  trial_end_date?: string;
  cancel_at_period_end: boolean;
  canceled_at?: string;
  created_at: string;
  updated_at: string;
  plan: {
    token: string;
    name: string;
    amount: string;
    currency: string;
    interval_count: number;
    interval: string;
    product: string;
    type: string;
    trial_period_days: number;
    description: string;
    active: boolean;
  };
  current_period_start_date: string;
  current_period_end_date: string;
  last_paid_date?: string;
  current_billing_cycle: number;
  paused_at?: string;
  resumed_at?: string;
  never_expires: boolean;
  number_of_billing_cycles?: number;
}

/**
 * Get a specific subscription by ID
 */
export async function getSubscription(subscriptionId: string): Promise<{ ok: boolean; subscription?: SafePaySubscription; error?: string }> {
  try {
    if (!SAFEPAY_MERCHANT_SECRET) {
      throw new Error("SAFEPAY_SECRET is not configured");
    }

    console.log("🔍 Getting SafePay Subscription:", subscriptionId);

    const response = await fetch(`${SAFEPAY_API_URL}/client/subscriptions/v1/${subscriptionId}`, {
      method: "GET",
      headers: {
        "X-SFPY-MERCHANT-SECRET": SAFEPAY_MERCHANT_SECRET,
      },
    });

    const responseText = await response.text();
    console.log("📥 Response Status:", response.status);

    if (!response.ok) {
      console.error("❌ Failed to get subscription");
      const errorData = JSON.parse(responseText);
      return { ok: false, error: errorData.message || "Failed to get subscription" };
    }

    const result = JSON.parse(responseText);
    return { ok: true, subscription: result.data.subscription };
  } catch (error: any) {
    console.error("❌ Error getting subscription:", error);
    return { ok: false, error: error.message };
  }
}

/**
 * Search subscriptions with filters (Admin only)
 */
export async function searchSubscriptions(filters?: {
  tokens?: string[];
  plan_ids?: string[];
  user_ids?: string[];
  statuses?: string[];
  limit?: number;
  page?: number;
  sort_by?: string;
  direction?: "ASC" | "DESC";
}): Promise<{ ok: boolean; subscriptions?: SafePaySubscription[]; count?: number; error?: string }> {
  try {
    if (!SAFEPAY_MERCHANT_SECRET) {
      throw new Error("SAFEPAY_SECRET is not configured");
    }

    const params = new URLSearchParams();
    if (filters?.tokens?.length) params.append("tokens", filters.tokens.join(","));
    if (filters?.plan_ids?.length) params.append("plan_ids", filters.plan_ids.join(","));
    if (filters?.user_ids?.length) params.append("user_ids", filters.user_ids.join(","));
    if (filters?.statuses?.length) params.append("statuses", filters.statuses.join(","));
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.sort_by) params.append("sort_by", filters.sort_by);
    if (filters?.direction) params.append("direction", filters.direction);

    const url = `${SAFEPAY_API_URL}/client/subscriptions/v1/search${params.toString() ? `?${params.toString()}` : ""}`;
    console.log("🔍 Searching subscriptions:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-SFPY-MERCHANT-SECRET": SAFEPAY_MERCHANT_SECRET,
      },
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error("❌ Failed to search subscriptions");
      const errorData = JSON.parse(responseText);
      return { ok: false, error: errorData.message || "Failed to search subscriptions" };
    }

    const result = JSON.parse(responseText);
    console.log(`✅ Found ${result.data.count} subscriptions`);

    return { ok: true, subscriptions: result.data.subscriptions, count: parseInt(result.data.count) };
  } catch (error: any) {
    console.error("❌ Error searching subscriptions:", error);
    return { ok: false, error: error.message };
  }
}

/**
 * Update a subscription (Admin only)
 */
export async function updateSubscription(
  subscriptionId: string,
  updates: {
    billing_cycle_anchor?: string;
    trial_end?: string;
    cancel_at_period_end?: boolean;
    pause_collection?: {
      payment_collection_behavior: "MARK_VOID" | "KEEP_AS_READY" | "MARK_AS_UNCOLLECTABLE";
    };
    never_expires?: boolean;
    number_of_billing_cycles?: number;
    proration_behavior?: "CREATE_PRORATIONS" | "ALWAYS_TRANSACTION" | "NONE_PRORATION_BEHAVIOR";
  }
): Promise<{ ok: boolean; subscription?: SafePaySubscription; error?: string }> {
  try {
    if (!SAFEPAY_MERCHANT_SECRET) {
      throw new Error("SAFEPAY_SECRET is not configured");
    }

    console.log("📝 Updating SafePay Subscription:", subscriptionId);
    console.log("   Updates:", JSON.stringify(updates, null, 2));

    const response = await fetch(`${SAFEPAY_API_URL}/client/subscriptions/v1/${subscriptionId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-SFPY-MERCHANT-SECRET": SAFEPAY_MERCHANT_SECRET,
      },
      body: JSON.stringify(updates),
    });

    const responseText = await response.text();
    console.log("📥 Response:", responseText);

    if (!response.ok) {
      console.error("❌ Failed to update subscription");
      const errorData = JSON.parse(responseText);
      return { ok: false, error: errorData.message || "Failed to update subscription" };
    }

    const result = JSON.parse(responseText);
    console.log("✅ Subscription updated successfully");

    return { ok: true, subscription: result.data.subscription };
  } catch (error: any) {
    console.error("❌ Error updating subscription:", error);
    return { ok: false, error: error.message };
  }
}

/**
 * Cancel a subscription (Admin or User)
 */
export async function cancelSubscription(subscriptionId: string): Promise<{ ok: boolean; subscription?: SafePaySubscription; error?: string }> {
  try {
    if (!SAFEPAY_MERCHANT_SECRET) {
      throw new Error("SAFEPAY_SECRET is not configured");
    }

    console.log("❌ Canceling SafePay Subscription:", subscriptionId);

    const response = await fetch(`${SAFEPAY_API_URL}/client/subscriptions/v1/${subscriptionId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SFPY-MERCHANT-SECRET": SAFEPAY_MERCHANT_SECRET,
      },
      body: JSON.stringify({}),
    });

    const responseText = await response.text();
    console.log("📥 Response:", responseText);

    if (!response.ok) {
      console.error("❌ Failed to cancel subscription");
      const errorData = JSON.parse(responseText);
      return { ok: false, error: errorData.message || "Failed to cancel subscription" };
    }

    const result = JSON.parse(responseText);
    console.log("✅ Subscription cancelled successfully");

    return { ok: true, subscription: result.data.subscription };
  } catch (error: any) {
    console.error("❌ Error cancelling subscription:", error);
    return { ok: false, error: error.message };
  }
}
