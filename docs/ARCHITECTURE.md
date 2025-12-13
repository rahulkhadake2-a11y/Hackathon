# 🏗️ Architecture Documentation

This document provides a detailed overview of the Vendor Risk Management application's architecture, design patterns, and technical decisions.

## 📋 Table of Contents

- [System Overview](#system-overview)
- [High-Level Architecture](#high-level-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Service Layer](#service-layer)
- [Data Flow](#data-flow)
- [Component Hierarchy](#component-hierarchy)
- [State Management](#state-management)
- [Routing](#routing)
- [AI Integration](#ai-integration)
- [Security Considerations](#security-considerations)
- [Performance Optimizations](#performance-optimizations)

---

## System Overview

The Vendor Risk Management Platform is a Single Page Application (SPA) built with Angular 19, designed for enterprise procurement and vendor management workflows.

### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend Framework | Angular 19 | Enterprise-grade, TypeScript-first, comprehensive ecosystem |
| State Management | RxJS + Services | Simpler than NgRx for this scale, reactive patterns |
| API | JSON Server | Rapid prototyping, easy to replace with real backend |
| Styling | Bootstrap 5 | Responsive, well-documented, enterprise-friendly |
| AI Integration | Google Gemini | Advanced LLM capabilities for risk analysis |
| OCR | Tesseract.js | Client-side document processing |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT BROWSER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                        ANGULAR APPLICATION                              │ │
│  │                                                                         │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │ │
│  │  │   Pages     │  │   Shared    │  │    Core     │  │   Assets    │   │ │
│  │  │ Components  │  │ Components  │  │  Services   │  │   (Static)  │   │ │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────────────┘   │ │
│  │         │                │                │                            │ │
│  │         └────────────────┴────────────────┘                            │ │
│  │                          │                                              │ │
│  │                          ▼                                              │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │                      Angular Router                              │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
└────────────────────────────────────┼─────────────────────────────────────────┘
                                     │ HTTP/HTTPS
                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SERVICES                                 │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │   JSON Server   │  │  Google Gemini  │  │     Tesseract.js (WASM)     │ │
│  │   (REST API)    │  │   (AI/ML API)   │  │   (Client-side OCR)         │ │
│  │                 │  │                 │  │                             │ │
│  │  localhost:3000 │  │ generativelang  │  │   Browser WebAssembly      │ │
│  │                 │  │ uage.googleapis │  │                             │ │
│  │   ┌─────────┐   │  │ .com            │  │                             │ │
│  │   │ db.json │   │  │                 │  │                             │ │
│  │   └─────────┘   │  │                 │  │                             │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Module Structure (Standalone Components)

Angular 19 uses standalone components by default. The application follows this pattern:

```
src/app/
├── app.component.ts          # Root component (standalone)
├── app.config.ts             # Application configuration
├── app.routes.ts             # Route definitions
│
├── core/                     # Singleton services & models
│   ├── models/               # TypeScript interfaces
│   └── services/             # Injectable services
│
├── pages/                    # Route-level components
│   ├── dashboard/
│   ├── vendors/
│   ├── purchases/
│   └── ...
│
└── shared/                   # Reusable components
    ├── components/
    ├── pipes/
    └── utils/
```

### Component Design Principles

1. **Smart vs Dumb Components**
   - **Smart Components** (Pages): Handle data fetching, business logic
   - **Dumb Components** (Shared): Pure presentation, receive data via @Input

2. **Standalone Components**
   - All components are standalone (no NgModules)
   - Imports are explicit in each component

3. **Change Detection**
   - Using OnPush where possible for performance
   - Reactive patterns with async pipe

---

## Service Layer

### Core Services Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       SERVICES LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     API SERVICE                           │   │
│  │  ─────────────────────────────────────────────────────    │   │
│  │  • HTTP Client wrapper                                    │   │
│  │  • CRUD operations for all entities                       │   │
│  │  • Error handling & retries                               │   │
│  │  • Type-safe responses                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│         ┌────────────────────┼────────────────────┐              │
│         ▼                    ▼                    ▼              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐        │
│  │  AI Risk    │     │  Document   │     │  Analytics  │        │
│  │  Analysis   │     │  Scanner    │     │  Service    │        │
│  │  Service    │     │  Service    │     │             │        │
│  └─────────────┘     └─────────────┘     └─────────────┘        │
│         │                    │                    │              │
│         ▼                    ▼                    ▼              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐        │
│  │  Gemini AI  │     │ Tesseract   │     │  Local      │        │
│  │  API        │     │ WASM        │     │  Compute    │        │
│  └─────────────┘     └─────────────┘     └─────────────┘        │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   UTILITY SERVICES                        │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │   │
│  │  │ Loading  │  │  Theme   │  │  Upload  │  │ AI Chat  │  │   │
│  │  │ Service  │  │ Service  │  │ Service  │  │ Service  │  │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Service Descriptions

| Service | Location | Purpose |
|---------|----------|---------|
| `ApiService` | `core/services/api/` | Central HTTP client, all CRUD operations |
| `AIRiskAnalysisService` | `core/services/ai-risk-analysis/` | Gemini AI integration for risk scoring |
| `DocumentScannerService` | `core/services/document-scanner/` | OCR processing with Tesseract.js |
| `AnalyticsService` | `core/services/analytics/` | Dashboard metrics calculation |
| `ThemeService` | `core/services/theme/` | Dark/light mode management |
| `LoadingService` | `core/services/loading/` | Global loading state |
| `UploadService` | `core/services/upload/` | File upload handling |
| `AIChatService` | `core/services/ai-chat/` | Chat-based AI assistant |

### API Service Pattern

```typescript
@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'http://localhost:3000';
  
  // Vendors
  getVendors(): Observable<Vendor[]>
  getVendor(id: string): Observable<Vendor>
  createVendor(vendor: Vendor): Observable<Vendor>
  updateVendor(id: string, vendor: Vendor): Observable<Vendor>
  deleteVendor(id: string): Observable<void>
  
  // Similar pattern for Purchases, Items, VendorItems, RiskAnalysis
}
```

---

## Data Flow

### Unidirectional Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │────▶│  Component  │────▶│   Service   │
│   Action    │     │   Method    │     │   Method    │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Updated   │◀────│  Component  │◀────│  Observable │
│   View      │     │  Subscribes │     │  Response   │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Example: Loading Vendor Data

```typescript
// Component
ngOnInit() {
  this.apiService.getVendors()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (vendors) => this.vendors = vendors,
      error: (err) => this.handleError(err)
    });
}
```

### Real-time Updates Pattern

For dashboard metrics with live updates:

```typescript
// Interval-based refresh
interval(30000).pipe(
  switchMap(() => this.apiService.getVendors()),
  takeUntil(this.destroy$)
).subscribe(vendors => this.updateMetrics(vendors));
```

---

## Component Hierarchy

### Layout Structure

```
AppComponent
└── Router Outlet
    ├── LoginComponent (standalone route)
    │
    └── LayoutComponent (wrapper for authenticated routes)
        ├── NavbarComponent
        ├── SidebarComponent
        ├── Router Outlet (nested)
        │   ├── DashboardComponent
        │   │   └── ScoreCardComponent (×8)
        │   │
        │   ├── VenderListComponent
        │   │   └── VendorTableComponent
        │   │
        │   ├── VendorProfileComponent
        │   │   ├── TabsComponent
        │   │   └── ChartWidgetComponent
        │   │
        │   ├── PurchaseComponent
        │   │   └── PurchaseTableComponent
        │   │
        │   ├── AddPurchaseComponent
        │   │   └── FormComponent
        │   │
        │   ├── RiskAnalysisComponent
        │   │   └── RiskChartComponent
        │   │
        │   ├── InsightsComponent
        │   │   └── ChartWidgetComponent
        │   │
        │   ├── MasterDataComponent
        │   │   └── DataTableComponent
        │   │
        │   └── DocumentScannerComponent
        │       └── ImagePreviewComponent
        │
        └── FooterComponent
```

### Component Communication

```
┌─────────────────────────────────────────────────────────────┐
│                  PARENT COMPONENT                            │
│                                                              │
│  ┌────────────┐        ┌────────────┐        ┌────────────┐ │
│  │   @Input   │───────▶│   CHILD    │◀───────│  Service   │ │
│  │   data     │        │ COMPONENT  │        │   inject   │ │
│  └────────────┘        └────────────┘        └────────────┘ │
│                              │                               │
│                              ▼                               │
│                        ┌────────────┐                        │
│                        │  @Output   │                        │
│                        │  EventEmit │                        │
│                        └────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

---

## State Management

### Approach: Service-based State with RxJS

Instead of a full state management library (NgRx), we use:

1. **BehaviorSubjects** for shared state
2. **Services** as state containers
3. **Observables** for reactive updates

### Example: Loading State

```typescript
// loading.service.ts
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();
  
  show(): void {
    this.loadingSubject.next(true);
  }
  
  hide(): void {
    this.loadingSubject.next(false);
  }
}
```

### State Containers

| Service | State Purpose |
|---------|---------------|
| `LoadingService` | Global loading indicator |
| `ThemeService` | Dark/light mode preference |
| `ApiService` | Cached API responses (optional) |

---

## Routing

### Route Configuration

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'vendors', component: VenderListComponent },
      { path: 'vendor/new', component: AddVendorComponent },
      { path: 'vendor/:id', component: VendorProfileComponent },
      { path: 'vendor/:id/edit', component: AddVendorComponent },
      { path: 'purchase', component: PurchaseComponent },
      { path: 'purchase/new', component: AddPurchaseComponent },
      { path: 'purchase/:id', component: AddPurchaseComponent },
      { path: 'purchase/:id/edit', component: AddPurchaseComponent },
      { path: 'aianalysis', component: RiskAnalysisComponent },
      { path: 'insights', component: InsightsComponent },
      { path: 'master-data', component: MasterDataComponent },
      { path: 'document-scanner', component: DocumentScannerComponent },
      { path: 'upload', component: UploadComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  
  { path: '**', redirectTo: 'login' },
];
```

### Route Guards (Future Enhancement)

```typescript
// auth.guard.ts (example for future implementation)
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (authService.isAuthenticated()) {
    return true;
  }
  
  return router.parseUrl('/login');
};
```

---

## AI Integration

### Gemini AI Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI RISK ANALYSIS FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │   Vendor    │    │  Purchase   │    │  Historical │          │
│  │    Data     │    │   History   │    │    Trends   │          │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘          │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   DATA AGGREGATION                           │ │
│  │  • Calculate quality scores                                  │ │
│  │  • Compute delivery metrics                                  │ │
│  │  • Analyze payment history                                   │ │
│  │  • Gather compliance data                                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   PROMPT ENGINEERING                         │ │
│  │  • System message (role definition)                          │ │
│  │  • Structured data context                                   │ │
│  │  • Scoring guidelines                                        │ │
│  │  • Output format specification                               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   GEMINI API CALL                            │ │
│  │  POST https://generativelanguage.googleapis.com/v1beta/      │ │
│  │       models/gemini-1.5-flash:generateContent                │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                  RESPONSE PROCESSING                         │ │
│  │  • Parse JSON response                                       │ │
│  │  • Validate score ranges                                     │ │
│  │  • Apply business rules                                      │ │
│  │  • Calculate risk level                                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   RESULT STORAGE                             │ │
│  │  • Save to riskanalysis collection                           │ │
│  │  • Update vendor riskScore                                   │ │
│  │  • Trigger UI update                                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Risk Score Calculation

```typescript
// Risk score validation and calculation
validateRiskScore(score: number, vendorData: VendorData): number {
  // Ensure score is within valid range
  score = Math.max(0, Math.min(100, score));
  
  // Cross-validate with actual metrics
  const expectedRange = this.calculateExpectedRange(vendorData);
  
  if (score < expectedRange.min || score > expectedRange.max) {
    // Recalculate based on actual data
    score = this.calculateFromMetrics(vendorData);
  }
  
  return score;
}
```

---

## Security Considerations

### Current Implementation

| Aspect | Status | Notes |
|--------|--------|-------|
| Authentication | Demo only | Login page without real auth |
| API Security | None | JSON Server is local only |
| HTTPS | Development | Not configured for dev |
| API Keys | Hardcoded | Should use env vars in prod |

### Production Recommendations

1. **Authentication**: Implement OAuth 2.0 / OpenID Connect
2. **API Security**: Use JWT tokens, CORS policies
3. **API Keys**: Use environment variables or Azure Key Vault
4. **Input Validation**: Sanitize all user inputs
5. **XSS Protection**: Angular handles this by default

### API Key Security (Current Issue)

```typescript
// ⚠️ Current (insecure for production)
private readonly GEMINI_API_KEY = 'your-api-key';

// ✅ Recommended for production
private readonly GEMINI_API_KEY = environment.geminiApiKey;
// Store in environment.ts (gitignored) or use backend proxy
```

---

## Performance Optimizations

### Implemented

1. **OnPush Change Detection**
   ```typescript
   @Component({
     changeDetection: ChangeDetectionStrategy.OnPush
   })
   ```

2. **Lazy Loading** (can be added)
   ```typescript
   { path: 'vendors', loadComponent: () => 
       import('./pages/vender-list/vender-list.component')
         .then(m => m.VenderListComponent) }
   ```

3. **TrackBy Functions**
   ```html
   <tr *ngFor="let vendor of vendors; trackBy: trackByVendorId">
   ```

4. **Unsubscribe Pattern**
   ```typescript
   private destroy$ = new Subject<void>();
   
   ngOnDestroy() {
     this.destroy$.next();
     this.destroy$.complete();
   }
   ```

### Bundle Optimization

```bash
# Production build with optimizations
ng build --configuration production
```

This enables:
- Tree shaking
- Minification
- Ahead-of-Time (AOT) compilation
- Dead code elimination

---

## Deployment Architecture

### Development

```
Developer Machine
├── Angular CLI (ng serve) → localhost:4200
└── JSON Server (npm run api) → localhost:3000
```

### Production (Recommended)

```
┌─────────────────────────────────────────────────────────────┐
│                        CDN / Edge                            │
│                    (Static Assets)                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Web Server (Nginx)                         │
│                 (Angular dist files)                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway                                │
│              (Authentication, Rate Limiting)                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend API                                │
│            (Node.js/Express, .NET, Java, etc.)               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database                                   │
│            (PostgreSQL, MongoDB, SQL Server)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Future Enhancements

1. **Real Authentication** - Implement proper auth with guards
2. **Real Backend** - Replace JSON Server with actual API
3. **State Management** - Consider NgRx for complex state
4. **Testing** - Increase unit and e2e test coverage
5. **PWA** - Add service worker for offline capability
6. **i18n** - Add internationalization support
7. **Accessibility** - WCAG 2.1 compliance audit

---

**Last Updated:** December 2025
