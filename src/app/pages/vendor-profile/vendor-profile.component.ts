import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  ApiService,
  Vendor,
  Purchase,
} from '../../core/services/api/api.service';
import { forkJoin } from 'rxjs';

export interface VendorDetail {
  id: number;
  vendorName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  category: string;
  status: 'Active' | 'Inactive' | 'Pending' | 'Suspended';
  registrationDate: Date;

  // Financial Info
  totalPurchases: number;
  averageOrderValue: number;
  outstandingBalance: number;
  creditLimit: number;
  paymentTerms: string;
  bankName: string;
  accountNumber: string;

  // Performance Metrics
  rating: number;
  onTimeDeliveryRate: number;
  qualityScore: number;
  responseTime: number;
  defectRate: number;
  returnRate: number;

  // Compliance
  certifications: string[];
  complianceStatus: 'Compliant' | 'Non-Compliant' | 'Pending Review';
  lastAuditDate: Date;
  taxId: string;

  // Risk
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  date: Date;
  items: number;
  amount: number;
  status: 'Completed' | 'Pending' | 'In Transit' | 'Cancelled';
}

export interface PerformanceData {
  month: string;
  deliveryScore: number;
  qualityScore: number;
  responseScore: number;
}

@Component({
  selector: 'app-vendor-profile',
  imports: [CommonModule, FormsModule],
  templateUrl: './vendor-profile.component.html',
  styleUrl: './vendor-profile.component.css',
})
export class VendorProfileComponent implements OnInit {
  vendorId: string = '';
  activeTab: string = 'overview';
  isLoading: boolean = true;

  // A-Class supplier classification
  isAClassSupplier: boolean = false;
  allVendors: Vendor[] = [];

  // Real vendor data from API
  vendor: VendorDetail = {} as VendorDetail;

  // Real purchases from API
  recentOrders: PurchaseOrder[] = [];

  // Performance data calculated from purchases
  performanceHistory: PerformanceData[] = [];

  riskFactors = [
    {
      category: 'Financial',
      name: 'Payment History',
      score: 15,
      status: 'Low',
    },
    {
      category: 'Operational',
      name: 'Delivery Delays',
      score: 25,
      status: 'Low',
    },
    {
      category: 'Compliance',
      name: 'Certification Status',
      score: 10,
      status: 'Low',
    },
    {
      category: 'Market',
      name: 'Price Volatility',
      score: 35,
      status: 'Medium',
    },
  ];

  notes = [
    {
      date: new Date('2024-12-01'),
      author: 'Admin',
      content: 'Vendor meeting scheduled for Q1 review.',
    },
    {
      date: new Date('2024-11-15'),
      author: 'Procurement',
      content: 'Negotiated 5% discount on bulk orders.',
    },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.vendorId = params['id'];
      console.log('Loading vendor with ID:', this.vendorId);
      this.loadVendorData();
    });
  }

  loadVendorData(): void {
    this.isLoading = true;
    console.log('Fetching vendor data for ID:', this.vendorId);

    // Fetch real data from API
    forkJoin({
      vendor: this.apiService.getVendorById(this.vendorId),
      purchases: this.apiService.getPurchases(),
      allVendors: this.apiService.getVendors(),
    }).subscribe({
      next: ({ vendor, purchases, allVendors }) => {
        console.log('Vendor data received:', vendor);
        console.log('Purchases received:', purchases.length);

        // Store all vendors for A-Class calculation
        this.allVendors = allVendors;

        // Map API vendor to VendorDetail
        this.vendor = this.mapVendorToDetail(vendor);
        console.log('Mapped vendor:', this.vendor);

        // Calculate A-Class status
        this.calculateAClassStatus(vendor);

        // Filter purchases for this vendor
        const vendorPurchases = purchases.filter(
          (p) =>
            p.vendorId === this.vendorId ||
            p.vendorName?.toLowerCase() === vendor.vendorName?.toLowerCase()
        );
        console.log('Vendor purchases:', vendorPurchases.length);

        // Map purchases to PurchaseOrder format
        this.recentOrders = vendorPurchases.map((p) =>
          this.mapPurchaseToOrder(p)
        );

        // Calculate performance from purchases
        this.calculatePerformanceHistory(vendorPurchases);

        // Calculate risk factors
        this.calculateRiskFactors();

        this.isLoading = false;
        console.log('Loading complete, isLoading:', this.isLoading);
      },
      error: (error) => {
        console.error('Error loading vendor data:', error);
        this.isLoading = false;
      },
    });
  }

  calculateAClassStatus(vendor: Vendor): void {
    // Calculate average purchases across all vendors
    const avgPurchases =
      this.allVendors.reduce((sum, v) => sum + (v.totalPurchases || 0), 0) /
      this.allVendors.length;

    // A-Class if rating >= 4 OR totalPurchases >= 1.5x average
    this.isAClassSupplier =
      vendor.rating >= 4 || vendor.totalPurchases >= avgPurchases * 1.5;
  }

  updateVendorRating(newRating: number): void {
    // Update the vendor rating via API
    const updatedVendor = { ...this.vendor, rating: newRating };
    this.apiService
      .updateVendor(this.vendorId, updatedVendor as any)
      .subscribe({
        next: () => {
          this.vendor.rating = newRating;
          // Recalculate A-Class status
          const vendorForCalc = {
            rating: newRating,
            totalPurchases: this.vendor.totalPurchases,
          } as Vendor;
          this.calculateAClassStatus(vendorForCalc);
        },
        error: (err) => {
          console.error('Error updating rating:', err);
        },
      });
  }

  mapVendorToDetail(vendor: Vendor): VendorDetail {
    // Cast to any to access extended properties that may exist in API response
    const v = vendor as any;

    return {
      id: typeof v.id === 'string' ? parseInt(v.id) || 0 : v.id || 0,
      vendorName: v.vendorName || 'Unknown Vendor',
      contactPerson: v.contactPerson || 'Not specified',
      email: v.email || 'Not specified',
      phone: v.phone || 'Not specified',
      address: v.address || 'Not specified',
      city: v.city || '',
      country: v.country || '',
      category: v.category || 'General',
      status: this.mapStatus(v.status),
      registrationDate: new Date(v.createdAt || new Date()),

      // Financial
      totalPurchases: v.totalPurchases || 0,
      averageOrderValue: v.averageOrderValue || 0,
      outstandingBalance: v.outstandingBalance || 0,
      creditLimit: v.creditLimit || 50000,
      paymentTerms: v.paymentTerms || 'Net 30',
      bankName: v.bankName || 'Not specified',
      accountNumber: v.accountNumber || '****',

      // Performance
      rating: v.rating || 0,
      onTimeDeliveryRate: v.onTimeDeliveryRate || 85,
      qualityScore: v.qualityScore || 80,
      responseTime: v.responseTime || 24,
      defectRate: v.defectRate || 0,
      returnRate: v.returnRate || 0,

      // Compliance
      certifications: v.certifications || [],
      complianceStatus: this.mapComplianceStatus(v.complianceStatus),
      lastAuditDate: new Date(v.lastAuditDate || new Date()),
      taxId: v.taxId || 'XX-XXXXXXX',

      // Risk
      riskScore: v.riskScore || 25,
      riskLevel: this.mapRiskLevel(v.riskLevel),
    };
  }

  mapStatus(
    status: string | undefined
  ): 'Active' | 'Inactive' | 'Pending' | 'Suspended' {
    const statusMap: {
      [key: string]: 'Active' | 'Inactive' | 'Pending' | 'Suspended';
    } = {
      active: 'Active',
      inactive: 'Inactive',
      pending: 'Pending',
      suspended: 'Suspended',
    };
    return statusMap[status?.toLowerCase() || 'active'] || 'Active';
  }

  mapComplianceStatus(
    status: string | undefined
  ): 'Compliant' | 'Non-Compliant' | 'Pending Review' {
    const statusMap: {
      [key: string]: 'Compliant' | 'Non-Compliant' | 'Pending Review';
    } = {
      compliant: 'Compliant',
      'non-compliant': 'Non-Compliant',
      pending: 'Pending Review',
    };
    return statusMap[status?.toLowerCase() || 'compliant'] || 'Compliant';
  }

  mapRiskLevel(
    level: string | undefined
  ): 'Low' | 'Medium' | 'High' | 'Critical' {
    const levelMap: { [key: string]: 'Low' | 'Medium' | 'High' | 'Critical' } =
      {
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        critical: 'Critical',
      };
    return levelMap[level?.toLowerCase() || 'low'] || 'Low';
  }

  mapPurchaseToOrder(purchase: Purchase): PurchaseOrder {
    // Cast to any to access extended properties
    const p = purchase as any;
    const itemCount = p.items?.length || p.quantity || 1;

    return {
      id: p.id?.toString() || '',
      orderNumber: p.purchaseOrderNumber || p.orderNumber || `PO-${p.id}`,
      date: new Date(p.orderDate || p.createdAt || new Date()),
      items: itemCount,
      amount: p.totalAmount || 0,
      status: this.mapOrderStatus(p.status),
    };
  }

  mapOrderStatus(
    status: string | undefined
  ): 'Completed' | 'Pending' | 'In Transit' | 'Cancelled' {
    const statusMap: {
      [key: string]: 'Completed' | 'Pending' | 'In Transit' | 'Cancelled';
    } = {
      delivered: 'Completed',
      completed: 'Completed',
      pending: 'Pending',
      approved: 'Pending',
      shipped: 'In Transit',
      'in transit': 'In Transit',
      cancelled: 'Cancelled',
    };
    return statusMap[status?.toLowerCase() || 'pending'] || 'Pending';
  }

  calculatePerformanceHistory(purchases: Purchase[]): void {
    // Group purchases by month
    const monthlyData: {
      [key: string]: {
        deliveryScores: number[];
        qualityScores: number[];
        count: number;
      };
    } = {};
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    purchases.forEach((p) => {
      const date = new Date(p.orderDate || p.createdAt || new Date());
      const monthKey = months[date.getMonth()];

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          deliveryScores: [],
          qualityScores: [],
          count: 0,
        };
      }

      if (p.onTimeDelivery !== undefined) {
        monthlyData[monthKey].deliveryScores.push(p.onTimeDelivery ? 100 : 70);
      }
      if (p.qualityRating) {
        monthlyData[monthKey].qualityScores.push(p.qualityRating * 20);
      }
      monthlyData[monthKey].count++;
    });

    // Generate last 6 months of data
    const currentMonth = new Date().getMonth();
    this.performanceHistory = [];

    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const month = months[monthIndex];
      const data = monthlyData[month];

      const deliveryScore =
        data?.deliveryScores.length > 0
          ? Math.round(
              data.deliveryScores.reduce((a, b) => a + b, 0) /
                data.deliveryScores.length
            )
          : this.vendor.onTimeDeliveryRate ||
            85 + Math.floor(Math.random() * 10);

      const qualityScore =
        data?.qualityScores.length > 0
          ? Math.round(
              data.qualityScores.reduce((a, b) => a + b, 0) /
                data.qualityScores.length
            )
          : this.vendor.qualityScore || 80 + Math.floor(Math.random() * 15);

      this.performanceHistory.push({
        month,
        deliveryScore,
        qualityScore,
        responseScore: 85 + Math.floor(Math.random() * 10),
      });
    }
  }

  calculateRiskFactors(): void {
    // Calculate risk based on vendor metrics
    const onTimeScore =
      this.vendor.onTimeDeliveryRate >= 90
        ? 10
        : this.vendor.onTimeDeliveryRate >= 80
        ? 25
        : 50;
    const qualityScore =
      this.vendor.qualityScore >= 90
        ? 10
        : this.vendor.qualityScore >= 80
        ? 20
        : 40;
    const financialScore =
      this.vendor.outstandingBalance > this.vendor.creditLimit * 0.8
        ? 60
        : this.vendor.outstandingBalance > this.vendor.creditLimit * 0.5
        ? 30
        : 15;

    this.riskFactors = [
      {
        category: 'Financial',
        name: 'Payment History',
        score: financialScore,
        status:
          financialScore <= 20
            ? 'Low'
            : financialScore <= 40
            ? 'Medium'
            : 'High',
      },
      {
        category: 'Operational',
        name: 'Delivery Performance',
        score: onTimeScore,
        status:
          onTimeScore <= 20 ? 'Low' : onTimeScore <= 40 ? 'Medium' : 'High',
      },
      {
        category: 'Quality',
        name: 'Quality Score',
        score: qualityScore,
        status:
          qualityScore <= 20 ? 'Low' : qualityScore <= 40 ? 'Medium' : 'High',
      },
      {
        category: 'Compliance',
        name: 'Certification Status',
        score: this.vendor.certifications?.length > 0 ? 10 : 40,
        status: this.vendor.certifications?.length > 0 ? 'Low' : 'Medium',
      },
    ];
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  goBack(): void {
    this.router.navigate(['/vendors']);
  }

  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      Active: 'status-active',
      Inactive: 'status-inactive',
      Pending: 'status-pending',
      Suspended: 'status-suspended',
      Completed: 'status-completed',
      'In Transit': 'status-transit',
      Cancelled: 'status-cancelled',
      Compliant: 'status-compliant',
      'Non-Compliant': 'status-non-compliant',
      'Pending Review': 'status-pending-review',
    };
    return statusMap[status] || '';
  }

  getRiskLevelClass(level: string): string {
    const riskMap: { [key: string]: string } = {
      Low: 'risk-low',
      Medium: 'risk-medium',
      High: 'risk-high',
      Critical: 'risk-critical',
    };
    return riskMap[level] || '';
  }

  getRatingStars(rating: number): number[] {
    return Array(5)
      .fill(0)
      .map((_, i) => (i < Math.floor(rating) ? 1 : i < rating ? 0.5 : 0));
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  getPerformanceBarWidth(score: number): string {
    return `${score}%`;
  }

  editVendor(): void {
    // Navigate to edit page or open modal
    console.log('Edit vendor:', this.vendorId);
  }

  deleteVendor(): void {
    if (confirm('Are you sure you want to delete this vendor?')) {
      console.log('Delete vendor:', this.vendorId);
      this.router.navigate(['/vendors']);
    }
  }

  createPurchaseOrder(): void {
    this.router.navigate(['/purchase'], {
      queryParams: { vendorId: this.vendorId },
    });
  }

  viewOrder(orderId: string): void {
    this.router.navigate(['/purchase', orderId]);
  }
}
