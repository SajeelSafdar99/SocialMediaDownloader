/**
 * SafePay Transactions API Service
 * Ref: https://apidocs.getsafepay.com/#transactions
 */

const SAFEPAY_API_URL = process.env.SAFEPAY_ENV === "production"
  ? "https://api.getsafepay.com"
  : "https://sandbox.api.getsafepay.com";

const SAFEPAY_MERCHANT_SECRET = process.env.SAFEPAY_SECRET;

/**
 * SafePay Transaction Structure
 */
export interface SafePayTransaction {
  token: string;
  charge_at: string;
  charged?: string;
  status: string; // READY, QUEUED, COMPLETE, RETRY, FAILED, UNCOLLECTIBLE, VOID, DISPUTED
  amount: string;
  currency: string;
  instrument_id: string;
  subscription_id?: string;
  created_at: string;
  updated_at: string;
  failures: any[];
  subscription?: any;
  merchant_api_key: string;
  user_id: string;
  transaction_type: "PAYMENT" | "REFUND";
  proration: boolean;
  tracker: string;
  price_money: {
    currency: string;
    amount: string;
  };
}

/**
 * Search transactions with filters
 */
export async function searchTransactions(filters?: {
  tokens?: string[];
  states?: string[];
  currencies?: string[];
  instrument_ids?: string[];
  subscription_ids?: string[];
  user_ids?: string[];
  limit?: number;
  page?: number;
  sort_by?: string;
  direction?: "ASC" | "DESC";
}): Promise<{ ok: boolean; transactions?: SafePayTransaction[]; count?: number; error?: string }> {
  try {
    if (!SAFEPAY_MERCHANT_SECRET) {
      throw new Error("SAFEPAY_SECRET is not configured");
    }

    const params = new URLSearchParams();
    if (filters?.tokens?.length) params.append("tokens", filters.tokens.join(","));
    if (filters?.states?.length) params.append("states", filters.states.join(","));
    if (filters?.currencies?.length) params.append("currencies", filters.currencies.join(","));
    if (filters?.instrument_ids?.length) params.append("instrument_ids", filters.instrument_ids.join(","));
    if (filters?.subscription_ids?.length) params.append("subscription_ids", filters.subscription_ids.join(","));
    if (filters?.user_ids?.length) params.append("user_ids", filters.user_ids.join(","));
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.sort_by) params.append("sort_by", filters.sort_by);
    if (filters?.direction) params.append("direction", filters.direction);

    const url = `${SAFEPAY_API_URL}/client/transactions/v1/search${params.toString() ? `?${params.toString()}` : ""}`;
    console.log("🔍 Searching SafePay transactions:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-SFPY-MERCHANT-SECRET": SAFEPAY_MERCHANT_SECRET,
      },
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error("❌ Failed to search transactions");
      const errorData = JSON.parse(responseText);
      return { ok: false, error: errorData.message || "Failed to search transactions" };
    }

    const result = JSON.parse(responseText);
    console.log(`✅ Found ${result.data.count} transactions`);

    return {
      ok: true,
      transactions: result.data.transactions,
      count: parseInt(result.data.count)
    };
  } catch (error: any) {
    console.error("❌ Error searching transactions:", error);
    return { ok: false, error: error.message };
  }
}

/**
 * Get a specific transaction by ID
 */
export async function getTransaction(transactionId: string): Promise<{ ok: boolean; transaction?: SafePayTransaction; error?: string }> {
  try {
    if (!SAFEPAY_MERCHANT_SECRET) {
      throw new Error("SAFEPAY_SECRET is not configured");
    }

    console.log("🔍 Getting SafePay Transaction:", transactionId);

    const response = await fetch(`${SAFEPAY_API_URL}/client/transactions/v1/${transactionId}`, {
      method: "GET",
      headers: {
        "X-SFPY-MERCHANT-SECRET": SAFEPAY_MERCHANT_SECRET,
      },
    });

    const responseText = await response.text();
    console.log("📥 Response Status:", response.status);

    if (!response.ok) {
      console.error("❌ Failed to get transaction");
      const errorData = JSON.parse(responseText);
      return { ok: false, error: errorData.message || "Failed to get transaction" };
    }

    const result = JSON.parse(responseText);
    return { ok: true, transaction: result.data.transaction };
  } catch (error: any) {
    console.error("❌ Error getting transaction:", error);
    return { ok: false, error: error.message };
  }
}

/**
 * Refund a transaction
 */
export async function refundTransaction(transactionId: string): Promise<{ ok: boolean; transaction?: SafePayTransaction; error?: string }> {
  try {
    if (!SAFEPAY_MERCHANT_SECRET) {
      throw new Error("SAFEPAY_SECRET is not configured");
    }

    console.log("💰 Refunding SafePay Transaction:", transactionId);

    const response = await fetch(`${SAFEPAY_API_URL}/client/transactions/v1/${transactionId}/refund`, {
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
      console.error("❌ Failed to refund transaction");
      const errorData = JSON.parse(responseText);
      return { ok: false, error: errorData.message || "Failed to refund transaction" };
    }

    const result = JSON.parse(responseText);
    console.log("✅ Refund transaction created:", result.data.transaction.token);

    return { ok: true, transaction: result.data.transaction };
  } catch (error: any) {
    console.error("❌ Error refunding transaction:", error);
    return { ok: false, error: error.message };
  }
}
