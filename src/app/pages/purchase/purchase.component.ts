import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

export interface PurchaseOrder {
  id: number;
  poNumber: string;
  supplierName: string;
  creationDate: Date;
  dueDate: Date;
  status: string;
  totalAmount: number;
  createdBy: string;
  urgent: boolean;
  [key: string]: any;
}

export interface TableColumn {
  field: string;
  columnLabel: string;
  isSelected: boolean;
  canBeRemoved: boolean;
  type: 'string' | 'date' | 'number';
}

export interface FilterDTO {
  searchTerm: string;
  quotationDateFrom: Date | null;
  quotationDateTo: Date | null;
  dueDateFrom: Date | null;
  dueDateTo: Date | null;
  supplierId: string;
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
export class PurchaseComponent implements OnInit {
  // Pagination
  first = 0;
  rows = 10;
  rowsPerPageOptions = [10, 25, 50];

  // Filter
  showFilter = false;
  openFilterDialog = false;

  // Selection
  selectedQuotations: PurchaseOrder[] = [];
  selectAll = false;

  // Filter DTO
  filterDTO: FilterDTO = {
    searchTerm: '',
    quotationDateFrom: null,
    quotationDateTo: null,
    dueDateFrom: null,
    dueDateTo: null,
    supplierId: '',
    status: '',
    urgent: false,
    createdBy: '',
  };

  // Status cards data
  statusCounts = {
    RFQ: 12,
    'RFQ Cancelled': 3,
    'RFQ Sent': 8,
    'Purchase Order': 25,
    Cancelled: 5,
  };

  // Columns configuration
  availableColumns: TableColumn[] = [
    {
      field: 'poNumber',
      columnLabel: 'PO Number',
      isSelected: true,
      canBeRemoved: false,
      type: 'string',
    },
    {
      field: 'supplierName',
      columnLabel: 'Supplier',
      isSelected: true,
      canBeRemoved: true,
      type: 'string',
    },
    {
      field: 'creationDate',
      columnLabel: 'Creation Date',
      isSelected: true,
      canBeRemoved: true,
      type: 'date',
    },
    {
      field: 'dueDate',
      columnLabel: 'Due Date',
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
    { key: 'RFQ', value: 'RFQ' },
    { key: 'RFQ Sent', value: 'RFQ Sent' },
    { key: 'RFQ Cancelled', value: 'RFQ Cancelled' },
    { key: 'Purchase Order', value: 'Purchase Order' },
    { key: 'Cancelled', value: 'Cancelled' },
  ];

  suppliersDropdownOptions = [
    { key: 'All Suppliers', value: '' },
    { key: 'Acme Corp', value: '1' },
    { key: 'Global Supplies', value: '2' },
    { key: 'Tech Solutions', value: '3' },
  ];

  // Sample purchase order data
  allQuotationsList: PurchaseOrder[] = [
    {
      id: 1,
      poNumber: 'PO-2024-001',
      supplierName: 'Acme Corp',
      creationDate: new Date('2024-01-15'),
      dueDate: new Date('2024-02-15'),
      status: 'RFQ',
      totalAmount: 15000,
      createdBy: 'John Smith',
      urgent: false,
    },
    {
      id: 2,
      poNumber: 'PO-2024-002',
      supplierName: 'Global Supplies',
      creationDate: new Date('2024-01-18'),
      dueDate: new Date('2024-02-20'),
      status: 'RFQ Sent',
      totalAmount: 8500,
      createdBy: 'Jane Doe',
      urgent: true,
    },
    {
      id: 3,
      poNumber: 'PO-2024-003',
      supplierName: 'Tech Solutions',
      creationDate: new Date('2024-01-20'),
      dueDate: new Date('2024-02-25'),
      status: 'Purchase Order',
      totalAmount: 32000,
      createdBy: 'Bob Wilson',
      urgent: false,
    },
    {
      id: 4,
      poNumber: 'PO-2024-004',
      supplierName: 'Prime Materials',
      creationDate: new Date('2024-01-22'),
      dueDate: new Date('2024-02-28'),
      status: 'RFQ Cancelled',
      totalAmount: 5600,
      createdBy: 'Alice Brown',
      urgent: false,
    },
    {
      id: 5,
      poNumber: 'PO-2024-005',
      supplierName: 'Swift Logistics',
      creationDate: new Date('2024-01-25'),
      dueDate: new Date('2024-03-01'),
      status: 'Purchase Order',
      totalAmount: 18900,
      createdBy: 'Charlie Davis',
      urgent: true,
    },
    {
      id: 6,
      poNumber: 'PO-2024-006',
      supplierName: 'Quality Parts Inc',
      creationDate: new Date('2024-01-28'),
      dueDate: new Date('2024-03-05'),
      status: 'Cancelled',
      totalAmount: 7200,
      createdBy: 'Diana Evans',
      urgent: false,
    },
    {
      id: 7,
      poNumber: 'PO-2024-007',
      supplierName: 'Green Energy Co',
      creationDate: new Date('2024-02-01'),
      dueDate: new Date('2024-03-10'),
      status: 'RFQ',
      totalAmount: 45000,
      createdBy: 'Edward Foster',
      urgent: false,
    },
    {
      id: 8,
      poNumber: 'PO-2024-008',
      supplierName: 'Smart Systems',
      creationDate: new Date('2024-02-05'),
      dueDate: new Date('2024-03-15'),
      status: 'RFQ Sent',
      totalAmount: 12300,
      createdBy: 'Fiona Garcia',
      urgent: true,
    },
    {
      id: 9,
      poNumber: 'PO-2024-009',
      supplierName: 'Metro Distribution',
      creationDate: new Date('2024-02-08'),
      dueDate: new Date('2024-03-20'),
      status: 'Purchase Order',
      totalAmount: 28500,
      createdBy: 'George Harris',
      urgent: false,
    },
    {
      id: 10,
      poNumber: 'PO-2024-010',
      supplierName: 'National Supplies',
      creationDate: new Date('2024-02-10'),
      dueDate: new Date('2024-03-25'),
      status: 'RFQ',
      totalAmount: 9800,
      createdBy: 'Helen Irving',
      urgent: false,
    },
    {
      id: 11,
      poNumber: 'PO-2024-011',
      supplierName: 'Pacific Trading',
      creationDate: new Date('2024-02-12'),
      dueDate: new Date('2024-03-30'),
      status: 'Purchase Order',
      totalAmount: 67000,
      createdBy: 'Ian Jackson',
      urgent: true,
    },
    {
      id: 12,
      poNumber: 'PO-2024-012',
      supplierName: 'Central Hardware',
      creationDate: new Date('2024-02-15'),
      dueDate: new Date('2024-04-01'),
      status: 'Cancelled',
      totalAmount: 4500,
      createdBy: 'Julia King',
      urgent: false,
    },
  ];

  quotationsList: PurchaseOrder[] = [];

  constructor(private router: Router) {}

  ngOnInit() {
    this.updateVisibleList();
  }

  getStatusCount(status: string): number {
    return this.allQuotationsList.filter((q) => q.status === status).length;
  }

  get selectedColumns(): TableColumn[] {
    return this.availableColumns.filter((col) => col.isSelected);
  }

  updateVisibleList() {
    let filtered = [...this.allQuotationsList];

    // Apply search filter
    if (this.filterDTO.searchTerm) {
      const term = this.filterDTO.searchTerm.toLowerCase();
      filtered = filtered.filter((q) =>
        q.poNumber.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (this.filterDTO.status) {
      filtered = filtered.filter((q) => q.status === this.filterDTO.status);
    }

    // Apply pagination
    this.quotationsList = filtered.slice(this.first, this.first + this.rows);
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

  handleNewQuotation() {
    console.log('Create new purchase order');
  }

  handleEdit(id: number) {
    console.log('Edit purchase order:', id);
  }

  handleDeleteSalesQuotation(id: number) {
    this.allQuotationsList = this.allQuotationsList.filter((q) => q.id !== id);
    this.updateVisibleList();
  }

  onSelectionChange(quotation: PurchaseOrder) {
    const index = this.selectedQuotations.findIndex(
      (q) => q.id === quotation.id
    );
    if (index > -1) {
      this.selectedQuotations.splice(index, 1);
    } else {
      this.selectedQuotations.push(quotation);
    }
  }

  toggleSelectAll() {
    if (this.selectAll) {
      this.selectedQuotations = [...this.quotationsList];
    } else {
      this.selectedQuotations = [];
    }
  }

  isSelected(quotation: PurchaseOrder): boolean {
    return this.selectedQuotations.some((q) => q.id === quotation.id);
  }

  clearQuotationCheckBoxSelection() {
    this.selectedQuotations = [];
    this.selectAll = false;
  }

  filterPurchaseQuotations() {
    this.first = 0;
    this.updateVisibleList();
    this.openFilterDialog = false;
  }

  clearFilter() {
    this.filterDTO = {
      searchTerm: '',
      quotationDateFrom: null,
      quotationDateTo: null,
      dueDateFrom: null,
      dueDateTo: null,
      supplierId: '',
      status: '',
      urgent: false,
      createdBy: '',
    };
    this.updateVisibleList();
  }

  exportToExcel() {
    console.log('Exporting to Excel...');
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'RFQ':
        return 'status-rfq';
      case 'RFQ Sent':
        return 'status-sent';
      case 'RFQ Cancelled':
        return 'status-rfq-cancelled';
      case 'Purchase Order':
        return 'status-purchaseOrder';
      case 'Cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  }

  onPageChange(page: number) {
    this.first = (page - 1) * this.rows;
    this.updateVisibleList();
  }

  onRowsChange() {
    this.first = 0;
    this.updateVisibleList();
  }

  get totalPages(): number {
    return Math.ceil(this.allQuotationsList.length / this.rows);
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
    if (this.first + this.rows < this.allQuotationsList.length) {
      this.first += this.rows;
      this.updateVisibleList();
    }
  }
}
