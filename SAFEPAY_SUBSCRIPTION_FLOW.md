# SafePay Subscription Flow - Complete Implementation Guide

## Overview
This document explains the complete subscription flow implemented for recurring billing with SafePay.

## Architecture

### Flow Diagram
```
User Subscribes → Create Customer → Payment Tracker → 3DS Auth → Capture Payment → Create Subscription Tracker → Store Token
```

## Step-by-Step Process

### 1. **Create SafePay Customer**
- **API**: `POST /client/users/v1/`
- **Purpose**: Register user as a SafePay customer
- **Returns**: `customer_id` (cus_xxx) and `merchant_api_key` (sec_xxx)
- **Store in DB**: 
  - `safepayCustomerId`
  - `safepayMerchantKey`

### 2. **Create Payment Tracker (Initial Payment)**
- **API**: `POST /order/payments/v3/`
- **Mode**: `payment` (NOT subscription)
- **Entry Mode**: `flex` (for Flex Microform UI)
- **Purpose**: Collect card details and process first payment
- **Fields**:
  ```json
  {
    "merchant_api_key": "MAIN_MERCHANT_API_KEY",
    "user": "cus_xxx",
    "intent": "CYBERSOURCE",
    "mode": "payment",
    "currency": "USD",
    "amount": 599
  }
  ```
- **Returns**: `tracker_token`

### 3. **Process Payment (3DS + Authorization)**
- **Steps**:
  a. Generate Flex Microform capture context
  b. User enters card details via Flex UI
  c. Process transient token
  d. Enroll for 3DS authentication
  e. Authorize and capture payment
- **Result**: Payment completed, card tokenized
- **Card Token**: `card_xxx` (payment_method.token)

### 4. **Create Subscription Tracker (MIT Mode)**
- **API**: `POST /order/payments/v3/`
- **Mode**: `subscription`
- **Entry Mode**: `mit` (Merchant-Initiated Transaction)
- **Purpose**: Set up recurring billing with saved card
- **CRITICAL**: Must use **MAIN merchant API key** in request body
- **Fields**:
  ```json
  {
    "merchant_api_key": "MAIN_MERCHANT_API_KEY", // NOT customer's merchant key!
    "user": "cus_xxx",
    "intent": "CYBERSOURCE",
    "mode": "subscription",
    "entry_mode": "mit",
    "currency": "PKR",
    "amount": 1
  }
  ```
- **Returns**: Subscription `tracker_token` (track_xxx)
- **Store in DB**: `safepaySubscriptionToken`

### 5. **Store Subscription Data**
- Update user record with:
  - `isPremium`: true
  - `premiumExpiresAt`: subscription end date
  - `subscriptionProvider`: "safepay"
  - `subscriptionPlanId`: plan ID
  - `safepaySubscriptionToken`: tracker token from step 4

## Key Points

### Authentication
- **Customer Creation**: Uses `X-SFPY-MERCHANT-SECRET` header
- **Payment Tracker**: Uses `merchant_api_key` in body (MAIN key)
- **Subscription Tracker (MIT)**: Uses `merchant_api_key` in body (MAIN key) + `X-SFPY-MERCHANT-SECRET` header

### Important Notes
1. **Two-Step Process**: 
   - First create payment tracker (mode=payment) to collect card
   - Then create subscription tracker (mode=subscription, entry_mode=mit) for recurring billing

2. **API Key Usage**:
   - Customer's `merchant_api_key` is returned when creating customer
   - But for MIT subscriptions, use the **MAIN merchant API key** from env
   - This was the key fix that resolved the "customer not found" error

3. **Card Tokenization**:
   - Card is tokenized during initial payment
   - Token is automatically saved to customer's account
   - Used for future recurring charges

4. **Subscription Status**:
   - Track using subscription tracker token
   - Check via `/client/subscriptions/v1/search` API
   - Or track locally in database

## Database Schema

### Users Table
```sql
safepayCustomerId        TEXT    -- Customer ID (cus_xxx)
safepayMerchantKey       TEXT    -- Customer's merchant key (sec_xxx)
safepaySubscriptionToken TEXT    -- Subscription tracker token (track_xxx)
subscriptionProvider     TEXT    -- "safepay"
subscriptionPlanId       TEXT    -- Plan ID
premiumExpiresAt         DATETIME -- Subscription expiry
isPremium                BOOLEAN  -- Premium status
```

### Payments Table
```sql
provider       TEXT -- "safepay"
transactionId  TEXT -- Payment reference
trackerToken   TEXT -- Tracker token
status         TEXT -- "completed", "pending", etc.
metadata       JSON -- Full response data
```

## Error Handling

### Common Errors
1. **"missing customer"**: Using wrong merchant API key
   - **Fix**: Use MAIN merchant API key, not customer's key

2. **"could not find customer"**: Customer not fully registered
   - **Fix**: Add 2-second delay after customer creation

3. **"unsupported meta key"**: Invalid metadata field
   - **Fix**: Remove custom metadata fields from tracker request

## Testing

### Test Flow
1. Subscribe to plan → Should create customer and payment tracker
2. Complete payment via Flex UI → Should authorize and capture
3. Check database → Should have subscription token
4. Verify subscription status → Should show active subscription

### Test Card
- Number: 4111111111111111
- Expiry: 02/2027
- CVV: Any 3 digits

## Files Modified
- `server/services/safepayPaymentService.ts` - Payment flow
- `server/services/safepaySubscriptionsService.ts` - Subscription creation (FIXED)
- `server/routes.ts` - API endpoints
- `server/storage.ts` - Database operations

## Next Steps
1. ✅ Test complete subscription flow
2. ✅ Verify subscription token is stored
3. ⏳ Implement subscription status checking
4. ⏳ Implement subscription cancellation
5. ⏳ Handle subscription renewals (webhooks)
6. ⏳ Add billing history page

## References
- [SafePay API Documentation](https://apidocs.getsafepay.com/)
- SafePay Tracker API: `/order/payments/v3/`
- SafePay Subscriptions API: `/client/subscriptions/v1/`

