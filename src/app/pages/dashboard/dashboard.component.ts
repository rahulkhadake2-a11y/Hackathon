import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, OnDestroy {
  // Dashboard data - Client required metrics

  // Total Expenses
  totalExpenses = 32370.0;
  expenseChange = 0.7;
  expenseChangePositive = true;

  // Performance Score (percentage)
  performanceScore = 87;
  performanceChange = 5.2;
  performanceChangePositive = true;

  // Total Products Received till date
  totalProductsReceived = 15847;
  productsReceivedChange = 12.5;
  productsReceivedChangePositive = true;

  // Total Products Accepted till date
  totalProductsAccepted = 14923;
  productsAcceptedChange = 8.3;
  productsAcceptedChangePositive = true;
  acceptanceRate = 94.2; // percentage

  // Suppliers in 'A' Class
  aClassSuppliers = 28;
  totalSuppliers = 156;
  aClassPercentage = 17.9;

  // Accounts Payable (Pending Payments)
  accountsPayable = 125680.0;
  pendingInvoices = 47;
  payableChange = 3.2;
  payableChangePositive = false; // negative means we owe more

  // Supplier Audits (Pending)
  pendingAudits = 12;
  completedAudits = 89;
  totalAudits = 101;
  auditCompletionRate = 88.1;

  // New Vendors Onboarded (this month)
  newVendorsThisMonth = 8;
  newProductsThisMonth = 156;
  vendorGrowthChange = 14.3;
  vendorGrowthPositive = true;

  // Green Channel Products
  greenChannelProducts = 342;
  totalChannelProducts = 1250;
  greenChannelPercentage = 27.4;
  greenChannelChange = 6.8;
  greenChannelChangePositive = true;

  // Animation intervals
  private animationIntervals: any[] = [];

  ngOnInit() {
    this.startRealTimeAnimations();
  }

  ngOnDestroy() {
    // Clean up intervals
    this.animationIntervals.forEach((interval) => clearInterval(interval));
  }

  startRealTimeAnimations() {
    // Simulate real-time updates for certain values

    // Products received counter animation
    const productsInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        this.totalProductsReceived += Math.floor(Math.random() * 3) + 1;
      }
    }, 5000);
    this.animationIntervals.push(productsInterval);

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
    return new Intl.NumberFormat('en-US').format(value);
  }
}
