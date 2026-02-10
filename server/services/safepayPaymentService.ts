import crypto from "crypto";
import { storage } from "../storage";

/**
 * SafePay Payment Gateway Integration - Official API Flow (No SDK)
 * Official Documentation: https://apidocs.getsafepay.com/
 *
 * COMPLETE PAYMENT FLOW (4 STEPS):
 *
 * STEP 1: CREATE CUSTOMER (Optional but recommended)
 *    Endpoint: POST /user/customers/v1/
 *    Headers: X-SFPY-MERCHANT-SECRET
 *    Response: { token: "cus_xxx", merchant_api_key: "sec_xxx" }
 *    Purpose: Pre-fill checkout form and enable recurring payments
 *
 * STEP 2: CREATE PAYMENT SESSION (Tracker)
 *    Endpoint: POST /order/payments/v3/
 *    Headers: X-SFPY-MERCHANT-SECRET
 *    Body: { merchant_api_key, user, intent, mode, entry_mode, currency, amount }
 *    Response: { tracker: { token: "track_xxx", state, ... } }
 *    Purpose: Initialize payment session with amount and currency
 *
 * STEP 3: GENERATE AUTHENTICATION TOKEN ⭐ CRITICAL!
 *    Endpoint: POST /client/passport/v1/token
 *    Headers: X-SFPY-MERCHANT-SECRET
 *    Body: {} (empty)
 *    Response: { data: "xnTyRgITVcHl..." }
 *    Purpose: Short-lived token required for checkout URL
 *
 * STEP 4: GENERATE CHECKOUT URL
 *    Format: https://sandbox.getsafepay.pk/order/checkout?
 *            tracker={TRACKER_TOKEN}&
 *            tbt={AUTH_TOKEN}&
 *            env={sandbox|production}&
 *            source=custom&
 *            user_id={CUSTOMER_TOKEN}&
 *            redirect_url={SUCCESS_URL}&
 *            cancel_url={CANCEL_URL}
 *    Purpose: Redirect user to SafePay hosted checkout page
 *
 * CRITICAL REQUIREMENTS:
 *
 * 1. AUTHENTICATION:
 *    - All API calls MUST include X-SFPY-MERCHANT-SECRET header
 *    - Tracker API uses merchant_api_key from customer response
 *    - Auth token is required for checkout URL generation
 *
 * 2. CUSTOMER CREATION:
 *    - Response includes merchant_api_key (sec_ format)
 *    - This key is REQUIRED for tracker API calls
 *    - Store both customer token and merchant_api_key
 *
 * 3. TRACKER FIELD NAMES (CRITICAL):
 *    - Field name: 'user' (NOT 'customer')
 *    - Value: Customer token (cus_xxx format)
 *    - Using 'customer' field will cause API errors
 *
 * 4. MODE & ENTRY MODE:
 *    - mode: 'subscription' (enables recurring billing)
 *    - entry_mode: 'mit' (Merchant-Initiated Transaction)
 *    - This enables card vaulting for future charges
 *
 * 5. CHECKOUT URL STRUCTURE:
 *    - Base: https://sandbox.getsafepay.pk/order/checkout (NOT /checkout/{token})
 *    - Required params: tracker, tbt, env, source
 *    - Optional params: user_id, redirect_url, cancel_url
 *    - Domain: .pk TLD (Pakistan gateway)
 *
 * 6. REDIRECTS:
 *    - Local dev: http://localhost:5173 (Vite dev server)
 *    - Production: Use PUBLIC_BASE_URL env variable
 *    - URLs must be properly encoded
 *
 * 7. ERROR HANDLING:
 *    - If merchant_api_key is missing, recreate customer
 *    - Validate all token formats (cus_, sec_, track_)
 *    - Check auth token generation success
 *    - Provide clear error messages
 */

const SAFEPAY_API_URL = process.env.SAFEPAY_ENV === "production"
  ? "https://api.getsafepay.com"
  : "https://sandbox.api.getsafepay.com";

/**
 * SafePay Tracker Request for Subscriptions
 * Ref: https://apidocs.getsafepay.com/#tracker-api
 */
interface SafePayTrackerRequest {
  merchant_api_key: string; // From customer response
  user: string; // Customer token (cus_xxx format) - field name is 'user' not 'customer'!
  intent: "CYBERSOURCE" | "MPGS" | "PAYFAST";
  mode: "payment" | "subscription" | "instrument";
  entry_mode?: "mit" | "cit" | "raw"; // Merchant-initiated, Customer-initiated, or Raw
  currency: string;
  amount: number; // Amount in smallest unit (cents/paisa)
  metadata?: Record<string, any>;
}

/**
 * SafePay Tracker Response
 */
interface SafePayTrackerResponse {
  data: {
    tracker: {
      token: string;
      state: string;
      client: string;
      environment: string;
      payment_method_kind: string;
      intent: string;
      mode: string;
      entry_mode: string;
      customer: string;
      next_actions: any;
      purchase_totals: {
        quote_amount: {
          currency: string;
          amount: number;
        };
      };
    };
    capabilities: Record<string, boolean>;
  };
  status: {
    errors: any[];
    message: string;
  };
}

/**
 * SafePay Webhook Event Structure
 * Ref: https://apidocs.getsafepay.com/#webhooks
 */
interface SafePayWebhookData {
  env: string;
  event: string; // "payment.succeeded", "payment.failed", etc.
  data: {
    id: string;
    token: string;
    state: "TRACKER" | "CREATED" | "COMPLETED" | "CANCELLED";
    reference?: string;
    source: string;
    customer?: {
      id: string;
      email?: string;
      phone_number?: string;
    };
    tracker?: {
      id: string;
      token: string;
      amount: number;
      currency: string;
      status: "PAID" | "PENDING" | "FAILED" | "CANCELLED";
      reference: string;
      created_at: string;
    };
  };
}

function getSafePayMerchantSecret(): string {
  // For ALL APIs - use the hash format (this is your valid API key)
  let secret = process.env.SAFEPAY_SECRET;

  if (!secret) {
    throw new Error("SAFEPAY_SECRET is not set");
  }

  return secret;
}

function getSafePayEnvironment(): string {
  return process.env.SAFEPAY_ENV === "production" ? "production" : "sandbox";
}

/**
 * Create SafePay customer
 * Ref: https://apidocs.getsafepay.com/#create-customer
 */
export async function createSafePayCustomer(opts: {
  userId: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  country?: string;
}): Promise<{ ok: boolean; customerId?: string; merchantApiKey?: string; reason?: string }> {
  try {
    const merchantSecret = getSafePayMerchantSecret();
    const hasCompleteData = opts.email && opts.firstName && opts.lastName;

    let customerRequest: any;

    if (hasCompleteData) {
      // Use real customer data
      customerRequest = {
        first_name: opts.firstName,
        last_name: opts.lastName,
        email: opts.email,
        phone_number: opts.phoneNumber || "+92000000000",
        country: opts.country || "US",
      };
    } else {
      // Use synthetic data for missing fields
      customerRequest = {
        use_synthetic: true,
      };

      // Include any data we have
      if (opts.firstName) customerRequest.first_name = opts.firstName;
      if (opts.email) customerRequest.email = opts.email;
      if (opts.phoneNumber) customerRequest.phone_number = opts.phoneNumber;
    }

    console.log("👤 Creating SafePay Customer:");
    console.log("   User ID:", opts.userId);
    console.log("   Has complete data:", hasCompleteData);
    console.log("   Email:", customerRequest.email || "synthetic");
    console.log("   Name:", customerRequest.first_name || "synthetic");
    console.log("   Merchant Secret:", merchantSecret.substring(0, 10) + "...");

    const response = await fetch(`${SAFEPAY_API_URL}/user/customers/v1/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SFPY-MERCHANT-SECRET": merchantSecret, // Header authentication
      },
      body: JSON.stringify(customerRequest),
    });

    const responseText = await response.text();
    console.log("📥 Customer Response Status:", response.status);

    if (!response.ok) {
      console.error("❌ Failed to create customer:", responseText);
      try {
        const errorData = JSON.parse(responseText);
        return { ok: false, reason: errorData.status?.message || "Failed to create customer" };
      } catch {
        return { ok: false, reason: "Failed to create customer" };
      }
    }

    const data = JSON.parse(responseText);
    console.log("📄 Full Customer Response:", JSON.stringify(data, null, 2));

    const customerId = data.data?.token;
    const merchantApiKey = data.data?.merchant_api_key; // Extract the sec_ key from response

    if (!customerId) {
      console.error("❌ No customer ID in response:", data);
      return { ok: false, reason: "No customer ID returned from SafePay API" };
    }

    console.log("✅ Customer created:", customerId);

    // CRITICAL: Validate merchant_api_key format
    if (merchantApiKey) {
      if (merchantApiKey.startsWith('sec_')) {
        console.log("✅ Merchant API Key extracted:", merchantApiKey.substring(0, 10) + "...");
        console.log("   Format: Valid (sec_ prefix)");
      } else {
        console.warn("⚠️  Merchant API Key has unexpected format:", merchantApiKey.substring(0, 10) + "...");
        console.warn("   Expected format: sec_xxxxx");
      }
    } else {
      console.error("❌ CRITICAL: No merchant_api_key in customer response!");
      console.error("   This will cause subscription payments to fail");
      console.error("   Available fields:", Object.keys(data.data || {}));
      console.error("   Customer will need to be recreated to get merchant_api_key");
      // Don't fail here - let the payment function handle the recreation
    }

    return { ok: true, customerId, merchantApiKey };
  } catch (error: any) {
    console.error("❌ Error creating customer:", error);
    return { ok: false, reason: error.message };
  }
}

/**
 * Get or create SafePay customer for a user
 * Checks if user already has a SafePay customer ID, otherwise creates one
 */
export async function getOrCreateSafePayCustomer(userId: number): Promise<{ ok: boolean; customerId?: string; merchantApiKey?: string; reason?: string }> {
  try {
    // Get user from database
    const user = await storage.getUser(userId);
    if (!user) {
      return { ok: false, reason: "User not found" };
    }

    // Check if user already has SafePay customer ID
    if (user.safepayCustomerId) {
      console.log("✅ Using existing SafePay customer:", user.safepayCustomerId);
      // Return stored merchant_api_key if available
      const merchantApiKey = user.safepayMerchantKey || undefined;
      if (merchantApiKey) {
        console.log("✅ Retrieved stored merchant API key:", merchantApiKey.substring(0, 10) + "...");
      } else {
        console.log("⚠️  No stored merchant_api_key - customer was created before this feature");
        console.log("   Will need to create new customer to get merchant_api_key");
      }
      return { ok: true, customerId: user.safepayCustomerId, merchantApiKey };
    }

    // Create new SafePay customer
    console.log("🆕 Creating new SafePay customer for user:", userId);
    const result = await createSafePayCustomer({
      userId,
      email: user.email || undefined,
      firstName: user.username,
      lastName: "",
    });

    if (!result.ok || !result.customerId) {
      return result;
    }

    // Store customer ID and merchant_api_key in database
    await storage.updateUser(userId, {
      safepayCustomerId: result.customerId,
      safepayMerchantKey: result.merchantApiKey, // Store the merchant_api_key!
    });

    console.log("💾 Stored SafePay customer ID and merchant key in database");
    return result; // Returns both customerId and merchantApiKey
  } catch (error: any) {
    console.error("❌ Error in getOrCreateSafePayCustomer:", error);
    return { ok: false, reason: error.message };
  }
}

/**
 * Create SafePay payment using Tracker API for subscriptions
 * Ref: https://apidocs.getsafepay.com/#payments-v3-tracker-api
 */
export async function createSafePayPayment(opts: {
  userId: number;
  amount: number;
  currency?: string;
  planId?: string;
  returnUrl?: string;
  cancelUrl?: string;
}): Promise<{ ok: boolean; paymentUrl?: string; token?: string; reason?: string }> {
  try {
    const merchantSecret = getSafePayMerchantSecret();
    const reference = `PREMIUM_${opts.userId}_${Date.now()}`;

    const user = await storage.getUser(opts.userId);
    if (!user) {
      console.error("❌ User not found:", opts.userId);
      return { ok: false, reason: "User not found" };
    }

    // Step 1: Get or create SafePay customer (reuses existing if available)
    console.log("🔄 Step 1: Getting/Creating SafePay Customer...");
    const customerResult = await getOrCreateSafePayCustomer(opts.userId);

    if (!customerResult.ok || !customerResult.customerId) {
      console.error("❌ Failed to get/create customer:", customerResult.reason);
      return { ok: false, reason: `Failed to get/create customer: ${customerResult.reason}` };
    }

    const safePayCustomerId = customerResult.customerId;
    const customerMerchantKey = customerResult.merchantApiKey; // sec_ format key from customer response
    console.log("✅ SafePay Customer ID:", safePayCustomerId);

    // CRITICAL: Check if we have merchant_api_key
    // This is required for Tracker API - without it, subscription payment will fail
    if (!customerMerchantKey) {
      console.error("❌ CRITICAL: No merchant_api_key available for customer!");
      console.error("   Customer ID:", safePayCustomerId);
      console.error("   This customer was created before merchant key storage was implemented");
      console.error("   Solution: Clearing old customer and creating fresh one with merchant_api_key...");

      // Clear the old customer and create a new one
      await storage.updateUser(opts.userId, {
        safepayCustomerId: null,
        safepayMerchantKey: null,
      });

      console.log("🔄 Recreating customer with merchant_api_key support...");
      console.log("   This is a one-time fix - subsequent calls will work normally");

      // Recursively call this function to create a fresh customer
      // This ensures we get the merchant_api_key from the customer response
      return createSafePayPayment(opts);
    }

    console.log("✅ Customer Merchant API Key:", customerMerchantKey.substring(0, 10) + "...");

    // Step 2: Create tracker for payment (initial subscription setup)
    console.log("🔄 Step 2: Creating Payment Tracker (Initial Subscription Setup)...");

    // Amount is already in smallest unit (cents/paisa) from frontend
    // Do NOT multiply by 100 again
    const amount = Math.round(opts.amount);
    const currency = opts.currency || "USD";

    console.log("💰 Amount Details:");
    console.log("   Received from frontend:", opts.amount);
    console.log("   Sending to SafePay:", amount);
    console.log("   Currency:", currency);

    // Validate required fields before making API call
    if (!safePayCustomerId || !safePayCustomerId.startsWith('cus_')) {
      console.error("❌ Invalid customer ID format:", safePayCustomerId);
      return { ok: false, reason: "Invalid customer ID format" };
    }

    if (!customerMerchantKey || !customerMerchantKey.startsWith('sec_')) {
      console.error("❌ Invalid merchant_api_key format:", customerMerchantKey);
      return { ok: false, reason: "Invalid merchant API key format" };
    }

    // SafePay Tracker API Request for Payment (Initial Setup)
    // IMPORTANT: For subscription setup, use 'payment' mode first
    // The 'subscription' mode is for automated recurring charges (MIT)
    // Initial checkout should use 'payment' mode to collect card details
    // CRITICAL FIELDS (from official docs):
    // - merchant_api_key: From customer response (sec_ format)
    // - user: Customer token (field name is 'user' not 'customer')
    // - intent: Payment processor (CYBERSOURCE or MPGS)
    // - mode: 'payment' (for initial checkout with card collection)
    // - entry_mode: OPTIONAL (removed - requires PCI compliance for 'raw' mode)
    // - currency: Currency code
    // - amount: Amount in smallest unit
    const trackerRequest: SafePayTrackerRequest = {
      merchant_api_key: customerMerchantKey, // From customer response
      user: safePayCustomerId, // Field name is 'user' not 'customer'!
      intent: "CYBERSOURCE", // Payment processor
      mode: "payment", // Use 'payment' mode for initial checkout
      // entry_mode omitted - it's optional and 'raw' requires PCI compliance
      currency: currency,
      amount: amount,
    };

    console.log("🚀 SafePay Tracker API Request:");
    console.log("   Endpoint: POST /order/payments/v3/");
    console.log("   Mode: payment (initial subscription setup)");
    console.log("   Entry Mode: omitted (optional - defaults to SafePay's choice)");
    console.log("   Intent: CYBERSOURCE");
    console.log("   User Field: 'user' (not 'customer')");
    console.log("   Customer ID:", safePayCustomerId);
    console.log("   Amount:", amount);
    console.log("   Currency:", currency);
    console.log("   Merchant API Key:", customerMerchantKey.substring(0, 10) + "...");
    console.log("   Full Request:", JSON.stringify(trackerRequest, null, 2));

    // Call SafePay Tracker API
    // CRITICAL: Include X-SFPY-MERCHANT-SECRET header for authentication
    const response = await fetch(`${SAFEPAY_API_URL}/order/payments/v3/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SFPY-MERCHANT-SECRET": merchantSecret, // Authentication header required!
      },
      body: JSON.stringify(trackerRequest),
    });

    const responseText = await response.text();
    console.log("📥 SafePay Response Status:", response.status);
    console.log("📥 SafePay Response Body:", responseText);

    if (!response.ok) {
      console.error("❌ SafePay API error:", response.status, response.statusText);
      console.error("❌ Error details:", responseText);

      try {
        const errorData = JSON.parse(responseText);
        console.error("❌ Parsed error:", JSON.stringify(errorData, null, 2));
        return {
          ok: false,
          reason: `SafePay API error: ${errorData.message || errorData.error || response.statusText}`
        };
      } catch {
        return { ok: false, reason: `SafePay API error: ${response.statusText}` };
      }
    }

    const responseData: SafePayTrackerResponse = JSON.parse(responseText);
    const { data } = responseData;

    // Determine base URL for redirects early (needed for Flex)
    const baseUrl = process.env.SAFEPAY_ENV === "production"
      ? (process.env.PUBLIC_BASE_URL || "https://yourdomain.com")
      : "http://localhost:5173";

    console.log("✅ Tracker created successfully");
    console.log("   Tracker Token:", data.tracker.token);
    console.log("   State:", data.tracker.state);
    console.log("   Mode:", data.tracker.mode);
    console.log("   Entry Mode:", data.tracker.entry_mode);
    console.log("   Customer:", data.tracker.customer);

    // Store payment record with tracker token (do this before Flex check)
    await storage.createPayment({
      userId: opts.userId,
      provider: "safepay",
      amount: amount,
      currency: currency,
      status: "pending",
      transactionId: reference,
      providerTransactionId: data.tracker.token,
      metadata: JSON.stringify({
        tracker_token: data.tracker.token,
        tracker_state: data.tracker.state,
        customer_id: data.tracker.customer,
        plan_id: opts.planId,
        mode: "payment",
        entry_mode: data.tracker.entry_mode || "unknown",
        intent: "CYBERSOURCE",
        reference,
        user_id: opts.userId,
        username: user.username,
        email: user.email,
      }),
      createdAt: new Date(),
    });

    console.log("✅ Payment record created with tracker token");
    console.log("   Transaction ID:", reference);
    console.log("   Tracker Token:", data.tracker.token);

    // Check next_actions to see what SafePay expects
    if (data.tracker.next_actions) {
      console.log("📋 Next Actions:", JSON.stringify(data.tracker.next_actions, null, 2));

      // Check if SafePay expects Flex Microform
      const cybersourceAction = data.tracker.next_actions.CYBERSOURCE;
      if (cybersourceAction) {
        console.log("   Cybersource Action Kind:", cybersourceAction.kind);

        if (cybersourceAction.kind === "GENERATE_CAPTURE_CONTEXT") {
          console.log("🔄 SafePay requires Flex Microform - generating capture context...");

          // Generate capture context for Flex Microform
          const captureContextResponse = await fetch(
            `${SAFEPAY_API_URL}/order/payments/v3/${data.tracker.token}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-SFPY-MERCHANT-SECRET": merchantSecret,
              },
              body: JSON.stringify({
                payload: {
                  origin: baseUrl || "http://localhost:5173"
                }
              }),
            }
          );

          if (!captureContextResponse.ok) {
            const errorText = await captureContextResponse.text();
            console.error("❌ Failed to generate capture context:", errorText);
            return { ok: false, reason: "Failed to generate capture context for Flex" };
          }

          const captureContextData = await captureContextResponse.json();

          // The capture context JWT token might be in different places
          // Check common response patterns from SafePay
          let captureContextJWT: string;

          if (typeof captureContextData.data === 'string') {
            // Simple case: data is the JWT string
            captureContextJWT = captureContextData.data;
          } else if (captureContextData.data?.capture_context) {
            // Nested case: capture_context field
            captureContextJWT = captureContextData.data.capture_context;
          } else if (captureContextData.data?.jwt) {
            // JWT field
            captureContextJWT = captureContextData.data.jwt;
          } else {
            // Fallback: stringify the entire data object
            console.warn("⚠️  Unknown capture context format, storing entire data object");
            captureContextJWT = JSON.stringify(captureContextData.data);
          }

          console.log("✅ Capture context generated for Flex Microform");
          console.log("   Context type:", typeof captureContextJWT);
          console.log("   Context preview:", captureContextJWT.substring(0, 100) + "...");

          // Get the payment record we just created
          const payment = await storage.getPaymentByProviderTransactionId(data.tracker.token);
          if (payment) {
            // Update payment metadata with capture context JWT
            await storage.updatePayment(payment.id, {
              metadata: JSON.stringify({
                tracker_token: data.tracker.token,
                tracker_state: data.tracker.state,
                customer_id: data.tracker.customer,
                plan_id: opts.planId,
                mode: "payment",
                entry_mode: "flex",
                intent: "CYBERSOURCE",
                reference,
                user_id: opts.userId,
                username: user.username,
                email: user.email,
                capture_context: captureContextJWT, // Store JWT string for frontend
                next_action: "GENERATE_CAPTURE_CONTEXT",
                full_capture_response: captureContextData.data // Store full response for debugging
              }),
            });
          }

          // Return a special URL that will load our Flex checkout page
          // We'll create a new route that serves the Flex integration
          const flexCheckoutUrl = `${baseUrl}/checkout/flex?tracker=${data.tracker.token}`;

          console.log("🔗 Flex Checkout URL:");
          console.log("   URL:", flexCheckoutUrl);
          console.log("   Note: This will use Cybersource Flex Microform embedded in your site");

          return {
            ok: true,
            paymentUrl: flexCheckoutUrl,
            token: data.tracker.token,
          };
        }
      }
    }

    // Step 3: Generate authentication token (Required by SafePay API)
    // Ref: Official docs - POST /client/passport/v1/token
    console.log("🔄 Step 3: Generating Authentication Token...");

    const authTokenResponse = await fetch(`${SAFEPAY_API_URL}/client/passport/v1/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SFPY-MERCHANT-SECRET": merchantSecret,
      },
      body: JSON.stringify({}), // Empty body as per docs
    });

    if (!authTokenResponse.ok) {
      const authError = await authTokenResponse.text();
      console.error("❌ Failed to generate auth token:", authError);
      return { ok: false, reason: "Failed to generate authentication token" };
    }

    const authTokenData = await authTokenResponse.json();
    const authToken = authTokenData.data;

    if (!authToken) {
      console.error("❌ No authentication token in response");
      return { ok: false, reason: "Authentication token not received" };
    }

    console.log("✅ Authentication token generated");
    console.log("   Token:", authToken.substring(0, 20) + "...");

    // Step 4: Generate Checkout URL (Official SafePay Format)
    // Ref: Official docs - Checkout URL generation
    console.log("🔄 Step 4: Generating Checkout URL...");

    // SafePay Checkout URL uses the API subdomain
    // Format: https://sandbox.api.getsafepay.com (same as other API endpoints)
    const safepayCheckoutBaseUrl = process.env.SAFEPAY_ENV === "production"
      ? "https://api.getsafepay.com"
      : "https://sandbox.api.getsafepay.com";

    // baseUrl already defined earlier - no need to redefine

    // Build properly encoded redirect URLs
    const successUrl = opts.returnUrl || `${baseUrl}/subscribe?status=success&provider=safepay`;
    const cancelledUrl = opts.cancelUrl || `${baseUrl}/subscribe?status=cancelled`;

    // Official SafePay Checkout URL Format:
    // Based on SDK behavior, the checkout endpoint is simply /checkout
    // NOT /order/checkout (that was giving 404)
    // https://sandbox.api.getsafepay.com/checkout?
    //   tracker={TRACKER_TOKEN}&
    //   tbt={AUTH_TOKEN}&
    //   env={sandbox|production}&
    //   source={hosted|popup|mobile|custom|woocommerce|shopify}&
    //   user_id={CUSTOMER_TOKEN}&
    //   redirect_url={SUCCESS_URL}&
    //   cancel_url={CANCEL_URL}

    const checkoutParams = new URLSearchParams({
      tracker: data.tracker.token,
      tbt: authToken,
      env: process.env.SAFEPAY_ENV === "production" ? "production" : "sandbox",
      source: "hosted", // Use 'hosted' for hosted checkout page (as per SDK)
      user_id: safePayCustomerId,
      redirect_url: successUrl,
      cancel_url: cancelledUrl,
    });

    // Try /checkout endpoint (not /order/checkout)
    const checkoutUrl = `${safepayCheckoutBaseUrl}/checkout?${checkoutParams.toString()}`;

    console.log("✅ Checkout URL Generated:");
    console.log("   URL:", checkoutUrl);
    console.log("   Environment:", process.env.SAFEPAY_ENV || "sandbox (default)");
    console.log("   Base URL:", baseUrl);
    console.log("   Tracker:", data.tracker.token);
    console.log("   Auth Token:", authToken.substring(0, 20) + "...");
    console.log("   Customer:", safePayCustomerId);
    console.log("   Success redirect:", successUrl);
    console.log("   Cancel redirect:", cancelledUrl);

    return {
      ok: true,
      paymentUrl: checkoutUrl,
      token: data.tracker.token,
    };
  } catch (error: any) {
    console.error("❌ SafePay payment creation error:", error);
    console.error("   Error message:", error.message);
    console.error("   Error stack:", error.stack);
    return { ok: false, reason: error.message || "Payment creation failed" };
  }
}