# 🏢 Vendor Risk Management & Procurement Analytics Platform

A comprehensive Angular 19 application for managing vendor relationships, procurement processes, and AI-powered risk analysis. Built for enterprise-grade vendor management with real-time analytics and intelligent insights.

![Angular](https://img.shields.io/badge/Angular-19.2-red?style=flat-square&logo=angular)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-purple?style=flat-square&logo=bootstrap)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
- [Running the Application](#-running-the-application)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Database Setup (db.json)](#-database-setup-dbjson)
- [Environment Configuration](#-environment-configuration)
- [Contributing](#-contributing)

---

## ✨ Features

### 🎯 Core Features
- **Vendor Management** - Complete CRUD operations for vendor profiles
- **Purchase Order Management** - Create, track, and manage purchase orders
- **Dashboard Analytics** - Real-time metrics and KPIs visualization
- **AI-Powered Risk Analysis** - Gemini AI integration for intelligent risk scoring
- **Document Scanner** - OCR-powered document processing with Tesseract.js
- **Master Data Management** - Centralized items and vendor-item mapping

### 📊 Analytics & Insights
- Total expenses tracking with trend analysis
- Vendor performance scoring (quality + on-time delivery)
- Products received vs accepted metrics
- Supplier classification (A/B/C class)
- Accounts payable monitoring
- Green channel product tracking

### 🤖 AI Capabilities
- Automated vendor risk assessment
- Financial, operational, compliance, and reputation risk scoring
- AI-generated recommendations for risk mitigation
- Chat-based AI assistant for procurement insights

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                           │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │  Dashboard  │ │   Vendors   │ │  Purchases  │ │ Risk Analysis│   │
│  │  Component  │ │   Module    │ │   Module    │ │   Module    │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │   Insights  │ │   Upload    │ │  Document   │ │ Master Data │   │
│  │  Component  │ │  Component  │ │   Scanner   │ │  Component  │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│                         SHARED COMPONENTS                            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ Navbar  │ │ Sidebar │ │ Footer  │ │ Layout  │ │  Charts │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
├─────────────────────────────────────────────────────────────────────┤
│                          CORE SERVICES                               │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                 │
│  │  API Service │ │   AI Risk    │ │   Document   │                 │
│  │  (HTTP/CRUD) │ │   Analysis   │ │   Scanner    │                 │
│  └──────────────┘ └──────────────┘ └──────────────┘                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                 │
│  │   Analytics  │ │    Theme     │ │   Loading    │                 │
│  │   Service    │ │   Service    │ │   Service    │                 │
│  └──────────────┘ └──────────────┘ └──────────────┘                 │
├─────────────────────────────────────────────────────────────────────┤
│                          DATA LAYER                                  │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    JSON Server (db.json)                     │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐  │   │
│  │  │ Vendors │ │Purchases│ │  Items  │ │VendorItems│ │ Risk │  │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └───────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│                      EXTERNAL SERVICES                               │
│  ┌──────────────────┐  ┌──────────────────┐                         │
│  │  Google Gemini   │  │   Tesseract.js   │                         │
│  │   AI API         │  │   (OCR Engine)   │                         │
│  └──────────────────┘  └──────────────────┘                         │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action → Component → Service → HTTP Request → JSON Server
                                         ↓
User Display ← Component ← Service ← HTTP Response ← db.json
```

---

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend Framework** | Angular 19.2 |
| **Language** | TypeScript 5.7 |
| **Styling** | Bootstrap 5.3, Bootstrap Icons |
| **State Management** | RxJS 7.8 |
| **Mock API** | JSON Server |
| **AI Integration** | Google Gemini API |
| **OCR** | Tesseract.js 6.0 |
| **Testing** | Jasmine, Karma |

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.x or higher) - [Download](https://nodejs.org/)
- **npm** (v9.x or higher) - Comes with Node.js
- **Angular CLI** (v19.x) - Install globally:
  ```bash
  npm install -g @angular/cli
  ```
- **Git** - [Download](https://git-scm.com/)

### Optional (for AI features)
- **Google Gemini API Key** - [Get API Key](https://makersuite.google.com/app/apikey)

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/vendor-risk-management.git
cd vendor-risk-management
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment (Optional - for AI features)

Create or update the AI service configuration with your Gemini API key:

```typescript
// src/app/core/services/ai-risk-analysis/ai-risk-analysis.service.ts
private readonly GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY';
```

> ⚠️ **Security Note**: For production, use environment variables or a secure vault for API keys.

### 4. Verify db.json Setup

Ensure `db.json` exists in the root directory with the required data structure. See [Database Setup](#-database-setup-dbjson) for details.

---

## ▶️ Running the Application

### Option 1: Run Both Frontend & API (Recommended)

```bash
npm run start:all
```

This starts:
- Angular dev server at `http://localhost:4200`
- JSON Server API at `http://localhost:3000`

### Option 2: Run Separately

**Terminal 1 - Start the API:**
```bash
npm run api
```

**Terminal 2 - Start Angular:**
```bash
npm start
# or
ng serve
```

### Access the Application

| Service | URL |
|---------|-----|
| **Application** | http://localhost:4200 |
| **API Server** | http://localhost:3000 |
| **API - Vendors** | http://localhost:3000/vendors |
| **API - Purchases** | http://localhost:3000/purchases |
| **API - Items** | http://localhost:3000/items |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── core/                          # Core module (singleton services)
│   │   ├── models/                    # TypeScript interfaces
│   │   │   ├── insights/
│   │   │   ├── purchase/
│   │   │   ├── scorecard/
│   │   │   └── vendor/
│   │   └── services/                  # Application services
│   │       ├── ai-chat/               # AI chat assistant
│   │       ├── ai-risk-analysis/      # Gemini AI risk scoring
│   │       ├── analytics/             # Analytics calculations
│   │       ├── api/                   # HTTP client & data types
│   │       ├── document-scanner/      # OCR processing
│   │       ├── loading/               # Loading state management
│   │       ├── theme/                 # Dark/light theme service
│   │       └── upload/                # File upload handling
│   │
│   ├── pages/                         # Feature components (pages)
│   │   ├── add-purchase/              # Create/edit purchase orders
│   │   ├── add-vendor/                # Create/edit vendors
│   │   ├── dashboard/                 # Main dashboard with metrics
│   │   ├── document-scanner/          # OCR document processing
│   │   ├── insights/                  # Analytics & insights
│   │   ├── login/                     # Authentication page
│   │   ├── purchase/                  # Purchase order list
│   │   ├── risk-analysis/             # AI risk analysis
│   │   ├── upload/                    # CSV/file upload
│   │   ├── vender-list/               # Vendor listing
│   │   └── vendor-profile/            # Vendor detail view
│   │
│   ├── shared/                        # Shared module
│   │   ├── components/                # Reusable components
│   │   │   ├── chart-widget/
│   │   │   ├── footer/
│   │   │   ├── layout/
│   │   │   ├── master-data/
│   │   │   ├── navbar/
│   │   │   ├── score-card/
│   │   │   ├── sidebar/
│   │   │   └── vendor-table/
│   │   ├── pipes/                     # Custom pipes
│   │   └── utils/                     # Utility functions
│   │
│   ├── assets/                        # Static assets
│   │   └── sample-csv/                # Demo CSV files
│   │
│   ├── app.component.*                # Root component
│   ├── app.config.ts                  # App configuration
│   └── app.routes.ts                  # Route definitions
│
├── public/                            # Public static files
├── index.html                         # Main HTML file
├── main.ts                            # Application entry point
└── styles.css                         # Global styles
```

---

## 📡 API Documentation

The application uses JSON Server as a RESTful API. All endpoints follow REST conventions.

### Base URL
```
http://localhost:3000
```

### Endpoints

| Resource | Endpoint | Methods |
|----------|----------|---------|
| Vendors | `/vendors` | GET, POST, PUT, DELETE |
| Purchases | `/purchases` | GET, POST, PUT, DELETE |
| Items | `/items` | GET, POST, PUT, DELETE |
| Vendor Items | `/vendorItems` | GET, POST, PUT, DELETE |
| Risk Analysis | `/riskanalysis` | GET, POST, PUT, DELETE |

### Example Requests

**Get all vendors:**
```bash
curl http://localhost:3000/vendors
```

**Get vendor by ID:**
```bash
curl http://localhost:3000/vendors/V001
```

**Create new vendor:**
```bash
curl -X POST http://localhost:3000/vendors \
  -H "Content-Type: application/json" \
  -d '{"vendorName": "New Vendor", "status": "active"}'
```

**Filter vendors:**
```bash
# Active vendors only
curl "http://localhost:3000/vendors?status=active"

# Vendors with rating >= 4
curl "http://localhost:3000/vendors?rating_gte=4"
```

---

## 💾 Database Setup (db.json)

The `db.json` file serves as the application's database. It must be placed in the project root directory.

### Schema Overview

```json
{
  "vendors": [...],      // Vendor master data
  "purchases": [...],    // Purchase orders
  "items": [...],        // Product/item catalog
  "vendorItems": [...],  // Vendor-item relationships (pricing)
  "riskanalysis": [...]  // AI risk assessment results
}
```

For detailed entity schemas, see [docs/DATABASE.md](docs/DATABASE.md).

### Creating a Fresh db.json

If you need to create a new `db.json` file:

```bash
# Create minimal db.json structure
cat > db.json << 'EOF'
{
  "vendors": [],
  "purchases": [],
  "items": [],
  "vendorItems": [],
  "riskanalysis": []
}
EOF
```

Or copy from the backup:
```bash
cp db-backup.json db.json
```

---

## ⚙️ Environment Configuration

### Development Mode
The application runs in development mode by default with:
- Hot module replacement
- Source maps
- Debug logging

### Production Build
```bash
ng build --configuration production
```

Build artifacts are stored in the `dist/` directory.

---

## 🧪 Testing

### Unit Tests
```bash
npm test
# or
ng test
```

### Code Coverage
```bash
ng test --code-coverage
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 🆘 Troubleshooting

### Common Issues

**1. Port already in use:**
```bash
# Kill process on port 4200
lsof -ti:4200 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**2. JSON Server not starting:**
```bash
npm uninstall json-server
npm install json-server@1.0.0
