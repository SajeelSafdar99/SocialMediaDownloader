# SafePay Subscription Flow - Corrected Implementation

## Issue Identified

The code was attempting to use a non-existent `/client/subscriptions/v1/` API endpoint with request body:
```json
{
  "user": "cus_xxx",
  "plan": "plan_xxx",
  "payment_method": "card_xxx"
}
```

This resulted in error: `"proto: (line 1:2): unknown field \"user\""`

## Root Cause

SafePay **does NOT have a separate Subscriptions API endpoint**. Instead, subscriptions are managed through the **Tracker API** with different modes.

## Correct SafePay Subscription Flow

According to official SafePay API documentation:

### Step 1: Initial Payment with Card Tokenization
**Endpoint:** `POST /order/payments/v3/`
**Mode:** `payment`
**Entry Mode:** `flex` (for Cybersource Flex Microform)

```json
{
  "merchant_api_key": "sec_xxx",
  "user": "cus_xxx",
  "intent": "CYBERSOURCE",
  "mode": "payment",
  "currency": "USD",
  "amount": 599
}
```

**Purpose:**
- Collect initial subscription payment
- Tokenize the credit card
- Customer enters card details via Flex Microform
- Card token is returned in authorization response

### Step 2: Create Subscription Tracker
**Endpoint:** `POST /order/payments/v3/`
**Mode:** `subscription`
**Entry Mode:** `mit` (Merchant-Initiated Transaction)

```json
{
  "merchant_api_key": "sec_xxx",
  "user": "cus_xxx",
  "intent": "CYBERSOURCE",
  "mode": "subscription",
  "entry_mode": "mit",
  "currency": "PKR",
  "amount": 1
}
```

**Purpose:**
- Creates a subscription tracker (track_xxx token)
- Configured for recurring billing
- Uses saved payment method for future charges

## What We Fixed

### 1. Updated `safepaySubscriptionsService.ts`

**Before:**
```typescript
const requestBody = {
  user: userId,
  plan: planId,
  payment_method: instrumentId
};

const response = await fetch(`${SAFEPAY_API_URL}/client/subscriptions/v1/`, {
  // ...
});
```

**After:**
```typescript
const requestBody = {
  merchant_api_key: params.merchantApiKey,
  user: params.userId,
  intent: "CYBERSOURCE",
  mode: "subscription",
  entry_mode: "mit",
  currency: "PKR",
  amount: 1,
};

const response = await fetch(`${SAFEPAY_API_URL}/order/payments/v3/`, {
  // ...
});
```

### 2. Updated Response Parsing

**Before:**
```typescript
const subscription = result.data?.subscription;
// Expected sub_xxx token
```

**After:**
```typescript
const tracker = result.data?.tracker;
// Returns track_xxx token configured for subscriptions
return {
  ok: true,
  subscription: {
    token: tracker.token,
    status: tracker.state === 'TRACKER_STARTED' ? 'ACTIVE' : tracker.state,
    // ...
  }
};
```

### 3. Updated Comments in `routes.ts`

Changed misleading comments about "sub_xxx" tokens to correctly describe tracker-based subscriptions.

## Token Types

| Token Type | Format | Usage |
|------------|--------|-------|
| Customer | `cus_xxx` | Customer/user identifier |
| Merchant API Key | `sec_xxx` | Merchant authentication |
| Payment Tracker | `track_xxx` | One-time payment tracker |
| Subscription Tracker | `track_xxx` | Recurring billing tracker (mode="subscription") |
| Payment Method | `card_xxx` | Saved card/instrument token |

## Complete Subscription Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. User clicks "Subscribe" on frontend                          │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. Backend creates payment tracker (mode="payment")             │
│    - POST /order/payments/v3/                                   │
│    - Returns tracker token + capture context                    │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. Frontend shows Flex Microform                                │
│    - User enters card details                                   │
│    - Cybersource tokenizes card                                 │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. Backend processes transient token                            │
│    - POST /order/payments/v3/{tracker}/actions                  │
│    - Action: PROCESS_TRANSIENT_TOKEN                            │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 5. Backend enrolls in 3DS                                       │
│    - POST /order/payments/v3/{tracker}/actions                  │
│    - Action: PAYER_AUTH_ENROLLMENT                              │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 6. Backend authorizes payment                                   │
│    - POST /order/payments/v3/{tracker}/actions                  │
│    - Action: AUTHORIZATION                                      │
│    - Returns card token (card_xxx)                              │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 7. Backend creates subscription tracker                         │
│    - POST /order/payments/v3/                                   │
│    - mode: "subscription", entry_mode: "mit"                    │
│    - Returns subscription tracker token (track_xxx)             │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 8. Backend stores subscription details                          │
│    - User.safepaySubscriptionToken = track_xxx                  │
│    - User.safepayInstrumentToken = card_xxx                     │
│    - User.isPremium = true                                      │
│    - User.premiumExpiresAt = Date + plan duration               │
└──────────────────────────────────────────────────────────────────┘
```

## Key Points

1. ✅ **Use Tracker API** for both payments and subscriptions
2. ✅ **mode="payment"** for initial card collection
3. ✅ **mode="subscription"** + **entry_mode="mit"** for recurring billing
4. ✅ **merchant_api_key** is required in tracker requests
5. ✅ Subscription tokens are **track_xxx** format (NOT sub_xxx)
6. ✅ Card tokens are **card_xxx** format
7. ✅ Customer IDs are **cus_xxx** format

## Testing

After this fix, the subscription flow should work as follows:

1. User subscribes and pays $5.99
2. Card is saved with token `card_xxx`
3. Subscription tracker is created with token `track_xxx`
4. User's premium status is activated
5. Future recurring charges will use the saved card token

## References

- SafePay API Documentation: Payment Tracker (`/order/payments/v3/`)
- SafePay API Documentation: Subscription Tracker (same endpoint, mode="subscription")
- Example 4 in docs: Subscription Payment Setup (MIT)

