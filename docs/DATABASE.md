# 💾 Database Documentation (db.json)

This document provides comprehensive documentation for the `db.json` file structure used by JSON Server to provide a mock REST API for the Vendor Risk Management application.

## 📋 Table of Contents

- [Overview](#overview)
- [Entity Relationship Diagram](#entity-relationship-diagram)
- [Entity Schemas](#entity-schemas)
  - [Vendors](#vendors)
  - [Purchases](#purchases)
  - [Items](#items)
  - [Vendor Items](#vendor-items)
  - [Risk Analysis](#risk-analysis)
- [Sample Data](#sample-data)
- [Data Validation Rules](#data-validation-rules)
- [Common Queries](#common-queries)

---

## Overview

The application uses `db.json` as a file-based database powered by JSON Server. This provides:

- RESTful API endpoints automatically
- CRUD operations for all entities
- Filtering, sorting, and pagination
- Relationships via foreign keys

**File Location:** Project root directory (`/db.json`)

**API Base URL:** `http://localhost:3000`

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE SCHEMA                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│     VENDORS     │         │   VENDOR_ITEMS  │         │      ITEMS      │
├─────────────────┤         ├─────────────────┤         ├─────────────────┤
│ id (PK)         │◄───────┐│ id (PK)         │┌───────►│ id (PK)         │
│ vendorName      │        ││ vendorId (FK)   ││        │ itemCode        │
│ contactPerson   │        └│ itemId (FK)     │┘        │ name            │
│ email           │         │ price           │         │ description     │
│ phone           │         │ minOrderQty     │         │ category        │
│ category        │         │ leadTimeDays    │         │ unit            │
│ status          │         │ isPreferred     │         │ basePrice       │
│ address         │         └─────────────────┘         │ status          │
│ city/state      │                                     └─────────────────┘
│ country         │
│ rating          │
│ qualityScore    │
│ riskScore       │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│    PURCHASES    │
├─────────────────┤
│ id (PK)         │         ┌─────────────────┐
│ vendorId (FK)   │         │  RISK_ANALYSIS  │
│ purchaseOrder#  │         ├─────────────────┤
│ orderDate       │         │ id (PK)         │
│ status          │◄───────►│ vendorId (FK)   │
│ items[]         │         │ riskLevel       │
│ totalAmount     │         │ overallScore    │
│ qualityRating   │         │ financialRisk   │
│ paymentStatus   │         │ operationalRisk │
│ onTimeDelivery  │         │ complianceRisk  │
│ returnedItems   │         │ recommendations │
└─────────────────┘         └─────────────────┘
```

---

## Entity Schemas

### Vendors

The `vendors` collection stores all supplier/vendor information.

#### Schema Definition

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (e.g., "V001") |
| `vendorName` | string | Yes | Company name |
| `contactPerson` | string | Yes | Primary contact name |
| `email` | string | Yes | Contact email address |
| `phone` | string | Yes | Contact phone number |
| `category` | string | Yes | Business category (Hardware, Software, Services, etc.) |
| `status` | enum | Yes | `active` \| `inactive` \| `pending` \| `suspended` |
| `address` | string | No | Street address |
| `city` | string | No | City name |
| `state` | string | No | State/Province |
| `country` | string | No | Country name |
| `taxId` | string | No | Tax identification number |
| `paymentTerms` | string | No | Payment terms (e.g., "Net 30") |
| `creditLimit` | number | No | Maximum credit amount |
| `totalPurchases` | number | Yes | Total purchase value (calculated) |
| `rating` | number | Yes | Overall rating (1-5 scale) |
| `qualityScore` | number | No | Quality percentage (0-100) |
| `onTimeDeliveryRate` | number | No | On-time delivery percentage (0-100) |
| `riskScore` | number | No | Risk score (0-100, lower is better) |
| `createdAt` | string | No | ISO 8601 timestamp |
| `updatedAt` | string | No | ISO 8601 timestamp |

#### Example

```json
{
  "id": "V001",
  "vendorName": "Dell Technologies",
  "contactPerson": "Michael Johnson",
  "email": "enterprise.sales@dell.com",
  "phone": "+1-800-999-3355",
  "category": "Hardware",
  "status": "active",
  "address": "One Dell Way",
  "city": "Round Rock",
  "state": "Texas",
  "country": "USA",
  "taxId": "US-74-2487834",
  "paymentTerms": "Net 30",
  "creditLimit": 500000,
  "totalPurchases": 185925,
  "rating": 4.7,
  "qualityScore": 95,
  "onTimeDeliveryRate": 94,
  "riskScore": 12,
  "createdAt": "2024-01-10T08:00:00.000Z",
  "updatedAt": "2025-12-12T23:19:34.395Z"
}
```

#### Status Values

| Status | Description |
|--------|-------------|
| `active` | Vendor is approved and can receive orders |
| `inactive` | Vendor is temporarily not accepting orders |
| `pending` | Vendor is awaiting approval |
| `suspended` | Vendor is suspended due to issues |

---

### Purchases

The `purchases` collection stores all purchase orders.

#### Schema Definition

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (e.g., "PO-2025-001") |
| `vendorId` | string | Yes | Reference to vendor.id |
| `vendorName` | string | No | Denormalized vendor name |
| `purchaseOrderNumber` | string | Yes | Human-readable PO number |
| `orderDate` | string | Yes | ISO date string (YYYY-MM-DD) |
| `expectedDeliveryDate` | string | No | Expected delivery date |
| `actualDeliveryDate` | string | No | Actual delivery date |
| `status` | enum | Yes | Order status |
| `items` | array | Yes | Array of PurchaseItem objects |
| `subtotal` | number | Yes | Sum of item totals |
| `tax` | number | Yes | Tax amount |
| `totalAmount` | number | Yes | Grand total (subtotal + tax) |
| `notes` | string | No | Additional notes |
| `urgent` | boolean | No | Priority flag |
| `onTimeDelivery` | boolean | No | Was delivery on time? |
| `deliveryDelayDays` | number | No | Days delayed (if late) |
| `qualityRating` | number | No | Quality rating (1-5) |
| `paymentStatus` | enum | No | Payment status |
| `paymentDelayDays` | number | No | Payment delay in days |
| `leadTime` | number | No | Days from order to delivery |
| `returnedItems` | number | No | Number of returned items |
| `defectCount` | number | No | Number of defective items |
| `defectRate` | number | No | Percentage of defects |
| `complianceIssues` | array | No | Array of issue descriptions |
| `createdAt` | string | No | ISO 8601 timestamp |
| `createdBy` | string | No | User who created the order |

#### Purchase Item Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `itemId` | string | No | Reference to items.id |
| `description` | string | Yes | Item description |
| `quantity` | number | Yes | Order quantity |
| `unitPrice` | number | Yes | Price per unit |
| `total` | number | Yes | Line total (quantity × unitPrice) |

#### Status Values

| Status | Description |
|--------|-------------|
| `pending` | Order created, awaiting approval |
| `approved` | Order approved, sent to vendor |
| `shipped` | Order shipped by vendor |
| `delivered` | Order received |
| `cancelled` | Order cancelled |

#### Payment Status Values

| Status | Description |
|--------|-------------|
| `pending` | Payment not yet made |
| `paid` | Fully paid |
| `partial` | Partially paid |
| `overdue` | Payment is past due |

#### Example

```json
{
  "id": "PO-2025-001",
  "vendorId": "V001",
  "vendorName": "Dell Technologies",
  "purchaseOrderNumber": "PO-2025-001",
  "orderDate": "2025-01-15",
  "expectedDeliveryDate": "2025-01-25",
  "actualDeliveryDate": "2025-01-24",
  "status": "delivered",
  "items": [
    {
      "itemId": "ITEM001",
      "description": "Dell PowerEdge R750 Server",
      "quantity": 5,
      "unitPrice": 8500,
      "total": 42500
    },
    {
      "itemId": "ITEM002",
      "description": "Dell 27\" UltraSharp Monitor",
      "quantity": 10,
      "unitPrice": 450,
      "total": 4500
    }
  ],
  "subtotal": 47000,
  "tax": 3760,
  "totalAmount": 50760,
  "notes": "Urgent server replacement for data center",
  "urgent": true,
  "onTimeDelivery": true,
  "deliveryDelayDays": 0,
  "qualityRating": 5,
  "paymentStatus": "paid",
  "paymentDelayDays": 0,
  "leadTime": 10,
  "returnedItems": 0,
  "defectCount": 0,
  "defectRate": 0,
  "complianceIssues": [],
  "createdAt": "2025-01-15T10:30:00.000Z",
  "createdBy": "john.smith"
}
```

---

### Items

The `items` collection stores the product/item catalog.

#### Schema Definition

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (e.g., "ITEM001") |
| `itemCode` | string | Yes | SKU or product code |
| `name` | string | Yes | Product name |
| `description` | string | No | Detailed description |
| `category` | string | Yes | Product category |
| `unit` | string | Yes | Unit of measure (unit, box, kg, etc.) |
| `basePrice` | number | No | Reference base price |
| `status` | enum | No | `active` \| `inactive` \| `discontinued` |
| `createdAt` | string | No | ISO 8601 timestamp |
| `updatedAt` | string | No | ISO 8601 timestamp |

#### Example

```json
{
  "id": "ITEM001",
  "itemCode": "DELL-R750",
  "name": "Dell PowerEdge R750 Server",
  "description": "Enterprise rack server with Intel Xeon processors, ideal for data centers",
  "category": "Servers",
  "unit": "unit",
  "basePrice": 8500,
  "status": "active",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-06-15T00:00:00.000Z"
}
```

#### Common Categories

- Servers
- Laptops
- Monitors
- Networking
- Storage
- Software
- Office Supplies
- Furniture
- Services

---

### Vendor Items

The `vendorItems` collection maps vendors to items with specific pricing.

#### Schema Definition

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (e.g., "VI001") |
| `vendorId` | string | Yes | Reference to vendors.id |
| `itemId` | string | Yes | Reference to items.id |
| `vendorItemCode` | string | No | Vendor's product code |
| `price` | number | Yes | Vendor-specific price |
| `minOrderQuantity` | number | No | Minimum order quantity |
| `leadTimeDays` | number | No | Delivery lead time in days |
| `isPreferred` | boolean | No | Is this the preferred vendor for this item? |
| `createdAt` | string | No | ISO 8601 timestamp |
| `updatedAt` | string | No | ISO 8601 timestamp |

#### Example

```json
{
  "id": "VI001",
  "vendorId": "V001",
  "itemId": "ITEM001",
  "vendorItemCode": "DELL-R750-ENT",
  "price": 8500,
  "minOrderQuantity": 1,
  "leadTimeDays": 10,
  "isPreferred": true,
  "createdAt": "2024-01-10T00:00:00.000Z"
}
```

---

### Risk Analysis

The `riskanalysis` collection stores AI-generated vendor risk assessments.

#### Schema Definition

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (e.g., "RA001") |
| `vendorId` | string | Yes | Reference to vendors.id |
| `vendorName` | string | No | Denormalized vendor name |
| `riskLevel` | enum | Yes | `low` \| `medium` \| `high` \| `critical` |
| `overallScore` | number | Yes | Overall risk score (0-100) |
| `financialRisk` | number | Yes | Financial risk score (0-100) |
| `operationalRisk` | number | Yes | Operational risk score (0-100) |
| `complianceRisk` | number | Yes | Compliance risk score (0-100) |
| `reputationRisk` | number | Yes | Reputation risk score (0-100) |
| `riskFactors` | array | No | Array of RiskFactor objects |
| `lastAssessmentDate` | string | Yes | Date of last assessment |
| `nextReviewDate` | string | Yes | Scheduled next review date |
| `recommendations` | array | No | Array of recommendation strings |
| `createdAt` | string | No | ISO 8601 timestamp |
| `updatedAt` | string | No | ISO 8601 timestamp |

#### Risk Factor Schema

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Factor name |
| `score` | number | Factor score (0-100) |
| `weight` | number | Weight in overall calculation (0-1) |
| `description` | string | Detailed description |

#### Risk Level Thresholds

| Level | Score Range | Description |
|-------|-------------|-------------|
| `low` | 0-25 | Minimal risk, proceed normally |
| `medium` | 26-50 | Moderate risk, monitor closely |
| `high` | 51-75 | Significant risk, take action |
| `critical` | 76-100 | Severe risk, immediate action required |

#### Example

```json
{
  "id": "RA001",
  "vendorId": "V001",
  "vendorName": "Dell Technologies",
  "riskLevel": "low",
  "overallScore": 12,
  "financialRisk": 10,
  "operationalRisk": 15,
  "complianceRisk": 8,
  "reputationRisk": 12,
  "riskFactors": [
    {
      "name": "Financial Stability",
      "score": 10,
      "weight": 0.3,
      "description": "Strong financial position with consistent revenue growth"
    },
    {
      "name": "Delivery Performance",
      "score": 15,
      "weight": 0.25,
      "description": "94% on-time delivery rate exceeds industry standard"
    },
    {
      "name": "Quality Control",
      "score": 8,
      "weight": 0.25,
      "description": "Excellent quality with 95% acceptance rate"
    },
    {
      "name": "Compliance",
      "score": 12,
      "weight": 0.2,
      "description": "Full compliance with industry standards and regulations"
    }
  ],
  "lastAssessmentDate": "2025-12-01",
  "nextReviewDate": "2026-03-01",
  "recommendations": [
    "Continue monitoring quarterly financials",
    "Maintain current payment terms",
    "Consider increasing order volume given excellent performance"
  ],
  "createdAt": "2025-12-01T00:00:00.000Z"
}
```

---

## Sample Data

### Minimal db.json Template

```json
{
  "vendors": [],
  "purchases": [],
  "items": [],
  "vendorItems": [],
  "riskanalysis": []
}
```

### Quick Start Data

Copy this to quickly populate your database with sample data:

```json
{
  "vendors": [
    {
      "id": "V001",
      "vendorName": "Sample Vendor Inc.",
      "contactPerson": "John Doe",
      "email": "john@samplevendor.com",
      "phone": "+1-555-0100",
      "category": "Hardware",
      "status": "active",
      "totalPurchases": 50000,
      "rating": 4.5,
      "qualityScore": 90,
      "onTimeDeliveryRate": 92,
      "riskScore": 20,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "purchases": [
    {
      "id": "PO-001",
      "vendorId": "V001",
      "vendorName": "Sample Vendor Inc.",
      "purchaseOrderNumber": "PO-001",
      "orderDate": "2025-01-01",
      "status": "delivered",
      "items": [
        {
          "description": "Sample Product",
          "quantity": 10,
          "unitPrice": 100,
          "total": 1000
        }
      ],
      "subtotal": 1000,
      "tax": 80,
      "totalAmount": 1080,
      "qualityRating": 4,
      "onTimeDelivery": true,
      "paymentStatus": "paid"
    }
  ],
  "items": [
    {
      "id": "ITEM001",
      "itemCode": "PROD-001",
      "name": "Sample Product",
      "category": "Hardware",
      "unit": "unit",
      "basePrice": 100,
      "status": "active"
    }
  ],
  "vendorItems": [
    {
      "id": "VI001",
      "vendorId": "V001",
      "itemId": "ITEM001",
      "price": 100,
      "leadTimeDays": 7,
      "isPreferred": true
    }
  ],
  "riskanalysis": [
    {
      "id": "RA001",
      "vendorId": "V001",
      "vendorName": "Sample Vendor Inc.",
      "riskLevel": "low",
      "overallScore": 20,
      "financialRisk": 15,
      "operationalRisk": 20,
      "complianceRisk": 25,
      "reputationRisk": 18,
      "lastAssessmentDate": "2025-01-01",
      "nextReviewDate": "2025-04-01",
      "recommendations": ["Continue standard monitoring"]
    }
  ]
}
```

---

## Data Validation Rules

### ID Conventions

| Entity | Format | Example |
|--------|--------|---------|
| Vendors | `V###` | V001, V002 |
| Purchases | `PO-YYYY-###` | PO-2025-001 |
| Items | `ITEM###` | ITEM001 |
| Vendor Items | `VI###` | VI001 |
| Risk Analysis | `RA###` | RA001 |

### Required Relationships

1. **Purchase → Vendor**: Every purchase must have a valid `vendorId`
2. **VendorItem → Vendor**: Every vendor item must reference a valid `vendorId`
3. **VendorItem → Item**: Every vendor item must reference a valid `itemId`
4. **RiskAnalysis → Vendor**: Every risk analysis must reference a valid `vendorId`

### Value Ranges

| Field | Min | Max | Notes |
|-------|-----|-----|-------|
| rating | 1 | 5 | Decimal allowed |
| qualityScore | 0 | 100 | Percentage |
| onTimeDeliveryRate | 0 | 100 | Percentage |
| riskScore | 0 | 100 | Lower is better |
| qualityRating | 1 | 5 | Integer preferred |

---

## Common Queries

### Using JSON Server Query Parameters

**Filter by field value:**
```bash
GET /vendors?status=active
GET /purchases?vendorId=V001
```

**Multiple filters:**
```bash
GET /vendors?status=active&category=Hardware
```

**Comparison operators:**
```bash
GET /vendors?rating_gte=4       # Rating >= 4
GET /purchases?totalAmount_lte=10000  # Total <= 10000
```

**Sorting:**
```bash
GET /vendors?_sort=rating&_order=desc
GET /purchases?_sort=orderDate&_order=asc
```

**Pagination:**
```bash
GET /vendors?_page=1&_limit=10
```

**Full-text search:**
```bash
GET /vendors?q=dell
```

**Nested resource (purchases for a vendor):**
```bash
GET /vendors/V001/purchases
```

### Common Use Cases

**Get all high-risk vendors:**
```bash
GET /riskanalysis?riskLevel=high
GET /riskanalysis?riskLevel=critical
```

**Get pending purchases sorted by date:**
```bash
GET /purchases?status=pending&_sort=orderDate&_order=desc
```

**Get top-rated vendors:**
```bash
GET /vendors?_sort=rating&_order=desc&_limit=5
```

**Get overdue payments:**
```bash
GET /purchases?paymentStatus=overdue
```

---

## Backup & Restore

### Create Backup
```bash
cp db.json db-backup-$(date +%Y%m%d).json
```

### Restore from Backup
```bash
cp db-backup.json db.json
```

### Reset to Empty Database
```bash
echo '{"vendors":[],"purchases":[],"items":[],"vendorItems":[],"riskanalysis":[]}' > db.json
```

---

## Troubleshooting

### JSON Syntax Errors

If JSON Server fails to start, validate your JSON:

```bash
# Using Node.js
node -e "require('./db.json')"

# Using Python
python -m json.tool db.json
```

### Data Integrity Issues

Check for orphaned records:

1. Purchases referencing non-existent vendors
2. VendorItems referencing non-existent vendors or items
3. RiskAnalysis referencing non-existent vendors

---

**Last Updated:** December 2025
