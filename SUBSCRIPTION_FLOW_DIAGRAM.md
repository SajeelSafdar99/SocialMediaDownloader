# SafePay Subscription Flow Diagram

## 🔄 Complete Subscription Flow (FIXED)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INITIATES SUBSCRIPTION                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 1: Get/Create SafePay Customer                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Backend: getOrCreateSafePayCustomer(userId)                            │
│  API: POST /user/customers/v1/                                          │
│  Returns: { token: "cus_xxx", merchant_api_key: "sec_xxx" }            │
│  Storage: Save customer ID and merchant key to database                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 2: Create Instrument Tracker (Tokenize Card)                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Backend: createSafePayPayment()                                        │
│  API: POST /order/payments/v3/                                          │
│  Body: {                                                                 │
│    merchant_api_key: "sec_xxx",                                         │
│    user: "cus_xxx",                                                     │
│    intent: "CYBERSOURCE",                                               │
│    mode: "instrument",           ← Card tokenization mode              │
│    entry_mode: "flex",           ← Embedded Flex Microform             │
│    currency: "USD",                                                     │
│    is_account_verification: true ← $0 authorization                    │
│  }                                                                       │
│  Returns: { tracker: { token: "track_xxx", ... } }                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 3: Generate Capture Context for Flex Microform                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  API: POST /order/payments/v3/{tracker_token}                           │
│  Body: { payload: { origin: "https://yourdomain.com" } }               │
│  Returns: { action: { flex: { capture_context_jwt: "..." } } }         │
│  Purpose: JWT token for initializing Flex Microform                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 4: Frontend Displays Flex Microform                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Frontend: Load Cybersource Flex Microform library                      │
│  Display: Embedded card input form (NO redirect!)                       │
│  Location: Stays on your website                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 5: User Enters Card Details                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  User Input:                                                             │
│    • Card Number: 4111 1111 1111 1111                                   │
│    • Expiry: 12/2025                                                    │
│    • CVV: 123                                                           │
│  Flex Microform: Securely tokenizes card client-side                    │
│  Returns: transient_token (temporary, secure token)                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 6: Process Transient Token                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Frontend: POST /api/payment/safepay/flex                               │
│  Backend: POST /order/payments/v3/{tracker_token}                       │
│  Body: { payload: { transient_token: "..." } }                         │
│  Returns: { action: { payment_method: { token: "card_xxx" } } }        │
│  Result: Card is now saved and tokenized                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 7: Enroll for 3DS Authentication                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Frontend: POST /api/payment/safepay/enroll                             │
│  Backend: Performs PAYER_AUTH_ENROLLMENT                                │
│  If FRICTIONLESS: Proceeds to authorization immediately                 │
│  If CHALLENGE: User completes 3DS challenge                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 8: Authorize Card                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Backend: POST /order/payments/v3/{tracker_token}                       │
│  Action: AUTHORIZATION                                                  │
│  Body: { payload: { authorization: { do_capture: true } } }            │
│  Result: Card verified with $0 authorization                            │
│  Tracker State: TRACKER_ENDED                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 9: Create Subscription (NEW!)                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Backend: createSubscription()                                          │
│  API: POST /client/subscriptions/v1/                                    │
│  Body: {                                                                 │
│    user: "cus_xxx",              ← Customer ID                         │
│    plan: "plan_xxx",             ← Plan ID                             │
│    payment_method: "card_xxx"    ← Saved card token from Step 6       │
│  }                                                                       │
│  Returns: { subscription: { token: "sub_xxx", status: "ACTIVE" } }     │
│  Result: Real subscription created! ✅                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 10: Update User & Store Tokens                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Backend: storage.updateUser()                                          │
│  Update:                                                                 │
│    • isPremium = true                                                   │
│    • premiumExpiresAt = Date + plan duration                            │
│    • safepaySubscriptionToken = "sub_xxx"  ← Subscription token        │
│    • safepayInstrumentToken = "card_xxx"   ← Card token                │
│    • subscriptionPlanId = "plan_xxx"                                    │
│    • subscriptionProvider = "safepay"                                   │
│  Result: User has premium access with recurring billing! 🎉             │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  ✅ SUBSCRIPTION ACTIVE                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  • User has premium access                                              │
│  • Card saved for recurring billing                                     │
│  • SafePay will automatically charge per plan schedule                  │
│  • Subscription token stored: sub_xxx                                   │
│  • Instrument token stored: card_xxx                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🔀 OLD vs NEW Flow Comparison

### ❌ OLD FLOW (BROKEN)

```
POST /order/payments/v3/
{
  mode: "payment",          ← Wrong for subscriptions
  // entry_mode omitted
  amount: 599
}
  ↓
Redirect to hosted checkout
  ↓
Error: "does not validate for either a payment or subscription"
  ↓
❌ FAILED
```

### ✅ NEW FLOW (WORKING)

```
POST /order/payments/v3/
{
  mode: "instrument",       ← Tokenize card first
  entry_mode: "flex",       ← Embedded form
  is_account_verification: true
}
  ↓
Flex Microform (embedded, no redirect)
  ↓
Card tokenized: card_xxx
  ↓
POST /client/subscriptions/v1/
{
  user: "cus_xxx",
  plan: "plan_xxx",
  payment_method: "card_xxx"
}
  ↓
Subscription created: sub_xxx
  ↓
✅ SUCCESS
```

## 🎯 Key Differences

| Aspect | OLD | NEW |
|--------|-----|-----|
| Mode | `payment` | `instrument` |
| Entry Mode | omitted | `flex` |
| User Experience | Redirect | Embedded form |
| Subscription Creation | Automatic (failed) | Explicit API call |
| Token Type | `track_xxx` | `sub_xxx` |
| Card Saving | Attempted | ✅ Successful |
| Recurring Billing | ❌ Not working | ✅ Working |

## 📋 Token Journey

```
User signs up
  ↓ (Create customer)
Customer Token: cus_aa708c6b-8e14-4ebe-b8ab-0d51d46a38c4
Merchant Key: sec_616b177e-f689-4bc6-9f92-c15bd0b050c3
  ↓ (Create tracker)
Tracker Token: track_689c379a-de50-4b9d-a033-0b5851e9e15e
  ↓ (User enters card)
Transient Token: (temporary, not stored)
  ↓ (Process token)
Instrument Token: card_dc0ef596-4559-4afc-95da-7fb353d861fb
  ↓ (Create subscription)
Subscription Token: sub_8848f4da-5747-4ee8-a7d5-8528ca488af3 ← Final token!
```

## ✅ Success Indicators

After successful subscription:

```sql
SELECT 
  id,
  email,
  isPremium,                        -- Should be TRUE
  safepaySubscriptionToken,         -- Should start with "sub_"
  safepayInstrumentToken,           -- Should start with "card_"
  subscriptionPlanId,               -- Should match selected plan
  premiumExpiresAt                  -- Should be future date
FROM users 
WHERE id = 4;
```

Expected:
```
✅ isPremium: true
✅ safepaySubscriptionToken: sub_8848f4da-5747-4ee8-a7d5-8528ca488af3
✅ safepayInstrumentToken: card_dc0ef596-4559-4afc-95da-7fb353d861fb
✅ subscriptionPlanId: plan_46b005b7-bb44-46b2-8b4a-f0e97e53468a
✅ premiumExpiresAt: 2027-02-12 05:13:07.297
```

---

**Use this diagram to debug issues. Each step should log its completion!**

