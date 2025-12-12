import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

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
  vendorId: number = 0;
  activeTab: string = 'overview';
  isLoading: boolean = true;

  vendor: VendorDetail = {
    id: 1,
    vendorName: 'Acme Corporation',
    contactPerson: 'John Smith',
    email: 'john.smith@acmecorp.com',
    phone: '+1 (555) 123-4567',
    address: '123 Business Park, Suite 500',
    city: 'New York',
    country: 'United States',
    category: 'Electronics & Technology',
    status: 'Active',
    registrationDate: new Date('2021-03-15'),

    // Financial
    totalPurchases: 1250000,
    averageOrderValue: 15625,
    outstandingBalance: 45000,
    creditLimit: 200000,
    paymentTerms: 'Net 30',
    bankName: 'Chase Bank',
    accountNumber: '****4567',

    // Performance
    rating: 4.5,
    onTimeDeliveryRate: 94.5,
    qualityScore: 92,
    responseTime: 2.5,
    defectRate: 1.2,
    returnRate: 0.8,

    // Compliance
    certifications: ['ISO 9001:2015', 'ISO 14001:2015', 'SOC 2 Type II'],
    complianceStatus: 'Compliant',
    lastAuditDate: new Date('2024-09-15'),
    taxId: 'XX-XXXXXXX',

    // Risk
    riskScore: 25,
    riskLevel: 'Low',
  };

  recentOrders: PurchaseOrder[] = [
    {
      id: '1',
      orderNumber: 'PO-2024-001',
      date: new Date('2024-12-01'),
      items: 15,
      amount: 25000,
      status: 'Completed',
    },
    {
      id: '2',
      orderNumber: 'PO-2024-002',
      date: new Date('2024-11-28'),
      items: 8,
      amount: 12500,
      status: 'In Transit',
    },
    {
      id: '3',
      orderNumber: 'PO-2024-003',
      date: new Date('2024-11-20'),
      items: 22,
      amount: 35000,
      status: 'Completed',
    },
    {
      id: '4',
      orderNumber: 'PO-2024-004',
      date: new Date('2024-11-15'),
      items: 5,
      amount: 8500,
      status: 'Completed',
    },
    {
      id: '5',
      orderNumber: 'PO-2024-005',
      date: new Date('2024-11-10'),
      items: 12,
      amount: 18000,
      status: 'Pending',
    },
  ];

  performanceHistory: PerformanceData[] = [
    { month: 'Jul', deliveryScore: 88, qualityScore: 90, responseScore: 85 },
    { month: 'Aug', deliveryScore: 92, qualityScore: 88, responseScore: 90 },
    { month: 'Sep', deliveryScore: 90, qualityScore: 92, responseScore: 88 },
    { month: 'Oct', deliveryScore: 94, qualityScore: 91, responseScore: 92 },
    { month: 'Nov', deliveryScore: 93, qualityScore: 93, responseScore: 91 },
    { month: 'Dec', deliveryScore: 95, qualityScore: 92, responseScore: 94 },
  ];

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

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.vendorId = +params['id'];
      this.loadVendorData();
    });
  }

  loadVendorData(): void {
    // Simulate loading
    setTimeout(() => {
      this.isLoading = false;
    }, 500);
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
