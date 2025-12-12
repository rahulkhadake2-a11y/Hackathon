import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, forkJoin, of } from 'rxjs';
import { catchError, map, tap, switchMap } from 'rxjs/operators';

// ==================== INTERFACES ====================
export interface Vendor {
  id?: string;
  vendorName: string;
  contactPerson: string;
  email: string;
  phone: string;
  category: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  address?: string;
  city?: string;
  country?: string;
  taxId?: string;
  paymentTerms?: string;
  creditLimit?: number;
  totalPurchases: number;
  rating: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PurchaseItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Purchase {
  id?: string;
  vendorId: string;
  vendorName?: string;
  purchaseOrderNumber: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  status: 'pending' | 'approved' | 'shipped' | 'delivered' | 'cancelled';
  items: PurchaseItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  notes?: string;
  createdAt?: string;
  createdBy?: string;
  urgent?: boolean;

  // Risk-related fields for analysis
  onTimeDelivery?: boolean; // Was delivery on time?
  deliveryDelayDays?: number; // Days delayed (if late)
  qualityRating?: number; // 1-5 rating for quality (used to calculate Quality Score)
  paymentStatus?: 'paid' | 'pending' | 'overdue' | 'partial';
  paymentDelayDays?: number; // Days payment was delayed
  leadTime?: number; // Days from order to delivery
  communicationRating?: number; // 1-5 rating for vendor communication
  complianceIssues?: string[]; // Any compliance issues found
}

export interface RiskFactor {
  name: string;
  score: number;
  weight: number;
  description: string;
}

export interface RiskAnalysis {
  id?: string;
  vendorId: string;
  vendorName?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  overallScore: number;
  financialRisk: number;
  operationalRisk: number;
  complianceRisk: number;
  reputationRisk: number;
  riskFactors: RiskFactor[];
  lastAssessmentDate: string;
  nextReviewDate: string;
  recommendations: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardStats {
  totalVendors: number;
  activeVendors: number;
  totalPurchases: number;
  totalSpend: number;
  highRiskVendors: number;
  pendingOrders: number;
}

// ==================== MASTER DATA INTERFACES ====================
export interface Item {
  id?: string;
  itemCode: string;
  itemName: string;
  description?: string;
  category: string;
  unit: string; // e.g., 'piece', 'kg', 'liter', 'box'
  defaultPrice?: number;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface VendorItem {
  id?: string;
  vendorId: string;
  itemId: string;
  vendorName?: string;
  itemName?: string;
  itemCode?: string;
  unitPrice: number;
  minOrderQuantity?: number;
  leadTimeDays?: number;
  isPreferred?: boolean;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  // JSON Server running locally - start with: npx json-server db.json --port 3000
  // This provides a real REST API with full CRUD operations and data persistence
  private readonly BASE_URL = 'http://localhost:3000';

  // BehaviorSubjects for real-time updates (local cache)
  private vendorsSubject = new BehaviorSubject<Vendor[]>([]);
  private purchasesSubject = new BehaviorSubject<Purchase[]>([]);
  private riskAnalysisSubject = new BehaviorSubject<RiskAnalysis[]>([]);
  private itemsSubject = new BehaviorSubject<Item[]>([]);
  private vendorItemsSubject = new BehaviorSubject<VendorItem[]>([]);

  // Public observables
  public vendors$ = this.vendorsSubject.asObservable();
  public purchases$ = this.purchasesSubject.asObservable();
  public riskAnalysis$ = this.riskAnalysisSubject.asObservable();
  public items$ = this.itemsSubject.asObservable();
  public vendorItems$ = this.vendorItemsSubject.asObservable();

  constructor(private http: HttpClient) {
    // Initial data load from API
    this.refreshAllData();
  }

  // ==================== DATA REFRESH ====================
  refreshAllData(): void {
    this.refreshVendors();
    this.refreshPurchases();
    this.refreshRiskAnalysis();
    this.refreshItems();
    this.refreshVendorItems();
  }

  private refreshVendors(): void {
    this.http
      .get<Vendor[]>(`${this.BASE_URL}/vendors`)
      .pipe(catchError(() => of([])))
      .subscribe((vendors) => this.vendorsSubject.next(vendors));
  }

  private refreshPurchases(): void {
    this.http
      .get<Purchase[]>(`${this.BASE_URL}/purchases`)
      .pipe(catchError(() => of([])))
      .subscribe((purchases) => this.purchasesSubject.next(purchases));
  }

  private refreshRiskAnalysis(): void {
    this.http
      .get<RiskAnalysis[]>(`${this.BASE_URL}/riskanalysis`)
      .pipe(catchError(() => of([])))
      .subscribe((risks) => this.riskAnalysisSubject.next(risks));
  }

  private refreshItems(): void {
    this.http
      .get<Item[]>(`${this.BASE_URL}/items`)
      .pipe(catchError(() => of([])))
      .subscribe((items) => this.itemsSubject.next(items));
  }

  private refreshVendorItems(): void {
    this.http
      .get<VendorItem[]>(`${this.BASE_URL}/vendorItems`)
      .pipe(catchError(() => of([])))
      .subscribe((vendorItems) => this.vendorItemsSubject.next(vendorItems));
  }

  // ==================== VENDORS ====================
  getVendors(): Observable<Vendor[]> {
    return this.http.get<Vendor[]>(`${this.BASE_URL}/vendors`).pipe(
      tap((vendors) => this.vendorsSubject.next(vendors)),
      catchError(this.handleError)
    );
  }

  getVendorById(id: string | number): Observable<Vendor> {
    return this.http
      .get<Vendor>(`${this.BASE_URL}/vendors/${id}`)
      .pipe(catchError(this.handleError));
  }

  createVendor(vendor: Partial<Vendor>): Observable<Vendor> {
    const newVendor: Partial<Vendor> = {
      ...vendor,
      totalPurchases: vendor.totalPurchases || 0,
      rating: vendor.rating || 0,
      status: vendor.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.http.post<Vendor>(`${this.BASE_URL}/vendors`, newVendor).pipe(
      tap((created) => {
        // Ensure status is set (in case server doesn't return it)
        const createdWithDefaults: Vendor = {
          ...created,
          status: created.status || 'active',
          totalPurchases: created.totalPurchases || 0,
          rating: created.rating || 0,
        };
        // Auto-generate risk analysis for new vendor
        this.generateRiskAnalysis(createdWithDefaults).subscribe();
        // Update local cache
        const current = this.vendorsSubject.getValue();
        this.vendorsSubject.next([...current, createdWithDefaults]);
      }),
      catchError(this.handleError)
    );
  }

  updateVendor(
    id: string | number,
    vendor: Partial<Vendor>
  ): Observable<Vendor> {
    const updatedVendor = {
      ...vendor,
      updatedAt: new Date().toISOString(),
    };

    // Use PATCH instead of PUT to only update provided fields (not replace entire resource)
    return this.http
      .patch<Vendor>(`${this.BASE_URL}/vendors/${id}`, updatedVendor)
      .pipe(
        tap((updated) => {
          const current = this.vendorsSubject.getValue();
          const index = current.findIndex((v) => v.id === id.toString());
          if (index !== -1) {
            current[index] = updated;
            this.vendorsSubject.next([...current]);
          }
        }),
        catchError(this.handleError)
      );
  }

  deleteVendor(id: string | number): Observable<Vendor> {
    return this.http.delete<Vendor>(`${this.BASE_URL}/vendors/${id}`).pipe(
      tap(() => {
        const current = this.vendorsSubject.getValue();
        this.vendorsSubject.next(current.filter((v) => v.id !== id.toString()));
        // Also delete associated risk analysis
        this.deleteRiskAnalysisByVendorId(id.toString()).subscribe();
      }),
      catchError(this.handleError)
    );
  }

  // ==================== PURCHASES ====================
  getPurchases(): Observable<Purchase[]> {
    return this.http.get<Purchase[]>(`${this.BASE_URL}/purchases`).pipe(
      tap((purchases) => this.purchasesSubject.next(purchases)),
      catchError(this.handleError)
    );
  }

  getPurchaseById(id: string | number): Observable<Purchase> {
    return this.http
      .get<Purchase>(`${this.BASE_URL}/purchases/${id}`)
      .pipe(catchError(this.handleError));
  }

  getPurchasesByVendorId(vendorId: string | number): Observable<Purchase[]> {
    return this.http
      .get<Purchase[]>(`${this.BASE_URL}/purchases?vendorId=${vendorId}`)
      .pipe(catchError(this.handleError));
  }

  createPurchase(purchase: Partial<Purchase>): Observable<Purchase> {
    const newPurchase: Partial<Purchase> = {
      ...purchase,
      createdAt: new Date().toISOString(),
    };

    return this.http
      .post<Purchase>(`${this.BASE_URL}/purchases`, newPurchase)
      .pipe(
        tap((created) => {
          const current = this.purchasesSubject.getValue();
          this.purchasesSubject.next([...current, created]);
          // Update vendor's total purchases
          if (purchase.vendorId) {
            this.updateVendorTotalPurchases(purchase.vendorId);
          }
        }),
        catchError(this.handleError)
      );
  }

  updatePurchase(
    id: string | number,
    purchase: Partial<Purchase>
  ): Observable<Purchase> {
    return this.http
      .put<Purchase>(`${this.BASE_URL}/purchases/${id}`, purchase)
      .pipe(
        tap((updated) => {
          const current = this.purchasesSubject.getValue();
          const index = current.findIndex((p) => p.id === id.toString());
          if (index !== -1) {
            current[index] = updated;
            this.purchasesSubject.next([...current]);
          }
        }),
        catchError(this.handleError)
      );
  }

  deletePurchase(id: string | number): Observable<Purchase> {
    return this.http.delete<Purchase>(`${this.BASE_URL}/purchases/${id}`).pipe(
      tap(() => {
        const current = this.purchasesSubject.getValue();
        this.purchasesSubject.next(
          current.filter((p) => p.id !== id.toString())
        );
      }),
      catchError(this.handleError)
    );
  }

  private updateVendorTotalPurchases(vendorId: string): void {
    this.getPurchasesByVendorId(vendorId)
      .pipe(
        switchMap((purchases) => {
          const total = purchases.reduce(
            (sum, p) => sum + (p.totalAmount || 0),
            0
          );
          return this.updateVendor(vendorId, { totalPurchases: total });
        })
      )
      .subscribe();
  }

  // ==================== RISK ANALYSIS ====================
  getRiskAnalysisList(): Observable<RiskAnalysis[]> {
    return this.http.get<RiskAnalysis[]>(`${this.BASE_URL}/riskanalysis`).pipe(
      tap((risks) => this.riskAnalysisSubject.next(risks)),
      catchError(this.handleError)
    );
  }

  getRiskAnalysisById(id: string | number): Observable<RiskAnalysis> {
    return this.http
      .get<RiskAnalysis>(`${this.BASE_URL}/riskanalysis/${id}`)
      .pipe(catchError(this.handleError));
  }

  getRiskAnalysisByVendorId(
    vendorId: string | number
  ): Observable<RiskAnalysis | undefined> {
    return this.http
      .get<RiskAnalysis[]>(`${this.BASE_URL}/riskanalysis?vendorId=${vendorId}`)
      .pipe(
        map((risks) => (risks.length > 0 ? risks[0] : undefined)),
        catchError(this.handleError)
      );
  }

  createRiskAnalysis(
    riskData: Partial<RiskAnalysis>
  ): Observable<RiskAnalysis> {
    const newRisk: Partial<RiskAnalysis> = {
      ...riskData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.http
      .post<RiskAnalysis>(`${this.BASE_URL}/riskanalysis`, newRisk)
      .pipe(
        tap((created) => {
          const current = this.riskAnalysisSubject.getValue();
          this.riskAnalysisSubject.next([...current, created]);
        }),
        catchError(this.handleError)
      );
  }

  updateRiskAnalysis(
    id: string | number,
    riskData: Partial<RiskAnalysis>
  ): Observable<RiskAnalysis> {
    const updated = {
      ...riskData,
      updatedAt: new Date().toISOString(),
    };

    return this.http
      .put<RiskAnalysis>(`${this.BASE_URL}/riskanalysis/${id}`, updated)
      .pipe(
        tap((updatedRisk) => {
          const current = this.riskAnalysisSubject.getValue();
          const index = current.findIndex((r) => r.id === id.toString());
          if (index !== -1) {
            current[index] = updatedRisk;
            this.riskAnalysisSubject.next([...current]);
          }
        }),
        catchError(this.handleError)
      );
  }

  deleteRiskAnalysisByVendorId(
    vendorId: string
  ): Observable<RiskAnalysis | undefined> {
    return this.getRiskAnalysisByVendorId(vendorId).pipe(
      switchMap((risk) => {
        if (risk && risk.id) {
          return this.http
            .delete<RiskAnalysis>(`${this.BASE_URL}/riskanalysis/${risk.id}`)
            .pipe(
              tap(() => {
                const current = this.riskAnalysisSubject.getValue();
                this.riskAnalysisSubject.next(
                  current.filter((r) => r.vendorId !== vendorId)
                );
              })
            );
        }
        return of(undefined);
      }),
      catchError(this.handleError)
    );
  }

  // Auto-generate risk analysis when vendor is created
  private generateRiskAnalysis(vendor: Vendor): Observable<RiskAnalysis> {
    // Generate random but realistic risk scores
    const financialRisk = Math.floor(Math.random() * 40) + 10; // 10-50
    const operationalRisk = Math.floor(Math.random() * 40) + 10;
    const complianceRisk = Math.floor(Math.random() * 40) + 10;
    const reputationRisk = Math.floor(Math.random() * 40) + 10;
    const overallScore = Math.round(
      (financialRisk + operationalRisk + complianceRisk + reputationRisk) / 4
    );

    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (overallScore <= 25) riskLevel = 'low';
    else if (overallScore <= 50) riskLevel = 'medium';
    else if (overallScore <= 75) riskLevel = 'high';
    else riskLevel = 'critical';

    const riskData: Partial<RiskAnalysis> = {
      vendorId: vendor.id!,
      vendorName: vendor.vendorName,
      riskLevel,
      overallScore,
      financialRisk,
      operationalRisk,
      complianceRisk,
      reputationRisk,
      riskFactors: [
        {
          name: 'Payment History',
          score: financialRisk,
          weight: 0.3,
          description: 'Based on past payment behavior',
        },
        {
          name: 'Delivery Performance',
          score: operationalRisk,
          weight: 0.25,
          description: 'On-time delivery rate',
        },
        {
          name: 'Regulatory Compliance',
          score: complianceRisk,
          weight: 0.25,
          description: 'Adherence to regulations',
        },
        {
          name: 'Market Reputation',
          score: reputationRisk,
          weight: 0.2,
          description: 'Industry standing',
        },
      ],
      lastAssessmentDate: new Date().toISOString(),
      nextReviewDate: new Date(
        Date.now() + 90 * 24 * 60 * 60 * 1000
      ).toISOString(), // 90 days from now
      recommendations: this.generateRecommendations(riskLevel),
    };

    return this.createRiskAnalysis(riskData);
  }

  private generateRecommendations(riskLevel: string): string[] {
    const recommendations: { [key: string]: string[] } = {
      low: [
        'Continue regular monitoring',
        'Consider for preferred vendor status',
      ],
      medium: [
        'Schedule quarterly reviews',
        'Request updated financial statements',
        'Monitor delivery metrics',
      ],
      high: [
        'Increase monitoring frequency',
        'Request performance improvement plan',
        'Consider backup vendors',
      ],
      critical: [
        'Immediate management review required',
        'Develop contingency plan',
        'Consider vendor replacement',
      ],
    };
    return recommendations[riskLevel] || recommendations['medium'];
  }

  // ==================== DASHBOARD ====================
  getDashboardStats(): Observable<DashboardStats> {
    return forkJoin({
      vendors: this.getVendors(),
      purchases: this.getPurchases(),
      risks: this.getRiskAnalysisList(),
    }).pipe(
      map(({ vendors, purchases, risks }) => {
        const totalSpend = purchases.reduce(
          (sum, p) => sum + (p.totalAmount || 0),
          0
        );
        const highRiskVendors = risks.filter(
          (r) => r.riskLevel === 'high' || r.riskLevel === 'critical'
        ).length;
        const pendingOrders = purchases.filter(
          (p) => p.status === 'pending'
        ).length;

        return {
          totalVendors: vendors.length,
          activeVendors: vendors.filter((v) => v.status === 'active').length,
          totalPurchases: purchases.length,
          totalSpend,
          highRiskVendors,
          pendingOrders,
        };
      }),
      catchError(this.handleError)
    );
  }

  // ==================== UTILITIES ====================
  getVendorOptions(): Observable<{ id: string; name: string }[]> {
    return this.getVendors().pipe(
      map((vendors) => vendors.map((v) => ({ id: v.id!, name: v.vendorName })))
    );
  }

  getVendorsWithRisk(): Observable<
    (Vendor & { riskAnalysis?: RiskAnalysis })[]
  > {
    return forkJoin({
      vendors: this.getVendors(),
      risks: this.getRiskAnalysisList(),
    }).pipe(
      map(({ vendors, risks }) => {
        return vendors.map((vendor) => {
          const riskAnalysis = risks.find((r) => r.vendorId === vendor.id);
          // Ensure vendor has all required fields with defaults
          return {
            ...vendor,
            status: vendor.status || 'active',
            totalPurchases: vendor.totalPurchases || 0,
            rating: vendor.rating || 0,
            riskAnalysis,
          };
        });
      })
    );
  }

  // ==================== VENDOR RISK METRICS FROM PURCHASES ====================
  /**
   * Calculate vendor risk metrics based on their purchase history
   * This is used by the Risk Analysis component
   */
  getVendorRiskMetrics(vendorId: string): Observable<{
    onTimeDeliveryRate: number;
    qualityScore: number;
    avgLeadTime: number;
    avgPaymentDelay: number;
    avgCommunicationRating: number;
    totalPurchases: number;
    deliveredOrders: number;
  }> {
    return this.getPurchasesByVendorId(vendorId).pipe(
      map((purchases) => {
        const deliveredPurchases = purchases.filter(
          (p) => p.status === 'delivered'
        );
        const totalDelivered = deliveredPurchases.length;

        if (totalDelivered === 0) {
          return {
            onTimeDeliveryRate: 100,
            qualityScore: 100,
            avgLeadTime: 0,
            avgPaymentDelay: 0,
            avgCommunicationRating: 5,
            totalPurchases: purchases.length,
            deliveredOrders: 0,
          };
        }

        // Calculate on-time delivery rate - handle missing field
        const onTimeCount = deliveredPurchases.filter((p) => {
          if (p.onTimeDelivery !== undefined) {
            return p.onTimeDelivery === true;
          }
          // Fallback: compare actual vs expected delivery date
          if (p.actualDeliveryDate && p.expectedDeliveryDate) {
            return (
              new Date(p.actualDeliveryDate) <= new Date(p.expectedDeliveryDate)
            );
          }
          return true; // Assume on-time if no data
        }).length;
        const onTimeDeliveryRate = (onTimeCount / totalDelivered) * 100;

        // Calculate average quality score (1-5 scale, convert to 0-100)
        // Quality Score is now based solely on customer rating (simplified)
        const qualityRatings = deliveredPurchases
          .filter((p) => p.qualityRating != null)
          .map((p) => {
            const rating = p.qualityRating;
            return typeof rating === 'string' ? parseFloat(rating) : rating!;
          })
          .filter((r) => !isNaN(r));
        const avgQuality =
          qualityRatings.length > 0
            ? qualityRatings.reduce((sum, r) => sum + r, 0) /
              qualityRatings.length
            : 4;
        
        // Quality Score = (Average Rating / 5) * 100
        const qualityScore = Math.round((avgQuality / 5) * 100);

        // Calculate average lead time - handle string values
        const leadTimes = deliveredPurchases
          .filter((p) => p.leadTime != null)
          .map((p) => {
            const lt = p.leadTime;
            return typeof lt === 'string' ? parseFloat(lt) : lt!;
          })
          .filter((l) => !isNaN(l));
        const avgLeadTime =
          leadTimes.length > 0
            ? leadTimes.reduce((sum, l) => sum + l, 0) / leadTimes.length
            : 14;

        // Calculate average payment delay - handle string values
        const paymentDelays = deliveredPurchases
          .filter((p) => p.paymentDelayDays != null)
          .map((p) => {
            const pd = p.paymentDelayDays;
            return typeof pd === 'string' ? parseFloat(pd) : pd!;
          })
          .filter((d) => !isNaN(d));
        const avgPaymentDelay =
          paymentDelays.length > 0
            ? paymentDelays.reduce((sum, d) => sum + d, 0) /
              paymentDelays.length
            : 0;

        // Calculate average communication rating - handle string values
        const commRatings = deliveredPurchases
          .filter((p) => p.communicationRating != null)
          .map((p) => {
            const cr = p.communicationRating;
            return typeof cr === 'string' ? parseFloat(cr) : cr!;
          })
          .filter((r) => !isNaN(r));
        const avgCommunicationRating =
          commRatings.length > 0
            ? commRatings.reduce((sum, r) => sum + r, 0) / commRatings.length
            : 4;

        return {
          onTimeDeliveryRate: Math.round(onTimeDeliveryRate * 10) / 10,
          qualityScore: Math.round(qualityScore * 10) / 10,
          avgLeadTime: Math.round(avgLeadTime * 10) / 10,
          avgPaymentDelay: Math.round(avgPaymentDelay * 10) / 10,
          avgCommunicationRating: Math.round(avgCommunicationRating * 10) / 10,
          totalPurchases: purchases.length,
          deliveredOrders: totalDelivered,
        };
      })
    );
  }

  /**
   * Get all vendors with calculated risk metrics from purchases
   */
  getVendorsWithPurchaseMetrics(): Observable<any[]> {
    return forkJoin({
      vendors: this.getVendors(),
      purchases: this.getPurchases(),
    }).pipe(
      map(({ vendors, purchases }) => {
        return vendors.map((vendor) => {
          // Filter purchases by vendorId OR vendorName (fallback for legacy data)
          const vendorPurchases = purchases.filter(
            (p) =>
              p.vendorId === vendor.id ||
              (p.vendorId === null && p.vendorName === vendor.vendorName)
          );
          const deliveredPurchases = vendorPurchases.filter(
            (p) => p.status === 'delivered'
          );
          const totalDelivered = deliveredPurchases.length;

          // Calculate metrics
          let onTimeDeliveryRate = 100;
          let qualityScore = 100;
          let responseTime = 12; // Default hours

          if (totalDelivered > 0) {
            // Calculate on-time delivery rate
            // Check onTimeDelivery field, or calculate from dates if not present
            const onTimeCount = deliveredPurchases.filter((p) => {
              if (p.onTimeDelivery !== undefined) {
                return p.onTimeDelivery === true;
              }
              // Fallback: compare actual vs expected delivery date
              if (p.actualDeliveryDate && p.expectedDeliveryDate) {
                return (
                  new Date(p.actualDeliveryDate) <=
                  new Date(p.expectedDeliveryDate)
                );
              }
              return true; // Assume on-time if no data
            }).length;
            onTimeDeliveryRate = (onTimeCount / totalDelivered) * 100;

            // Calculate quality score - convert string to number if needed
            // Quality Score is now based solely on customer rating (simplified)
            const qualityRatings = deliveredPurchases
              .filter((p) => p.qualityRating != null)
              .map((p) => {
                const rating = p.qualityRating;
                return typeof rating === 'string'
                  ? parseFloat(rating)
                  : rating!;
              })
              .filter((r) => !isNaN(r));
            const avgQuality =
              qualityRatings.length > 0
                ? qualityRatings.reduce((sum, r) => sum + r, 0) /
                  qualityRatings.length
                : 4;
            
            // Quality Score = (Average Rating / 5) * 100
            qualityScore = Math.round((avgQuality / 5) * 100);

            // Calculate response time from lead time (approximate)
            const leadTimes = deliveredPurchases
              .filter((p) => p.leadTime != null)
              .map((p) => {
                const lt = p.leadTime;
                return typeof lt === 'string' ? parseFloat(lt) : lt!;
              })
              .filter((l) => !isNaN(l));
            if (leadTimes.length > 0) {
              const avgLeadTime =
                leadTimes.reduce((sum, l) => sum + l, 0) / leadTimes.length;
              responseTime = avgLeadTime * 2; // Approximate hours based on lead time days
            }
          }

          // Calculate total purchases amount
          const totalPurchasesAmount = vendorPurchases.reduce(
            (sum, p) => sum + (p.totalAmount || 0),
            0
          );
          const averageOrderValue =
            vendorPurchases.length > 0
              ? totalPurchasesAmount / vendorPurchases.length
              : 0;

          return {
            id: vendor.id,
            name: vendor.vendorName,
            email: vendor.email,
            phone: vendor.phone,
            address: vendor.address
              ? `${vendor.address}, ${vendor.city || ''}, ${
                  vendor.country || ''
                }`
              : undefined,
            category: vendor.category || 'General',
            status: vendor.status || 'active',
            createdAt: vendor.createdAt
              ? new Date(vendor.createdAt)
              : new Date(),
            updatedAt: vendor.updatedAt
              ? new Date(vendor.updatedAt)
              : new Date(),
            totalPurchases: totalPurchasesAmount,
            averageOrderValue: Math.round(averageOrderValue),
            paymentTerms: this.parsePaymentTerms(vendor.paymentTerms),
            creditLimit: vendor.creditLimit || 50000,
            outstandingBalance: Math.round(totalPurchasesAmount * 0.2), // Estimate
            onTimeDeliveryRate: Math.round(onTimeDeliveryRate),
            qualityScore: Math.round(qualityScore),
            responseTime: Math.round(responseTime),
            certifications: ['ISO 9001'], // Default
            complianceStatus:
              vendor.status === 'active' ? 'compliant' : 'pending-review',
            lastAuditDate: new Date(),
            // Include purchase-derived metrics for AI analysis
            purchaseCount: vendorPurchases.length,
            deliveredCount: totalDelivered,
            rating: vendor.rating || 0,
          };
        });
      })
    );
  }

  private parsePaymentTerms(terms: string | undefined): number {
    if (!terms) return 30;
    const match = terms.match(/\d+/);
    return match ? parseInt(match[0], 10) : 30;
  }

  // ==================== ITEMS (Master Data) ====================
  getItems(): Observable<Item[]> {
    return this.http.get<Item[]>(`${this.BASE_URL}/items`).pipe(
      tap((items) => this.itemsSubject.next(items)),
      catchError(this.handleError)
    );
  }

  getItemById(id: string): Observable<Item> {
    return this.http
      .get<Item>(`${this.BASE_URL}/items/${id}`)
      .pipe(catchError(this.handleError));
  }

  createItem(item: Partial<Item>): Observable<Item> {
    const newItem: Partial<Item> = {
      ...item,
      itemCode: item.itemCode || this.generateItemCode(),
      status: item.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.http.post<Item>(`${this.BASE_URL}/items`, newItem).pipe(
      tap((created) => {
        const current = this.itemsSubject.getValue();
        this.itemsSubject.next([...current, created]);
      }),
      catchError(this.handleError)
    );
  }

  updateItem(id: string, item: Partial<Item>): Observable<Item> {
    const updatedItem = {
      ...item,
      updatedAt: new Date().toISOString(),
    };

    return this.http
      .patch<Item>(`${this.BASE_URL}/items/${id}`, updatedItem)
      .pipe(
        tap((updated) => {
          const current = this.itemsSubject.getValue();
          const index = current.findIndex((i) => i.id === id);
          if (index !== -1) {
            current[index] = updated;
            this.itemsSubject.next([...current]);
          }
        }),
        catchError(this.handleError)
      );
  }

  deleteItem(id: string): Observable<void> {
    return this.http.delete<void>(`${this.BASE_URL}/items/${id}`).pipe(
      tap(() => {
        const current = this.itemsSubject.getValue();
        this.itemsSubject.next(current.filter((i) => i.id !== id));
        // Also delete related vendor-item mappings
        this.deleteVendorItemsByItemId(id).subscribe();
      }),
      catchError(this.handleError)
    );
  }

  private generateItemCode(): string {
    return 'ITM-' + Date.now().toString(36).toUpperCase();
  }

  // ==================== VENDOR ITEMS (Vendor-Item Mapping) ====================
  getVendorItems(): Observable<VendorItem[]> {
    return this.http.get<VendorItem[]>(`${this.BASE_URL}/vendorItems`).pipe(
      tap((vendorItems) => this.vendorItemsSubject.next(vendorItems)),
      catchError(this.handleError)
    );
  }

  getVendorItemById(id: string): Observable<VendorItem> {
    return this.http
      .get<VendorItem>(`${this.BASE_URL}/vendorItems/${id}`)
      .pipe(catchError(this.handleError));
  }

  getItemsByVendorId(vendorId: string): Observable<VendorItem[]> {
    return this.http
      .get<VendorItem[]>(`${this.BASE_URL}/vendorItems?vendorId=${vendorId}`)
      .pipe(
        map((vendorItems) =>
          vendorItems.filter((vi) => vi.status === 'active')
        ),
        catchError(this.handleError)
      );
  }

  getVendorsByItemId(itemId: string): Observable<VendorItem[]> {
    return this.http
      .get<VendorItem[]>(`${this.BASE_URL}/vendorItems?itemId=${itemId}`)
      .pipe(
        map((vendorItems) =>
          vendorItems.filter((vi) => vi.status === 'active')
        ),
        catchError(this.handleError)
      );
  }

  createVendorItem(vendorItem: Partial<VendorItem>): Observable<VendorItem> {
    const newVendorItem: Partial<VendorItem> = {
      ...vendorItem,
      status: vendorItem.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.http
      .post<VendorItem>(`${this.BASE_URL}/vendorItems`, newVendorItem)
      .pipe(
        tap((created) => {
          const current = this.vendorItemsSubject.getValue();
          this.vendorItemsSubject.next([...current, created]);
        }),
        catchError(this.handleError)
      );
  }

  updateVendorItem(
    id: string,
    vendorItem: Partial<VendorItem>
  ): Observable<VendorItem> {
    const updatedVendorItem = {
      ...vendorItem,
      updatedAt: new Date().toISOString(),
    };

    return this.http
      .patch<VendorItem>(
        `${this.BASE_URL}/vendorItems/${id}`,
        updatedVendorItem
      )
      .pipe(
        tap((updated) => {
          const current = this.vendorItemsSubject.getValue();
          const index = current.findIndex((vi) => vi.id === id);
          if (index !== -1) {
            current[index] = updated;
            this.vendorItemsSubject.next([...current]);
          }
        }),
        catchError(this.handleError)
      );
  }

  deleteVendorItem(id: string): Observable<void> {
    return this.http.delete<void>(`${this.BASE_URL}/vendorItems/${id}`).pipe(
      tap(() => {
        const current = this.vendorItemsSubject.getValue();
        this.vendorItemsSubject.next(current.filter((vi) => vi.id !== id));
      }),
      catchError(this.handleError)
    );
  }

  deleteVendorItemsByItemId(itemId: string): Observable<void> {
    return this.getVendorsByItemId(itemId).pipe(
      switchMap((vendorItems) => {
        if (vendorItems.length === 0) return of(undefined);
        const deleteOps = vendorItems.map((vi) =>
          this.http.delete(`${this.BASE_URL}/vendorItems/${vi.id}`)
        );
        return forkJoin(deleteOps);
      }),
      map(() => undefined),
      tap(() => this.refreshVendorItems()),
      catchError(this.handleError)
    );
  }

  deleteVendorItemsByVendorId(vendorId: string): Observable<void> {
    return this.getItemsByVendorId(vendorId).pipe(
      switchMap((vendorItems) => {
        if (vendorItems.length === 0) return of(undefined);
        const deleteOps = vendorItems.map((vi) =>
          this.http.delete(`${this.BASE_URL}/vendorItems/${vi.id}`)
        );
        return forkJoin(deleteOps);
      }),
      map(() => undefined),
      tap(() => this.refreshVendorItems()),
      catchError(this.handleError)
    );
  }

  // Get items with vendor details for dropdown
  getItemsForVendor(
    vendorId: string
  ): Observable<(VendorItem & { item?: Item })[]> {
    return forkJoin({
      vendorItems: this.getItemsByVendorId(vendorId),
      items: this.getItems(),
    }).pipe(
      map(({ vendorItems, items }) => {
        return vendorItems.map((vi) => ({
          ...vi,
          item: items.find((i) => i.id === vi.itemId),
        }));
      }),
      catchError(this.handleError)
    );
  }

  // ==================== ERROR HANDLING ====================
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }

    console.error('API Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
