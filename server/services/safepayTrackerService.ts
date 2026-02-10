/**
 * SafePay Tracker API Service (Payments v3)
 * For subscription payments with saved instruments (MIT - Merchant Initiated Transactions)
 * Ref: https://apidocs.getsafepay.com/#tracker-api
 */

const SAFEPAY_API_URL = process.env.SAFEPAY_ENV === "production"
  ? "https://api.getsafepay.com"
  : "https://sandbox.api.getsafepay.com";

const SAFEPAY_API_KEY = process.env.SAFEPAY_API_KEY;

/**
 * Tracker Response from SafePay
 */
export interface SafePayTracker {
  token: string;
  client: string;
  environment: string;
  state: string;
  intent: string;
  mode: string;
  entry_mode: string;
  customer?: string;
  next_actions: {
    CYBERSOURCE?: { kind: string };
    MPGS?: { kind: string };
    PAYFAST?: { kind: string };
  };
  purchase_totals: {
    quote_amount: { currency: string; amount: number };
    base_amount: { currency: string; amount: number };
    conversion_rate: { base_currency: string; quote_currency: string; rate: number };
  };
  metadata: Record<string, any>;
}

export interface SafePayTrackerResponse {
  data: {
    tracker: SafePayTracker;
    capabilities: {
      CYBERSOURCE?: boolean;
      MPGS?: boolean;
      PAYFAST?: boolean;
    };
  };
  status: {
    errors: any[];
    message: string;
  };
}

/**
 * Create instrument tracker - saves payment method for future use (card vaulting)
 * Use this for initial subscription setup to save the customer's card
 */
export async function createInstrumentTracker(opts: {
  userId: number;
  userEmail?: string;
}): Promise<{ ok: boolean; tracker?: SafePayTracker; error?: string }> {
  try {
    if (!SAFEPAY_API_KEY) {
      throw new Error("SAFEPAY_API_KEY is not configured");
    }

    // Create or get SafePay customer ID (you may want to store this in your database)
    const customerReference = `user_${opts.userId}`;

    console.log("🔧 Creating SafePay Instrument Tracker (Card Vaulting):");
    console.log("   User ID:", opts.userId);
    console.log("   Customer Reference:", customerReference);

    const requestBody = {
      merchant_api_key: SAFEPAY_API_KEY,
      user: customerReference, // SafePay customer ID
      intent: "CYBERSOURCE",
      mode: "instrument", // Card vaulting mode
      currency: "PKR",
      entry_mode: "raw", // Or "flex" for embedded form
      is_account_verification: true, // Zero amount authorization
    };

    console.log("📤 Request:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${SAFEPAY_API_URL}/order/payments/v3/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log("📥 Response Status:", response.status);
    console.log("📥 Response:", responseText);

    if (!response.ok) {
      console.error("❌ Failed to create instrument tracker");
      const errorData = JSON.parse(responseText);
      return { ok: false, error: errorData.status?.message || "Failed to create instrument tracker" };
    }

    const result: SafePayTrackerResponse = JSON.parse(responseText);
    console.log("✅ Instrument tracker created:", result.data.tracker.token);

    return { ok: true, tracker: result.data.tracker };
  } catch (error: any) {
    console.error("❌ Error creating instrument tracker:", error);
    return { ok: false, error: error.message };
  }
}

/**
 * Create subscription tracker - for recurring payments
 * Use this after the instrument is saved to start the subscription
 */
export async function createSubscriptionTracker(opts: {
  userId: number;
  amount: number; // In smallest unit (paisa/cents)
  currency?: string;
}): Promise<{ ok: boolean; tracker?: SafePayTracker; error?: string }> {
  try {
    if (!SAFEPAY_API_KEY) {
      throw new Error("SAFEPAY_API_KEY is not configured");
    }

    const customerReference = `user_${opts.userId}`;

    console.log("💳 Creating SafePay Subscription Tracker:");
    console.log("   User ID:", opts.userId);
    console.log("   Amount:", opts.amount, opts.currency);

    const requestBody = {
      merchant_api_key: SAFEPAY_API_KEY,
      user: customerReference,
      intent: "CYBERSOURCE",
      mode: "subscription", // Subscription payment mode
      currency: opts.currency || "PKR",
      amount: opts.amount, // Amount in smallest unit
    };

    console.log("📤 Request:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${SAFEPAY_API_URL}/order/payments/v3/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log("📥 Response Status:", response.status);
    console.log("📥 Response:", responseText);

    if (!response.ok) {
      console.error("❌ Failed to create subscription tracker");
      const errorData = JSON.parse(responseText);
      return { ok: false, error: errorData.status?.message || "Failed to create subscription tracker" };
    }

    const result: SafePayTrackerResponse = JSON.parse(responseText);
    console.log("✅ Subscription tracker created:", result.data.tracker.token);

    return { ok: true, tracker: result.data.tracker };
  } catch (error: any) {
    console.error("❌ Error creating subscription tracker:", error);
    return { ok: false, error: error.message };
  }
}

/**
 * Create unscheduled COF (Card On File) tracker
 * Use this to charge a saved instrument on-demand (MIT)
 */
export async function createUnscheduledCOFTracker(opts: {
  userId: number;
  amount: number; // In smallest unit (paisa/cents)
  currency?: string;
}): Promise<{ ok: boolean; tracker?: SafePayTracker; error?: string }> {
  try {
    if (!SAFEPAY_API_KEY) {
      throw new Error("SAFEPAY_API_KEY is not configured");
    }

    const customerReference = `user_${opts.userId}`;

    console.log("💰 Creating SafePay Unscheduled COF Tracker (MIT):");
    console.log("   User ID:", opts.userId);
    console.log("   Amount:", opts.amount, opts.currency);

    const requestBody = {
      merchant_api_key: SAFEPAY_API_KEY,
      user: customerReference,
      intent: "CYBERSOURCE",
      mode: "unscheduled_cof", // Unscheduled card-on-file
      currency: opts.currency || "PKR",
      amount: opts.amount,
    };

    console.log("📤 Request:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${SAFEPAY_API_URL}/order/payments/v3/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log("📥 Response Status:", response.status);
    console.log("📥 Response:", responseText);

    if (!response.ok) {
      console.error("❌ Failed to create unscheduled COF tracker");
      const errorData = JSON.parse(responseText);
      return { ok: false, error: errorData.status?.message || "Failed to create unscheduled COF tracker" };
    }

    const result: SafePayTrackerResponse = JSON.parse(responseText);
    console.log("✅ Unscheduled COF tracker created:", result.data.tracker.token);

    return { ok: true, tracker: result.data.tracker };
  } catch (error: any) {
    console.error("❌ Error creating unscheduled COF tracker:", error);
    return { ok: false, error: error.message };
  }
}

/**
 * Get tracker status
 */
export async function getTrackerStatus(trackerToken: string): Promise<{ ok: boolean; tracker?: SafePayTracker; error?: string }> {
  try {
    if (!SAFEPAY_API_KEY) {
      throw new Error("SAFEPAY_API_KEY is not configured");
    }

    console.log("🔍 Getting tracker status:", trackerToken);

    const response = await fetch(`${SAFEPAY_API_URL}/order/payments/v3/${trackerToken}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-SFPY-API-KEY": SAFEPAY_API_KEY,
      },
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error("❌ Failed to get tracker status");
      const errorData = JSON.parse(responseText);
      return { ok: false, error: errorData.status?.message || "Failed to get tracker status" };
    }

    const result: SafePayTrackerResponse = JSON.parse(responseText);
    return { ok: true, tracker: result.data.tracker };
  } catch (error: any) {
    console.error("❌ Error getting tracker status:", error);
    return { ok: false, error: error.message };
  }
}
