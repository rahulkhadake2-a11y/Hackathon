import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import {
  ApiService,
  Vendor,
  Purchase,
  Item,
  VendorItem,
  RiskAnalysis,
} from '../../core/services/api/api.service';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private apiService = inject(ApiService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  // Loading state
  isLoading = true;

  // Audit Modal
  showAuditModal = false;
  showAuditHelp = false;
  pendingAuditsList: RiskAnalysis[] = [];
  selectedAudit: RiskAnalysis | null = null;

  // Raw data from API
  vendors: Vendor[] = [];
  purchases: Purchase[] = [];
  items: Item[] = [];
  vendorItems: VendorItem[] = [];
  riskAnalysis: RiskAnalysis[] = [];

  // Dashboard data - Computed from real data

  // Total Expenses (sum of all purchase totals)
  totalExpenses = 0;
  expenseChange = 0;
  expenseChangePositive = true;

  // Performance Score (average quality rating from purchases)
  performanceScore = 0;
  performanceChange = 0;
  performanceChangePositive = true;

  // Total Products Received (sum of quantities from delivered purchases)
  totalProductsReceived = 0;
  productsReceivedChange = 0;
  productsReceivedChangePositive = true;

  // Total Products Accepted (received minus returned)
  totalProductsAccepted = 0;
  productsAcceptedChange = 0;
  productsAcceptedChangePositive = true;
  acceptanceRate = 0;

  // Suppliers
  aClassSuppliers = 0;
  totalSuppliers = 0;
  aClassPercentage = 0;

  // Accounts Payable (sum of pending/partial payment purchases)
  accountsPayable = 0;
  pendingInvoices = 0;
  payableChange = 0;
  payableChangePositive = false;

  // Supplier Audits
  pendingAudits = 0;
  completedAudits = 0;
  totalAudits = 0;
  auditCompletionRate = 0;
  nextAuditDate = 'Not scheduled';

  // New Vendors (created this month)
  newVendorsThisMonth = 0;
  newProductsThisMonth = 0;
  vendorGrowthChange = 0;
  vendorGrowthPositive = true;

  // Green Channel Products (high quality with on-time delivery)
  greenChannelProducts = 0;
  totalChannelProducts = 0;
  greenChannelPercentage = 0;
  greenChannelChange = 0;
  greenChannelChangePositive = true;

  // Animation intervals
  private animationIntervals: any[] = [];

  ngOnInit() {
    this.loadDashboardData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.animationIntervals.forEach((interval) => clearInterval(interval));
  }

  loadDashboardData() {
    this.isLoading = true;

    // Load all required data
    forkJoin({
      vendors: this.apiService.getVendors(),
      purchases: this.apiService.getPurchases(),
      items: this.apiService.getItems(),
      vendorItems: this.apiService.getVendorItems(),
      riskAnalysis: this.apiService.getRiskAnalysisList(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.vendors = data.vendors;
          this.purchases = data.purchases;
          this.items = data.items;
          this.vendorItems = data.vendorItems;
          this.riskAnalysis = data.riskAnalysis;

          this.calculateDashboardMetrics();
          this.isLoading = false;
          this.startRealTimeAnimations();
        },
        error: (err) => {
          console.error('Failed to load dashboard data:', err);
          this.isLoading = false;
        },
      });
  }

  calculateDashboardMetrics() {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    // Filter purchases by month
    const thisMonthPurchases = this.purchases.filter((p) => {
      const date = new Date(p.orderDate);
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    });

    const lastMonthPurchases = this.purchases.filter((p) => {
      const date = new Date(p.orderDate);
      return (
        date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear
      );
    });

    // ==================== TOTAL EXPENSES ====================
    this.totalExpenses = this.purchases.reduce(
      (sum, p) => sum + (p.totalAmount || 0),
      0
    );
    const lastMonthExpenses = lastMonthPurchases.reduce(
      (sum, p) => sum + (p.totalAmount || 0),
      0
    );
    const thisMonthExpenses = thisMonthPurchases.reduce(
      (sum, p) => sum + (p.totalAmount || 0),
      0
    );

    if (lastMonthExpenses > 0) {
      this.expenseChange = Math.abs(
        ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
      );
      this.expenseChangePositive = thisMonthExpenses < lastMonthExpenses; // Lower is better for expenses
    }

    // ==================== PERFORMANCE SCORE ====================
    const deliveredPurchases = this.purchases.filter(
      (p) => p.status === 'delivered'
    );
    const ratedPurchases = deliveredPurchases.filter(
      (p) => p.qualityRating != null
    );

    if (ratedPurchases.length > 0) {
      const avgQualityRating =
        ratedPurchases.reduce((sum, p) => sum + (p.qualityRating || 0), 0) /
        ratedPurchases.length;
      this.performanceScore = (avgQualityRating / 5) * 100; // Convert 1-5 scale to percentage
    }

    const onTimeCount = deliveredPurchases.filter(
      (p) => p.onTimeDelivery === true
    ).length;
    const onTimeRate =
      deliveredPurchases.length > 0
        ? (onTimeCount / deliveredPurchases.length) * 100
        : 0;

    // Weighted performance: 60% quality + 40% on-time delivery
    this.performanceScore = this.performanceScore * 0.6 + onTimeRate * 0.4;
    this.performanceChange = 5.2; // Mock improvement for now
    this.performanceChangePositive = true;

    // ==================== PRODUCTS RECEIVED & ACCEPTED ====================
    this.totalProductsReceived = deliveredPurchases.reduce((sum, p) => {
      return (
        sum + p.items.reduce((itemSum, item) => itemSum + item.quantity, 0)
      );
    }, 0);

    const totalReturned = deliveredPurchases.reduce(
      (sum, p) => sum + (p.returnedItems || 0),
      0
    );
    this.totalProductsAccepted = this.totalProductsReceived - totalReturned;

    if (this.totalProductsReceived > 0) {
      this.acceptanceRate =
        (this.totalProductsAccepted / this.totalProductsReceived) * 100;
    }

    // Calculate change vs last month
    const lastMonthDelivered = lastMonthPurchases.filter(
      (p) => p.status === 'delivered'
    );
    const lastMonthReceived = lastMonthDelivered.reduce((sum, p) => {
      return (
        sum + p.items.reduce((itemSum, item) => itemSum + item.quantity, 0)
      );
    }, 0);

    if (lastMonthReceived > 0) {
      const thisMonthDelivered = thisMonthPurchases.filter(
        (p) => p.status === 'delivered'
      );
      const thisMonthReceivedQty = thisMonthDelivered.reduce((sum, p) => {
        return (
          sum + p.items.reduce((itemSum, item) => itemSum + item.quantity, 0)
        );
      }, 0);
      this.productsReceivedChange =
        ((thisMonthReceivedQty - lastMonthReceived) / lastMonthReceived) * 100;
      this.productsReceivedChangePositive = this.productsReceivedChange >= 0;
    }

    // ==================== SUPPLIERS ====================
    this.totalSuppliers = this.vendors.length;
    const activeVendors = this.vendors.filter((v) => v.status === 'active');

    // A-Class suppliers: Rating >= 4 OR totalPurchases >= average * 1.5
    const avgPurchases =
      this.vendors.reduce((sum, v) => sum + v.totalPurchases, 0) /
      this.vendors.length;
    this.aClassSuppliers = this.vendors.filter(
      (v) => v.rating >= 4 || v.totalPurchases >= avgPurchases * 1.5
    ).length;

    if (this.totalSuppliers > 0) {
      this.aClassPercentage =
        (this.aClassSuppliers / this.totalSuppliers) * 100;
    }

    // ==================== ACCOUNTS PAYABLE ====================
    const pendingPayments = this.purchases.filter(
      (p) =>
        p.paymentStatus === 'pending' ||
        p.paymentStatus === 'partial' ||
        p.paymentStatus === 'overdue'
    );
    this.accountsPayable = pendingPayments.reduce(
      (sum, p) => sum + (p.totalAmount || 0),
      0
    );
    this.pendingInvoices = pendingPayments.length;

    const overdueCount = this.purchases.filter(
      (p) => p.paymentStatus === 'overdue'
    ).length;
    this.payableChange =
      pendingPayments.length > 0
        ? (overdueCount / pendingPayments.length) * 100
        : 0;

    // ==================== AUDITS ====================
    // Based on risk analysis data
    this.totalAudits = this.riskAnalysis.length;
    this.completedAudits = this.riskAnalysis.filter((r) => {
      const assessmentDate = new Date(r.lastAssessmentDate);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return assessmentDate >= threeMonthsAgo;
    }).length;
    this.pendingAudits = this.totalAudits - this.completedAudits;

    if (this.totalAudits > 0) {
      this.auditCompletionRate =
        (this.completedAudits / this.totalAudits) * 100;
    }

    // Find the next upcoming audit date
    const upcomingAudits = this.riskAnalysis
      .filter((r) => new Date(r.nextReviewDate) >= now)
      .sort(
        (a, b) =>
          new Date(a.nextReviewDate).getTime() -
          new Date(b.nextReviewDate).getTime()
      );

    if (upcomingAudits.length > 0) {
      const nextDate = new Date(upcomingAudits[0].nextReviewDate);
      this.nextAuditDate = nextDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }

    // ==================== NEW VENDORS ====================
    const newVendors = this.vendors.filter((v) => {
      if (!v.createdAt) return false;
      const date = new Date(v.createdAt);
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    });
    this.newVendorsThisMonth = newVendors.length;

    // New products from vendor items
    const newVendorItems = this.vendorItems.filter((vi) => {
      if (!vi.createdAt) return false;
      const date = new Date(vi.createdAt);
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    });
    this.newProductsThisMonth = newVendorItems.length || this.items.length;

    // Vendor growth calculation
    const lastMonthVendors = this.vendors.filter((v) => {
      if (!v.createdAt) return false;
      const date = new Date(v.createdAt);
      return (
        date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear
      );
    }).length;

    if (lastMonthVendors > 0) {
      this.vendorGrowthChange =
        ((this.newVendorsThisMonth - lastMonthVendors) / lastMonthVendors) *
        100;
    } else {
      this.vendorGrowthChange = this.newVendorsThisMonth > 0 ? 100 : 0;
    }
    this.vendorGrowthPositive = this.vendorGrowthChange >= 0;

    // ==================== GREEN CHANNEL PRODUCTS ====================
    // Green channel = high quality (4-5 rating) + on-time delivery + no compliance issues
    const greenChannelPurchases = deliveredPurchases.filter(
      (p) =>
        (p.qualityRating || 0) >= 4 &&
        p.onTimeDelivery === true &&
        (!p.complianceIssues || p.complianceIssues.length === 0)
    );

    this.greenChannelProducts = greenChannelPurchases.reduce((sum, p) => {
      return (
        sum + p.items.reduce((itemSum, item) => itemSum + item.quantity, 0)
      );
    }, 0);

    this.totalChannelProducts = this.totalProductsReceived;

    if (this.totalChannelProducts > 0) {
      this.greenChannelPercentage =
        (this.greenChannelProducts / this.totalChannelProducts) * 100;
    }

    this.greenChannelChange = 6.8; // Mock for now
    this.greenChannelChangePositive = true;
  }

  startRealTimeAnimations() {
    // Performance score slight fluctuation
    const performanceInterval = setInterval(() => {
      const fluctuation = (Math.random() - 0.5) * 0.4;
      this.performanceScore = Math.min(
        100,
        Math.max(0, this.performanceScore + fluctuation)
      );
    }, 3000);
    this.animationIntervals.push(performanceInterval);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(Math.round(value));
  }

  // Audit Modal Methods
  openAuditModal(): void {
    // Get pending audits (assessments older than 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    this.pendingAuditsList = this.riskAnalysis.filter((r) => {
      const assessmentDate = new Date(r.lastAssessmentDate);
      return assessmentDate < threeMonthsAgo;
    });

    this.showAuditModal = true;
    this.selectedAudit = null;
  }

  closeAuditModal(): void {
    this.showAuditModal = false;
    this.selectedAudit = null;
  }

  toggleAuditHelp(): void {
    this.showAuditHelp = !this.showAuditHelp;
  }

  selectAudit(audit: RiskAnalysis): void {
    this.selectedAudit = audit;
  }

  navigateToVendorRisk(vendorId: string | undefined): void {
    if (vendorId) {
      this.closeAuditModal();
      this.router.navigate(['/vendor', vendorId], {
        queryParams: { tab: 'compliance' },
      });
    }
  }

  getRiskLevelClass(level: string): string {
    switch (level?.toLowerCase()) {
      case 'low':
        return 'risk-low';
      case 'medium':
        return 'risk-medium';
      case 'high':
        return 'risk-high';
      case 'critical':
        return 'risk-critical';
      default:
        return '';
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  getDaysSinceAssessment(dateString: string): number {
    if (!dateString) return 0;
    const assessmentDate = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - assessmentDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
