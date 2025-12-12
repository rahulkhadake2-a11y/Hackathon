import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

export interface Vendor {
  id: number;
  vendorName: string;
  contactPerson: string;
  email: string;
  phone: string;
  category: string;
  status: string;
  totalPurchases: number;
  rating: number;
  [key: string]: any;
}

export interface TableColumn {
  field: string;
  columnLabel: string;
  isSelected: boolean;
}

@Component({
  selector: 'app-vender-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './vender-list.component.html',
  styleUrl: './vender-list.component.css',
})
export class VenderListComponent implements OnInit {
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
    { field: 'email', columnLabel: 'Email', isSelected: true },
    { field: 'phone', columnLabel: 'Phone', isSelected: true },
    { field: 'category', columnLabel: 'Category', isSelected: true },
    { field: 'status', columnLabel: 'Status', isSelected: true },
    {
      field: 'totalPurchases',
      columnLabel: 'Total Purchases',
      isSelected: false,
    },
    { field: 'rating', columnLabel: 'Rating', isSelected: false },
  ];

  selectedColumns: TableColumn[] = [];

  // Sample vendor data
  allVendorList: Vendor[] = [
    {
      id: 1,
      vendorName: 'Acme Corp',
      contactPerson: 'John Smith',
      email: 'john@acme.com',
      phone: '555-0101',
      category: 'Electronics',
      status: 'Active',
      totalPurchases: 125000,
      rating: 4.5,
    },
    {
      id: 2,
      vendorName: 'Global Supplies',
      contactPerson: 'Jane Doe',
      email: 'jane@global.com',
      phone: '555-0102',
      category: 'Office Supplies',
      status: 'Active',
      totalPurchases: 89000,
      rating: 4.2,
    },
    {
      id: 3,
      vendorName: 'Tech Solutions',
      contactPerson: 'Bob Wilson',
      email: 'bob@techsol.com',
      phone: '555-0103',
      category: 'IT Services',
      status: 'Active',
      totalPurchases: 210000,
      rating: 4.8,
    },
    {
      id: 4,
      vendorName: 'Prime Materials',
      contactPerson: 'Alice Brown',
      email: 'alice@prime.com',
      phone: '555-0104',
      category: 'Raw Materials',
      status: 'Inactive',
      totalPurchases: 45000,
      rating: 3.9,
    },
    {
      id: 5,
      vendorName: 'Swift Logistics',
      contactPerson: 'Charlie Davis',
      email: 'charlie@swift.com',
      phone: '555-0105',
      category: 'Logistics',
      status: 'Active',
      totalPurchases: 178000,
      rating: 4.6,
    },
    {
      id: 6,
      vendorName: 'Quality Parts Inc',
      contactPerson: 'Diana Evans',
      email: 'diana@quality.com',
      phone: '555-0106',
      category: 'Manufacturing',
      status: 'Active',
      totalPurchases: 156000,
      rating: 4.3,
    },
    {
      id: 7,
      vendorName: 'Green Energy Co',
      contactPerson: 'Edward Foster',
      email: 'edward@green.com',
      phone: '555-0107',
      category: 'Energy',
      status: 'Active',
      totalPurchases: 92000,
      rating: 4.1,
    },
    {
      id: 8,
      vendorName: 'Smart Systems',
      contactPerson: 'Fiona Garcia',
      email: 'fiona@smart.com',
      phone: '555-0108',
      category: 'IT Services',
      status: 'Pending',
      totalPurchases: 67000,
      rating: 4.0,
    },
    {
      id: 9,
      vendorName: 'Metro Distribution',
      contactPerson: 'George Harris',
      email: 'george@metro.com',
      phone: '555-0109',
      category: 'Logistics',
      status: 'Active',
      totalPurchases: 134000,
      rating: 4.4,
    },
    {
      id: 10,
      vendorName: 'National Supplies',
      contactPerson: 'Helen Irving',
      email: 'helen@national.com',
      phone: '555-0110',
      category: 'Office Supplies',
      status: 'Active',
      totalPurchases: 78000,
      rating: 4.2,
    },
    {
      id: 11,
      vendorName: 'Pacific Trading',
      contactPerson: 'Ian Jackson',
      email: 'ian@pacific.com',
      phone: '555-0111',
      category: 'Import/Export',
      status: 'Active',
      totalPurchases: 245000,
      rating: 4.7,
    },
    {
      id: 12,
      vendorName: 'Central Hardware',
      contactPerson: 'Julia King',
      email: 'julia@central.com',
      phone: '555-0112',
      category: 'Hardware',
      status: 'Inactive',
      totalPurchases: 34000,
      rating: 3.5,
    },
  ];

  visibleVendorList: Vendor[] = [];

  constructor(private router: Router) {}

  ngOnInit() {
    this.updateSelectedFilterColumns();
    this.updateVisibleList();
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
    // Navigate to add vendor page or open modal
    console.log('Add new vendor');
  }

  handleEditVendor(id: number) {
    this.router.navigate(['/vendor', id]);
  }

  handleViewVendor(id: number) {
    this.router.navigate(['/vendor', id]);
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

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'active':
        return 'status-active';
      case 'inactive':
        return 'status-inactive';
      case 'pending':
        return 'status-pending';
      default:
        return '';
    }
  }
}
