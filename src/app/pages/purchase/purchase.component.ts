import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import {
  ApiService,
  Purchase,
  Vendor,
} from '../../core/services/api/api.service';

export interface TableColumn {
  field: string;
  columnLabel: string;
  isSelected: boolean;
  canBeRemoved: boolean;
  type: 'string' | 'date' | 'number' | 'boolean';
}

export interface FilterDTO {
  searchTerm: string;
  orderDateFrom: string | null;
  orderDateTo: string | null;
  expectedDeliveryFrom: string | null;
  expectedDeliveryTo: string | null;
  vendorId: string;
  status: string;
  urgent: boolean;
  createdBy: string;
}

@Component({
  selector: 'app-purchase',
  imports: [CommonModule, FormsModule],
  templateUrl: './purchase.component.html',
  styleUrl: './purchase.component.css',
})
export class PurchaseComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Pagination
  first = 0;
  rows = 10;
  rowsPerPageOptions = [10, 25, 50];

  // Filter
  showFilter = false;
  openFilterDialog = false;

  // Selection
  selectedPurchases: Purchase[] = [];
  selectAll = false;

  // Loading state
  isLoading = false;

  // Vendors list for dropdown
  vendors: Vendor[] = [];

  // Filter DTO
  filterDTO: FilterDTO = {
    searchTerm: '',
    orderDateFrom: null,
    orderDateTo: null,
    expectedDeliveryFrom: null,
    expectedDeliveryTo: null,
    vendorId: '',
    status: '',
    urgent: false,
    createdBy: '',
  };

  // Columns configuration
  availableColumns: TableColumn[] = [
    {
      field: 'purchaseOrderNumber',
      columnLabel: 'PO Number',
      isSelected: true,
      canBeRemoved: false,
      type: 'string',
    },
    {
      field: 'vendorName',
      columnLabel: 'Vendor',
      isSelected: true,
      canBeRemoved: true,
      type: 'string',
    },
    {
      field: 'orderDate',
      columnLabel: 'Order Date',
      isSelected: true,
      canBeRemoved: true,
      type: 'date',
    },
    {
      field: 'expectedDeliveryDate',
      columnLabel: 'Expected Delivery',
      isSelected: true,
      canBeRemoved: true,
      type: 'date',
    },
    {
      field: 'status',
      columnLabel: 'Status',
      isSelected: true,
      canBeRemoved: true,
      type: 'string',
    },
    {
      field: 'totalAmount',
      columnLabel: 'Total Amount',
      isSelected: true,
      canBeRemoved: true,
      type: 'number',
    },
    {
      field: 'qualityRating',
      columnLabel: 'Quality Rating',
      isSelected: false,
      canBeRemoved: true,
      type: 'number',
    },
    {
      field: 'onTimeDelivery',
      columnLabel: 'On-Time Delivery',
      isSelected: false,
      canBeRemoved: true,
      type: 'boolean',
    },
    {
      field: 'createdBy',
      columnLabel: 'Created By',
      isSelected: false,
      canBeRemoved: true,
      type: 'string',
    },
  ];

  // Dropdown options
  statusDropdownOptions = [
    { key: 'All', value: '' },
    { key: 'Pending', value: 'pending' },
    { key: 'Approved', value: 'approved' },
    { key: 'Shipped', value: 'shipped' },
    { key: 'Delivered', value: 'delivered' },
    { key: 'Cancelled', value: 'cancelled' },
  ];

  vendorsDropdownOptions: { key: string; value: string }[] = [
    { key: 'All Vendors', value: '' },
  ];

  // All purchases from API
  allPurchases: Purchase[] = [];
  // Filtered and paginated purchases for display
  purchasesList: Purchase[] = [];

  constructor(private router: Router, private apiService: ApiService) {}

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData() {
    this.isLoading = true;

    // Load vendors for dropdown
    this.apiService
      .getVendors()
      .pipe(takeUntil(this.destroy$))
      .subscribe((vendors) => {
        this.vendors = vendors;
        this.vendorsDropdownOptions = [
          { key: 'All Vendors', value: '' },
          ...vendors.map((v) => ({ key: v.vendorName, value: v.id || '' })),
        ];
      });

    // Load purchases
    this.apiService
      .getPurchases()
      .pipe(takeUntil(this.destroy$))
      .subscribe((purchases) => {
        this.allPurchases = purchases;
        this.updateVisibleList();
        this.isLoading = false;
      });
  }

  getStatusCount(status: string): number {
    return this.allPurchases.filter((p) => p.status === status).length;
  }

  get selectedColumns(): TableColumn[] {
    return this.availableColumns.filter((col) => col.isSelected);
  }

  updateVisibleList() {
    let filtered = [...this.allPurchases];

    // Apply search filter
    if (this.filterDTO.searchTerm) {
      const term = this.filterDTO.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.purchaseOrderNumber.toLowerCase().includes(term) ||
          (p.vendorName && p.vendorName.toLowerCase().includes(term))
      );
    }

    // Apply status filter
    if (this.filterDTO.status) {
      filtered = filtered.filter((p) => p.status === this.filterDTO.status);
    }

    // Apply vendor filter
    if (this.filterDTO.vendorId) {
      filtered = filtered.filter((p) => p.vendorId === this.filterDTO.vendorId);
    }

    // Apply urgent filter
    if (this.filterDTO.urgent) {
      filtered = filtered.filter((p) => p.urgent === true);
    }

    // Sort by order date (newest first)
    filtered.sort(
      (a, b) =>
        new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
    );

    // Apply pagination
    this.purchasesList = filtered.slice(this.first, this.first + this.rows);
  }

  toggleFilter(event: Event) {
    event.stopPropagation();
    this.showFilter = !this.showFilter;
  }

  selectAllFilter() {
    this.availableColumns.forEach((col) => {
      if (col.canBeRemoved) col.isSelected = true;
    });
  }

  closeFilter() {
    this.showFilter = false;
  }

  addToSearchTerm() {
    this.first = 0;
    this.updateVisibleList();
  }

  clearSearchInput() {
    this.filterDTO.searchTerm = '';
    this.updateVisibleList();
  }

  handleNewPurchase() {
    this.router.navigate(['/purchase/new']);
  }

  handleEdit(id: string | number) {
    this.router.navigate(['/purchase', id, 'edit']);
  }

  handleView(id: string | number) {
    this.router.navigate(['/purchase', id]);
  }

  handleDeletePurchase(id: string | number) {
    if (confirm('Are you sure you want to delete this purchase order?')) {
      this.apiService
        .deletePurchase(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.allPurchases = this.allPurchases.filter(
            (p) => p.id !== id.toString()
          );
          this.updateVisibleList();
        });
    }
  }

  onSelectionChange(purchase: Purchase) {
    const index = this.selectedPurchases.findIndex((p) => p.id === purchase.id);
    if (index > -1) {
      this.selectedPurchases.splice(index, 1);
    } else {
      this.selectedPurchases.push(purchase);
    }
  }

  toggleSelectAll() {
    if (this.selectAll) {
      this.selectedPurchases = [...this.purchasesList];
    } else {
      this.selectedPurchases = [];
    }
  }

  isSelected(purchase: Purchase): boolean {
    return this.selectedPurchases.some((p) => p.id === purchase.id);
  }

  clearPurchaseCheckBoxSelection() {
    this.selectedPurchases = [];
    this.selectAll = false;
  }

  filterPurchases() {
    this.first = 0;
    this.updateVisibleList();
    this.openFilterDialog = false;
  }

  clearFilter() {
    this.filterDTO = {
      searchTerm: '',
      orderDateFrom: null,
      orderDateTo: null,
      expectedDeliveryFrom: null,
      expectedDeliveryTo: null,
      vendorId: '',
      status: '',
      urgent: false,
      createdBy: '',
    };
    this.updateVisibleList();
  }

  exportToExcel() {
    console.log('Exporting to Excel...');
    // Could implement CSV/Excel export here
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'approved':
        return 'status-approved';
      case 'shipped':
        return 'status-shipped';
      case 'delivered':
        return 'status-delivered';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  }

  getStatusLabel(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  onPageChange(page: number) {
    this.first = (page - 1) * this.rows;
    this.updateVisibleList();
  }

  onRowsChange() {
    this.first = 0;
    this.updateVisibleList();
  }

  get totalRecords(): number {
    return this.allPurchases.length;
  }

  get totalPages(): number {
    return Math.ceil(this.allPurchases.length / this.rows);
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
    if (this.first + this.rows < this.allPurchases.length) {
      this.first += this.rows;
      this.updateVisibleList();
    }
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  getQualityStars(rating: number | null | undefined): number[] {
    if (!rating) return [];
    return Array(rating).fill(0);
  }

  // Helper to access purchase properties dynamically
  getPurchaseValue(purchase: Purchase, field: string): any {
    return (purchase as any)[field];
  }
}
