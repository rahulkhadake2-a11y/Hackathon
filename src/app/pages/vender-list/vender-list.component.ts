import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import {
  Vendor,
  RiskAnalysis,
  Purchase,
  ApiService,
} from '../../core/services/api/api.service';

export interface TableColumn {
  field: string;
  columnLabel: string;
  isSelected: boolean;
}

// Extended vendor type with risk analysis for display
type VendorWithRisk = Vendor & {
  riskAnalysis?: RiskAnalysis;
  isAClass?: boolean;
  itemNames?: string;
  purchaseOrderCount?: number;
  auditStatus?: string;
  lastAuditDate?: string;
};

@Component({
  selector: 'app-vender-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './vender-list.component.html',
  styleUrl: './vender-list.component.css',
})
export class VenderListComponent implements OnInit, OnDestroy {
  // Subscription management
  private vendorSubscription?: Subscription;

  // Loading state
  isLoading = true;

  // Pagination
  first = 0;
  rows = 10;
  rowsPerPageOptions = [10, 25, 50, 75];

  // Filter
  showFilter = false;
  searchTerm = '';

  // Sorting
  sortField = '';
  sortOrder: 'asc' | 'desc' = 'asc';

  // Columns configuration
  availableColumns: TableColumn[] = [
    { field: 'contactPerson', columnLabel: 'Contact Person', isSelected: true },
    { field: 'email', columnLabel: 'Email', isSelected: false },
    { field: 'phone', columnLabel: 'Phone', isSelected: false },
    { field: 'category', columnLabel: 'Category', isSelected: true },
    { field: 'status', columnLabel: 'Status', isSelected: true },
    { field: 'auditStatus', columnLabel: 'Audits', isSelected: true },
    { field: 'riskLevel', columnLabel: 'Risk Level', isSelected: true },
    {
      field: 'classification',
      columnLabel: 'Classification',
      isSelected: true,
    },
    {
      field: 'totalPurchases',
      columnLabel: 'Total Purchases',
      isSelected: false,
    },
    { field: 'rating', columnLabel: 'Rating', isSelected: true },
  ];

  selectedColumns: TableColumn[] = [];

  // Vendor data from API
  allVendorList: VendorWithRisk[] = [];
  visibleVendorList: VendorWithRisk[] = [];

  private router = inject(Router);
  private apiService = inject(ApiService);

  ngOnInit() {
    this.updateSelectedFilterColumns();
    this.loadVendors();
  }

  ngOnDestroy() {
    if (this.vendorSubscription) {
      this.vendorSubscription.unsubscribe();
    }
  }

  loadVendors() {
    this.isLoading = true;

    // Load vendors with risk and purchases
    forkJoin({
      vendors: this.apiService.getVendorsWithRisk(),
      purchases: this.apiService.getPurchases(),
    }).subscribe({
      next: ({ vendors, purchases }) => {
        // Calculate A-Class classification for each vendor
        const avgPurchases =
          vendors.reduce((sum, v) => sum + (v.totalPurchases || 0), 0) /
          vendors.length;

        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        this.allVendorList = vendors.map((v) => {
          // Get purchases for this vendor
          const vendorPurchases = purchases.filter(
            (p) =>
              p.vendorId === v.id ||
              p.vendorName?.toLowerCase() === v.vendorName?.toLowerCase()
          );

          // Get item names from purchases (unique items)
          const itemNames = new Set<string>();
          vendorPurchases.forEach((p) => {
            p.items?.forEach((item) => {
              if (item.description) itemNames.add(item.description);
            });
          });

          // Calculate audit status
          let auditStatus = 'Not Assessed';
          let lastAuditDate = '';
          if (v.riskAnalysis?.lastAssessmentDate) {
            const assessmentDate = new Date(v.riskAnalysis.lastAssessmentDate);
            lastAuditDate = v.riskAnalysis.lastAssessmentDate;
            auditStatus =
              assessmentDate >= threeMonthsAgo ? 'Completed' : 'Pending';
          }

          return {
            ...v,
            isAClass: v.rating >= 4 || v.totalPurchases >= avgPurchases * 1.5,
            itemNames:
              itemNames.size > 0
                ? Array.from(itemNames).slice(0, 3).join(', ')
                : 'No items',
            purchaseOrderCount: vendorPurchases.length,
            auditStatus,
            lastAuditDate,
          };
        });
        this.updateVisibleList();
        this.isLoading = false;
      },
      error: (err: Error) => {
        console.error('Error loading vendors:', err);
        this.isLoading = false;
      },
    });
  }

  updateSelectedFilterColumns() {
    this.selectedColumns = this.availableColumns.filter(
      (col) => col.isSelected
    );
  }

  updateVisibleList() {
    let filtered = [...this.allVendorList];

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.vendorName.toLowerCase().includes(term) ||
          v.contactPerson.toLowerCase().includes(term) ||
          v.email.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    if (this.sortField) {
      filtered.sort((a: any, b: any) => {
        const valA = a[this.sortField];
        const valB = b[this.sortField];
        if (valA < valB) return this.sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return this.sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Apply pagination
    this.visibleVendorList = filtered.slice(this.first, this.first + this.rows);
  }

  handleFilterColumns(event: Event) {
    event.stopPropagation();
    this.showFilter = !this.showFilter;
  }

  selectAllFilterOnColumns() {
    this.availableColumns.forEach((col) => (col.isSelected = true));
    this.updateSelectedFilterColumns();
  }

  cancelFilterOnColumns() {
    this.showFilter = false;
  }

  onPageChange(event: any) {
    this.first = event.first;
    this.rows = event.rows;
    this.updateVisibleList();
  }

  onRowsChange() {
    this.first = 0;
    this.updateVisibleList();
  }

  sortBy(field: string) {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = 'asc';
    }
    this.updateVisibleList();
  }

  handleAddNewVendor() {
    this.router.navigate(['/vendor/new']);
  }

  handleEditVendor(id: string) {
    this.router.navigate(['/vendor', id, 'edit']);
  }

  handleViewVendor(id: string) {
    this.router.navigate(['/vendor', id]);
  }

  handleDeleteVendor(id: string) {
    if (confirm('Are you sure you want to delete this vendor?')) {
      this.apiService.deleteVendor(id).subscribe({
        next: () => {
          this.loadVendors(); // Reload the list
        },
        error: (err: Error) => {
          console.error('Error deleting vendor:', err);
        },
      });
    }
  }

  onSearch() {
    this.first = 0;
    this.updateVisibleList();
  }

  get totalPages(): number {
    return Math.ceil(this.allVendorList.length / this.rows);
  }

  get currentPage(): number {
    return Math.floor(this.first / this.rows) + 1;
  }

  goToPage(page: number) {
    this.first = (page - 1) * this.rows;
    this.updateVisibleList();
  }

  previousPage() {
    if (this.first > 0) {
      this.first -= this.rows;
      this.updateVisibleList();
    }
  }

  nextPage() {
    if (this.first + this.rows < this.allVendorList.length) {
      this.first += this.rows;
      this.updateVisibleList();
    }
  }

  getStatusClass(status: string | undefined): string {
    if (!status) return 'status-pending';
    switch (status.toLowerCase()) {
      case 'active':
        return 'status-active';
      case 'inactive':
        return 'status-inactive';
      case 'pending':
        return 'status-pending';
      case 'suspended':
        return 'status-suspended';
      default:
        return 'status-pending';
    }
  }

  getRiskClass(riskLevel?: string): string {
    if (!riskLevel) return '';
    switch (riskLevel.toLowerCase()) {
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

  // Update vendor rating
  updateRating(vendor: VendorWithRisk, newRating: number, event: Event): void {
    event.stopPropagation();
    const updatedVendor = { ...vendor, rating: newRating };
    this.apiService.updateVendor(vendor.id!, updatedVendor).subscribe({
      next: () => {
        this.loadVendors(); // Reload to recalculate A-Class
      },
      error: (err: Error) => {
        console.error('Error updating rating:', err);
      },
    });
  }

  // Get stars array for rating display
  getStarsArray(): number[] {
    return [1, 2, 3, 4, 5];
  }
}
