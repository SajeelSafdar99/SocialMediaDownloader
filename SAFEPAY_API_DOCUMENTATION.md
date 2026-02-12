# Safepay API Documentation

## Overview

Safepay is a regulated payments service provider enabling developers to orchestrate money movement between customers and businesses. This documentation covers all API endpoints, payloads, request/response formats, and TypeScript type definitions.

**Base URL (Sandbox):** `https://sandbox.api.getsafepay.com`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Payment Operations](#payment-operations)
3. [Subscriptions](#subscriptions)
4. [Payment Instruments](#payment-instruments)
5. [Card-On-File (COF)](#card-on-file-cof)
6. [Order Processing](#order-processing)
7. [Quick Links](#quick-links)
8. [Type Definitions](#type-definitions)
9. [Error Handling](#error-handling)
10. [Complete Examples](#complete-examples)

---

## Authentication

### Create Shopper JWT Using Password

**Endpoint:** `POST /auth/v2/user/login`

**Description:** Generate a JWT token for a Safepay Shopper using email and password authentication.

**Request Body:**
```json
{
  "type": "password",
  "email": "user@example.com",
  "password": "password"
}
```

**Request Schema:**
| Property | Type | Mandatory |
|----------|------|-----------|
| type | enum | Y |
| email | string | Y |
| password | string | Y |

**Response:**
```json
{
  "data": {
    "session": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token": "user_d75110e4-f52e-464d-96bd-490f75e7fc71",
    "refresh_token": "eyJhbGciOiJIUzI1NiJ9..."
  }
}
```

**cURL Example:**
```bash
curl --location 'https://sandbox.api.getsafepay.com/auth/v2/user/login' \
--data-raw '{
  "type": "password",
  "email": "user@example.com",
  "password": "password"
}'
```

---

### Create Shopper JWT Using OTP

**Endpoint:** `POST /auth/v2/user/login`

**Description:** Generate a JWT token for a Safepay Shopper using OTP (One-Time Password) authentication.

**Request Body:**
```json
{
  "type": "otp",
  "email": "user@example.com",
  "otp": "590237"
}
```

**Request Schema:**
| Property | Type | Mandatory |
|----------|------|-----------|
| type | enum | Y |
| email | string | Y |
| otp | string | Y |

**Response:**
```json
{
  "data": {
    "session": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token": "user_9ac8cc06-1fae-4f12-9636-a877eb8170a4",
    "refresh_token": "eyJhbGciOiJIUzI1NiJ9..."
  }
}
```

**cURL Example:**
```bash
curl --location 'https://sandbox.api.getsafepay.com/auth/v2/user/login' \
--data-raw '{
  "type": "otp",
  "email": "user@example.com",
  "otp": "590237"
}'
```

---

## Payment Operations

### Create Payment Tracker

**Endpoint:** `POST /order/payments/v3/`

**Description:** Create a tracker with mode `payment` for card payment processing.

**Request Body:**
```json
{
  "merchant_api_key": "sec_9286c6a3-a159-492d-9f72-dbe424517fb5",
  "intent": "CYBERSOURCE",
  "mode": "payment",
  "currency": "PKR",
  "amount": 500000,
  "entry_mode": "raw",
  "metadata": {
    "source": "shopify",
    "order_id": "41231X"
  }
}
```

**Request Schema:**
| Property | Type | Mandatory | Description |
|----------|------|-----------|-------------|
| merchant_api_key | string | Y | Your merchant API key |
| intent | enum | Y | Payment gateway (CYBERSOURCE, MPGS) |
| mode | enum | Y | Must be "payment" |
| currency | string | Y | Currency code (PKR, USD, GBP, AED, SAR, EUR, CAD) |
| amount | integer | Y | Amount in smallest currency unit |
| entry_mode | string | N | raw, flex, tms |
| metadata | object | N | Custom metadata |

**Response (201 Created):**
```json
{
  "data": {
    "tracker": {
      "token": "track_36b30a36-e42e-475a-a60e-fbc97c6cf9cc",
      "client": "sec_a7cc6fc1-088d-4f35-9dac-2bab2cb234a1",
      "environment": "sandbox",
      "state": "TRACKER_STARTED",
      "intent": "CYBERSOURCE",
      "mode": "payment",
      "entry_mode": "flex",
      "next_actions": {
        "CYBERSOURCE": {
          "kind": "GENERATE_CAPTURE_CONTEXT"
        },
        "MPGS": {
          "kind": "NOOP"
        }
      },
      "purchase_totals": {
        "quote_amount": {
          "currency": "PKR",
          "amount": 600000
        },
        "base_amount": {
          "currency": "PKR",
          "amount": 600000
        },
        "conversion_rate": {
          "base_currency": "PKR",
          "quote_currency": "PKR",
          "rate": 1
        }
      },
      "metadata": {}
    },
    "capabilities": {
      "CYBERSOURCE": true,
      "MPGS": true
    }
  },
  "status": {
    "errors": [],
    "message": "success"
  }
}
```

**cURL Example:**
```bash
curl --location 'https://sandbox.api.getsafepay.com/order/payments/v3/' \
--data '{
  "merchant_api_key": "sec_a7cc6fc1-088d-4f35-9dac-2bab2cb234a1",
  "intent": "CYBERSOURCE",
  "mode": "payment",
  "currency": "PKR",
  "amount": 600000
}'
```

---

## Subscriptions

### Create Subscription Tracker

**Endpoint:** `POST /order/payments/v3/`

**Description:** Create a tracker with mode `subscription` for recurring payment setup.

**Request Body:**
```json
{
  "merchant_api_key": "sec_9286c6a3-a159-492d-9f72-dbe424517fb5",
  "user": "user_793f7a42-80c4-4191-8df6-31d6b3ab829b",
  "intent": "CYBERSOURCE",
  "mode": "subscription",
  "currency": "PKR",
  "amount": 500000
}
```

**Request Schema:**
| Property | Type | Mandatory | Description |
|----------|------|-----------|-------------|
| merchant_api_key | string | Y | Your merchant API key |
| user | string | Y | Customer/user ID |
| intent | enum | Y | Payment gateway |
| mode | enum | Y | Must be "subscription" |
| currency | string | Y | Currency code |
| amount | integer | Y | Subscription amount |
| entry_mode | string | N | mit (Merchant Initiated Transaction) |

**Response (201 Created):**
```json
{
  "data": {
    "tracker": {
      "token": "track_88f7e3e8-1673-4ab9-9818-e169d38ca0c0",
      "client": "sec_9286c6a3-a159-492d-9f72-dbe424517fb5",
      "environment": "local",
      "state": "TRACKER_STARTED",
      "payment_method_kind": "card",
      "intent": "CYBERSOURCE",
      "mode": "subscription",
      "entry_mode": "mit",
      "customer": "cus_1c1e4d51-aaaf-42a3-99ce-884d9aba94fa",
      "next_actions": {
        "CYBERSOURCE": {
          "kind": "AUTHORIZATION"
        },
        "MPGS": {
          "kind": "NOOP"
        },
        "PAYFAST": {
          "kind": "NOOP"
        }
      },
      "purchase_totals": {
        "quote_amount": {
          "currency": "PKR",
          "amount": 1244
        },
        "base_amount": {
          "currency": "PKR",
          "amount": 1244
        },
        "conversion_rate": {
          "base_currency": "PKR",
          "quote_currency": "PKR",
          "rate": 1
        }
      },
      "metadata": {}
    },
    "capabilities": {
      "CYBERSOURCE": true,
      "MPGS": true,
      "PAYFAST": true
    }
  },
  "status": {
    "errors": [],
    "message": "success"
  }
}
```

**cURL Example:**
```bash
curl --location 'https://sandbox.api.getsafepay.com/order/payments/v3/' \
--data '{
  "merchant_api_key": "sec_9286c6a3-a159-492d-9f72-dbe424517fb5",
  "intent": "CYBERSOURCE",
  "user": "cus_1c1e4d51-aaaf-42a3-99ce-884d9aba94fa",
  "mode": "subscription",
  "entry_mode": "mit",
  "currency": "PKR",
  "amount": 1244
}'
```

---

## Payment Instruments

### Create Instrument Tracker (Tokenize Card)

**Endpoint:** `POST /order/payments/v3/`

**Description:** Create a tracker with mode `instrument` to tokenize and save a payment method for future use.

#### Standard Tokenization

**Request Body:**
```json
{
  "user": "cus_00e2092d-b54e-4d5f-8dbb-cdb96ed0eccc",
  "merchant_api_key": "sec_067a9859-0198-4f5a-b609-be0d305f88ab",
  "intent": "CYBERSOURCE",
  "mode": "instrument",
  "currency": "PKR",
  "entry_mode": "raw"
}
```

#### Zero Amount Authorization (Account Verification)

**Request Body:**
```json
{
  "user": "cus_00e2092d-b54e-4d5f-8dbb-cdb96ed0eccc",
  "merchant_api_key": "sec_067a9859-0198-4f5a-b609-be0d305f88ab",
  "intent": "CYBERSOURCE",
  "mode": "instrument",
  "currency": "PKR",
  "entry_mode": "raw",
  "is_account_verification": true
}
```

**Request Schema:**
| Property | Type | Mandatory | Description |
|----------|------|-----------|-------------|
| user | string | Y | Customer ID |
| merchant_api_key | string | Y | Your merchant API key |
| intent | enum | Y | Payment gateway |
| mode | enum | Y | Must be "instrument" |
| currency | string | Y | Currency code |
| entry_mode | string | N | raw, flex, tms |
| is_account_verification | boolean | N | Use zero amount authorization |

**Response (201 Created):**
```json
{
  "data": {
    "tracker": {
      "token": "track_c6ee552a-f166-4ec2-bae1-5f38a9b45c8d",
      "client": "sec_a7cc6fc1-088d-4f35-9dac-2bab2cb234a1",
      "environment": "sandbox",
      "state": "TRACKER_STARTED",
      "intent": "CYBERSOURCE",
      "mode": "instrument",
      "entry_mode": "flex",
      "next_actions": {
        "CYBERSOURCE": {
          "kind": "GENERATE_CAPTURE_CONTEXT"
        },
        "MPGS": {
          "kind": "NOOP"
        }
      },
      "purchase_totals": {
        "quote_amount": {
          "currency": "PKR",
          "amount": 500
        },
        "base_amount": {
          "currency": "PKR",
          "amount": 500
        },
        "conversion_rate": {
          "base_currency": "PKR",
          "quote_currency": "PKR",
          "rate": 1
        }
      },
      "metadata": {}
    },
    "capabilities": {
      "CYBERSOURCE": true,
      "MPGS": true
    }
  },
  "status": {
    "errors": [],
    "message": "success"
  }
}
```

**cURL Example:**
```bash
curl --location 'https://sandbox.api.getsafepay.com/order/payments/v3/' \
--data '{
  "merchant_api_key": "sec_a7cc6fc1-088d-4f35-9dac-2bab2cb234a1",
  "intent": "CYBERSOURCE",
  "mode": "instrument",
  "currency": "PKR"
}'
```

---

## Card-On-File (COF)

### Create Unscheduled COF Tracker

**Endpoint:** `POST /order/payments/v3/`

**Description:** Create a tracker for unscheduled Card-On-File transactions (customer-initiated recurring charges).

**Request Body:**
```json
{
  "merchant_api_key": "sec_a7cc6fc1-088d-4f35-9dac-2bab2cb234a1",
  "user": "cus_b4afd638-41bf-4831-af07-587b51269f38",
  "intent": "CYBERSOURCE",
  "mode": "unscheduled_cof",
  "currency": "PKR",
  "amount": 10050
}
```

**Request Schema:**
| Property | Type | Mandatory | Description |
|----------|------|-----------|-------------|
| merchant_api_key | string | Y | Your merchant API key |
| user | string | Y | Customer ID |
| intent | enum | Y | Payment gateway |
| mode | enum | Y | Must be "unscheduled_cof" |
| currency | string | Y | Currency code |
| amount | integer | Y | Transaction amount |

**Response (201 Created):**
```json
{
  "data": {
    "tracker": {
      "token": "track_da499080-3c67-4f82-8f33-c4338c8020c5",
      "client": "sec_a7cc6fc1-088d-4f35-9dac-2bab2cb234a1",
      "environment": "sandbox",
      "state": "TRACKER_STARTED",
      "intent": "CYBERSOURCE",
      "mode": "unscheduled_cof",
      "entry_mode": "tms",
      "customer": "cus_b4afd638-41bf-4831-af07-587b51269f38",
      "next_actions": {
        "CYBERSOURCE": {
          "kind": "AUTHORIZATION"
        },
        "MPGS": {
          "kind": "NOOP"
        }
      },
      "purchase_totals": {
        "quote_amount": {
          "currency": "PKR",
          "amount": 10050
        },
        "base_amount": {
          "currency": "PKR",
          "amount": 10050
        },
        "conversion_rate": {
          "base_currency": "PKR",
          "quote_currency": "PKR",
          "rate": 1
        }
      },
      "metadata": {}
    },
    "capabilities": {
      "CYBERSOURCE": true,
      "MPGS": true
    }
  },
  "status": {
    "errors": [],
    "message": "success"
  }
}
```

**cURL Example:**
```bash
curl --location 'https://sandbox.api.getsafepay.com/order/payments/v3/' \
--data '{
  "merchant_api_key": "sec_a7cc6fc1-088d-4f35-9dac-2bab2cb234a1",
  "user": "cus_b4afd638-41bf-4831-af07-587b51269f38",
  "intent": "CYBERSOURCE",
  "mode": "unscheduled_cof",
  "currency": "PKR",
  "amount": 10050
}'
```

---

## Order Processing

### Process Tracker Actions

**Endpoint:** `POST /order/payments/v3/{tracker_token}/actions`

**Description:** Progress a tracker through its state machine by executing the required next actions. This endpoint handles action execution including GENERATE_CAPTURE_CONTEXT, AUTHORIZATION, CAPTURE, REVERSAL, and NO_OP.

**Key Concepts:**

- **Tracker:** A state machine that tracks the lifecycle of a payment
- **Next Actions:** Actions required to progress the tracker's state (returned in the response)
- **Entry Mode:** Specifies how payment details are captured (raw, flex, tms, mit)

**Available Next Actions:**

| Action | Description |
|--------|-------------|
| GENERATE_CAPTURE_CONTEXT | Generate Cybersource capture context for flex forms |
| AUTHORIZATION | Authorize a payment (hold funds) |
| CAPTURE | Capture authorized funds |
| REVERSAL | Reverse an authorized payment |
| REFUND | Refund a captured payment |
| NO_OP | No operation (final state) |

**Request Headers:**
```
X-SFPY-IP-ADDRESS: 192.168.1.1        # (Optional) Client IP for better location tracking
X-SFPY-USER-AGENT: Mozilla/5.0...     # (Optional) User agent string
```

**Example Request (After Capture Context Generation):**
```bash
curl --location --request POST \
'https://sandbox.api.getsafepay.com/order/payments/v3/track_36b30a36-e42e-475a-a60e-fbc97c6cf9cc/actions' \
--data '{
  "action": "AUTHORIZATION",
  "payload": {
    "instrument": {
      "card": {
        "number": "4111111111111111",
        "expiry_month": "12",
        "expiry_year": "2025",
        "cvv": "123"
      }
    }
  }
}'
```

---

## Quick Links

### Create Quick Link

**Endpoint:** `POST /invoice/quick-links/v1/`

**Description:** Create a Quick Link for requesting payment from a recipient. Quick Links can be sent via email or manually shared.

**Authentication:** Bearer Token (JWT)

**Supported Currencies:**
- PKR, USD, GBP, AED, SAR, EUR, CAD

**Request Body:**
```json
{
  "amount": 15000,
  "currency": "PKR",
  "note": "For Zara handbag purchased through Import Fox",
  "workflow": "MANUAL"
}
```

**Request Schema:**
| Property | Type | Mandatory | Description |
|----------|------|-----------|-------------|
| amount | integer | Y | Amount in normal denomination |
| currency | string | Y | Currency code |
| note | string | Y | Payment note/description |
| workflow | string | Y | MANUAL or EMAIL |

**Response (200 OK):**
```json
{
  "data": {
    "id": "link_297bfa4b-f61c-4c72-80a4-368d731e890c",
    "merchant_id": "client_071f9c25-c291-4dcf-a21e-79b576ddd0fd",
    "number": "92243675",
    "status": "CREATED",
    "note": "For Zara handbag purchased through Import Fox",
    "metadata": [
      {
        "id": "meta_e7b25fdc-a4ca-4ed1-9249-85c881d4e4f7",
        "quick_link_id": "link_297bfa4b-f61c-4c72-80a4-368d731e890c",
        "recipient_view_url": "https://sandbox.api.getsafepay.com/io/quick-link?ql=link_297bfa4b-f61c-4c72-80a4-368d731e890c",
        "created_at": "0001-01-01T00:00:00Z",
        "updated_at": "0001-01-01T00:00:00Z"
      }
    ],
    "payment": null,
    "recipients": null,
    "total": 15000,
    "currency": "PKR",
    "workflow": "MANUAL",
    "created_at": "2023-09-28T11:26:27.453829284Z",
    "updated_at": "2023-09-28T11:26:27.453829385Z"
  },
  "status": {
    "errors": [],
    "message": "success"
  }
}
```

**Important:** The payment URL can be accessed via `data.metadata[0].recipient_view_url`

**cURL Example:**
```bash
curl --location 'https://sandbox.api.getsafepay.com/invoice/quick-links/v1/' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN' \
--data '{
  "amount": 15000,
  "currency": "PKR",
  "note": "For Zara handbag purchased through Import Fox",
  "workflow": "MANUAL"
}'
```

---

### Find Quick Link

**Endpoint:** `GET /invoice/quick-links/v2/{link_id}`

**Description:** Retrieve details of a specific Quick Link by its ID.

**Authentication:** Bearer Token (JWT)

**cURL Example:**
```bash
curl --location 'https://sandbox.api.getsafepay.com/invoice/quick-links/v2/link_291208af-ef95-4b7d-b171-aaaa16998d31'
```

---

### Update Quick Link

**Endpoint:** `PUT /invoice/quick-links/v1/{link_id}`

**Description:** Update an existing Quick Link's details.

**Authentication:** Bearer Token (JWT)

---

### Email Quick Link

**Endpoint:** `POST /invoice/quick-links/v1/{link_id}/email`

**Description:** Send a Quick Link to a recipient via email.

**Authentication:** Bearer Token (JWT)

---

### Delete Quick Link

**Endpoint:** `DELETE /invoice/quick-links/v1/{link_id}`

**Description:** Delete a Quick Link by its ID. Deleted links can no longer be used for payments.

**Authentication:** Bearer Token (JWT)

**Response (200 OK):**
```json
{
  "data": "success",
  "status": {
    "errors": [],
    "message": "success"
  }
}
```

**cURL Example:**
```bash
curl --location --request DELETE \
'https://sandbox.api.getsafepay.com/invoice/quick-links/v1/link_297bfa4b-f61c-4c72-80a4-368d731e890c' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'
```

---

## Type Definitions

### TypeScript Interfaces

```typescript
// Authentication
interface ShopperLoginRequest {
  type: 'password' | 'otp';
  email: string;
  password?: string;
  otp?: string;
}

interface ShopperLoginResponse {
  data: {
    session: string;
    token: string;
    refresh_token: string;
  };
}

// Payment Tracker
interface PaymentTrackerRequest {
  merchant_api_key: string;
  intent: 'CYBERSOURCE' | 'MPGS' | 'PAYFAST';
  mode: 'payment' | 'subscription' | 'instrument' | 'unscheduled_cof';
  currency: string;
  amount: number;
  entry_mode?: 'raw' | 'flex' | 'tms' | 'mit';
  user?: string;
  metadata?: Record<string, any>;
  is_account_verification?: boolean;
}

interface PurchaseTotals {
  quote_amount: {
    currency: string;
    amount: number;
  };
  base_amount: {
    currency: string;
    amount: number;
  };
  conversion_rate: {
    base_currency: string;
    quote_currency: string;
    rate: number;
  };
}

interface Tracker {
  token: string;
  client: string;
  environment: 'sandbox' | 'production' | 'local';
  state: string;
  intent: string;
  mode: string;
  entry_mode?: string;
  payment_method_kind?: string;
  customer?: string;
  next_actions: Record<string, { kind: string }>;
  purchase_totals: PurchaseTotals;
  metadata: Record<string, any>;
}

interface PaymentTrackerResponse {
  data: {
    tracker: Tracker;
    capabilities: Record<string, boolean>;
  };
  status: {
    errors: any[];
    message: string;
  };
}

// Quick Links
interface QuickLinkRequest {
  amount: number;
  currency: string;
  note: string;
  workflow: 'MANUAL' | 'EMAIL';
}

interface QuickLinkMetadata {
  id: string;
  quick_link_id: string;
  recipient_view_url: string;
  created_at: string;
  updated_at: string;
}

interface QuickLink {
  id: string;
  merchant_id: string;
  number: string;
  status: 'CREATED' | 'PAID' | 'EXPIRED';
  note: string;
  metadata: QuickLinkMetadata[];
  payment: any;
  recipients: any;
  total: number;
  currency: string;
  workflow: 'MANUAL' | 'EMAIL';
  created_at: string;
  updated_at: string;
}

interface QuickLinkResponse {
  data: QuickLink;
  status: {
    errors: any[];
    message: string;
  };
}

// API Response Wrapper
interface SafepayResponse<T> {
  data: T;
  status: {
    errors: any[];
    message: string;
  };
}
```

---

## Error Handling

All error responses follow this standard format:

```json
{
  "data": null,
  "status": {
    "errors": [
      {
        "code": "ERROR_CODE",
        "message": "Human readable error message"
      }
    ],
    "message": "error"
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| INVALID_REQUEST | Request validation failed |
| AUTHENTICATION_FAILED | Invalid credentials or expired token |
| MERCHANT_NOT_FOUND | Merchant API key is invalid |
| TRACKER_NOT_FOUND | Tracker token doesn't exist |
| INSUFFICIENT_FUNDS | Customer has insufficient balance |
| PAYMENT_DECLINED | Card was declined |
| CURRENCY_NOT_SUPPORTED | Currency is not supported |
| INVALID_AMOUNT | Amount is invalid or too low |

---

## Complete Examples

### Example 1: Complete Payment Flow (Password Authentication)

```bash
# Step 1: Authenticate user with password
curl --location 'https://sandbox.api.getsafepay.com/auth/v2/user/login' \
--data-raw '{
  "type": "password",
  "email": "user@example.com",
  "password": "password"
}'

# Response: Get JWT token from data.session

# Step 2: Create payment tracker
curl --location 'https://sandbox.api.getsafepay.com/order/payments/v3/' \
--data '{
  "merchant_api_key": "sec_a7cc6fc1-088d-4f35-9dac-2bab2cb234a1",
  "intent": "CYBERSOURCE",
  "mode": "payment",
  "currency": "PKR",
  "amount": 500000
}'

# Response: Get tracker token from data.tracker.token

# Step 3: Process payment (execute next_actions)
# Based on next_action kind, submit appropriate payload

# Step 4: Authorize payment
curl --location --request POST \
'https://sandbox.api.getsafepay.com/order/payments/v3/TRACKER_TOKEN/actions' \
--data '{
  "action": "AUTHORIZATION",
  "payload": {
    "instrument": {
      "card": {
        "number": "4111111111111111",
        "expiry_month": "12",
        "expiry_year": "2025",
        "cvv": "123"
      }
    }
  }
}'

# Step 5: Capture payment
curl --location --request POST \
'https://sandbox.api.getsafepay.com/order/payments/v3/TRACKER_TOKEN/actions' \
--data '{
  "action": "CAPTURE",
  "payload": {}
}'
```

### Example 2: Tokenize Card for Future Use

```bash
# Step 1: Create instrument tracker
curl --location 'https://sandbox.api.getsafepay.com/order/payments/v3/' \
--data '{
  "merchant_api_key": "sec_a7cc6fc1-088d-4f35-9dac-2bab2cb234a1",
  "intent": "CYBERSOURCE",
  "mode": "instrument",
  "currency": "PKR",
  "is_account_verification": true
}'

# Step 2: Submit card details
curl --location --request POST \
'https://sandbox.api.getsafepay.com/order/payments/v3/TRACKER_TOKEN/actions' \
--data '{
  "action": "AUTHORIZATION",
  "payload": {
    "instrument": {
      "card": {
        "number": "4111111111111111",
        "expiry_month": "12",
        "expiry_year": "2025",
        "cvv": "123"
      }
    }
  }
}'

# Card is now tokenized and associated with user
```

### Example 3: Create and Send Quick Link

```bash
# Step 1: Authenticate
curl --location 'https://sandbox.api.getsafepay.com/auth/v2/user/login' \
--data-raw '{
  "type": "password",
  "email": "user@example.com",
  "password": "password"
}'

# Step 2: Create Quick Link
curl --location 'https://sandbox.api.getsafepay.com/invoice/quick-links/v1/' \
--header 'Authorization: Bearer JWT_TOKEN' \
--data '{
  "amount": 15000,
  "currency": "PKR",
  "note": "Invoice payment",
  "workflow": "MANUAL"
}'

# Step 3: Share recipient_view_url with customer
# Customer can pay using the shared link
```

### Example 4: Subscription Payment Setup (MIT)

```bash
# Step 1: Create subscription tracker with MIT (Merchant Initiated Transaction)
curl --location 'https://sandbox.api.getsafepay.com/order/payments/v3/' \
--data '{
  "merchant_api_key": "sec_9286c6a3-a159-492d-9f72-dbe424517fb5",
  "intent": "CYBERSOURCE",
  "user": "cus_1c1e4d51-aaaf-42a3-99ce-884d9aba94fa",
  "mode": "subscription",
  "entry_mode": "mit",
  "currency": "PKR",
  "amount": 5000
}'

# Step 2: Process authorization
curl --location --request POST \
'https://sandbox.api.getsafepay.com/order/payments/v3/TRACKER_TOKEN/actions' \
--data '{
  "action": "AUTHORIZATION",
  "payload": {}
}'

# Step 3: Capture subscription payment
curl --location --request POST \
'https://sandbox.api.getsafepay.com/order/payments/v3/TRACKER_TOKEN/actions' \
--data '{
  "action": "CAPTURE",
  "payload": {}
}'

# Subscription is now active and will be billed according to schedule
```

---

## Best Practices

1. **Always validate responses:** Check `status.errors` array before processing
2. **Store tracker tokens securely:** Use HTTPS and secure storage for sensitive data
3. **Implement idempotency:** Use unique request IDs to prevent duplicate charges
4. **Handle webhooks:** Implement webhook handlers for real-time payment status updates
5. **Test in sandbox first:** Always test integrations in sandbox environment before going to production
6. **Use JWT refresh tokens:** Refresh expired JWTs using refresh_token endpoint
7. **Implement proper error handling:** Always handle PAYMENT_DECLINED and other error scenarios gracefully
8. **Pass optional headers:** Include X-SFPY-IP-ADDRESS and X-SFPY-USER-AGENT for better fraud detection

---

## Resources

- **API Base URL (Sandbox):** https://sandbox.api.getsafepay.com
- **Support Email:** integrations@getsafepay.com
- **Status Page:** Check for API status and incidents
- **Webhook Documentation:** See webhook section for real-time updates
