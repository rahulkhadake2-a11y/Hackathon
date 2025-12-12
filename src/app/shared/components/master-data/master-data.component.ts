import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import {
  ApiService,
  Item,
  VendorItem,
  Vendor,
} from '../../../core/services/api/api.service';

@Component({
  selector: 'app-master-data',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './master-data.component.html',
  styleUrl: './master-data.component.css',
})
export class MasterDataComponent implements OnInit {
  private apiService = inject(ApiService);
  private fb = inject(FormBuilder);

  // Active tab: 'items' or 'vendor-items'
  activeTab: 'items' | 'vendor-items' = 'items';

  // Items data
  items: Item[] = [];
  filteredItems: Item[] = [];
  selectedItem: Item | null = null;
  itemSearchTerm = '';
  itemCategoryFilter = '';
  itemCategories: string[] = [
    'Electronics',
    'Office Supplies',
    'Furniture',
    'IT Services',
    'Raw Materials',
    'Logistics',
  ];

  // Vendor Items data
  vendorItems: VendorItem[] = [];
  filteredVendorItems: VendorItem[] = [];
  selectedVendorItem: VendorItem | null = null;
  vendors: Vendor[] = [];
  vendorItemSearchTerm = '';
  vendorItemVendorFilter = '';

  // Forms
  itemForm!: FormGroup;
  vendorItemForm!: FormGroup;

  // Modal states
  showItemModal = false;
  showVendorItemModal = false;
  showDeleteConfirm = false;
  deleteType: 'item' | 'vendor-item' = 'item';
  deleteItemId: string = '';

  // Loading and error states
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // Editing mode
  isEditingItem = false;
  isEditingVendorItem = false;

  // Pagination - Items
  itemsCurrentPage = 1;
  itemsPageSize = 10;
  itemsPageSizeOptions = [5, 10, 25, 50];

  // Pagination - Vendor Items
  vendorItemsCurrentPage = 1;
  vendorItemsPageSize = 10;
  vendorItemsPageSizeOptions = [5, 10, 25, 50];

  ngOnInit(): void {
    this.initForms();
    this.loadData();
  }

  private initForms(): void {
    this.itemForm = this.fb.group({
      itemCode: ['', Validators.required],
      itemName: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      category: ['Electronics', Validators.required],
      unit: ['piece', Validators.required],
      defaultPrice: [0, [Validators.required, Validators.min(0)]],
      status: ['active', Validators.required],
    });

    this.vendorItemForm = this.fb.group({
      vendorId: ['', Validators.required],
      itemId: ['', Validators.required],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      minOrderQuantity: [1, [Validators.required, Validators.min(1)]],
      leadTimeDays: [1, [Validators.required, Validators.min(0)]],
      isPreferred: [false],
      status: ['active', Validators.required],
    });
  }

  private loadData(): void {
    this.isLoading = true;

    // Load items
    this.apiService.getItems().subscribe({
      next: (items) => {
        this.items = items;
        this.filterItems();
      },
      error: (err) => this.showError('Failed to load items'),
    });

    // Load vendors
    this.apiService.getVendors().subscribe({
      next: (vendors) => {
        this.vendors = vendors.filter((v) => v.status === 'active');
      },
      error: (err) => this.showError('Failed to load vendors'),
    });

    // Load vendor items
    this.apiService.getVendorItems().subscribe({
      next: (vendorItems) => {
        this.vendorItems = vendorItems;
        this.filterVendorItems();
        this.isLoading = false;
      },
      error: (err) => {
        this.showError('Failed to load vendor items');
        this.isLoading = false;
      },
    });
  }

  // Tab switching
  switchTab(tab: 'items' | 'vendor-items'): void {
    this.activeTab = tab;
    this.clearMessages();
  }

  // ==================== ITEMS CRUD ====================
  filterItems(): void {
    this.filteredItems = this.items.filter((item) => {
      const matchesSearch =
        !this.itemSearchTerm ||
        item.itemName
          .toLowerCase()
          .includes(this.itemSearchTerm.toLowerCase()) ||
        item.itemCode.toLowerCase().includes(this.itemSearchTerm.toLowerCase());
      const matchesCategory =
        !this.itemCategoryFilter || item.category === this.itemCategoryFilter;
      return matchesSearch && matchesCategory;
    });
    // Reset to first page when filtering
    this.itemsCurrentPage = 1;
  }

  // Items pagination getters
  get itemsTotalPages(): number {
    return Math.ceil(this.filteredItems.length / this.itemsPageSize);
  }

  get paginatedItems(): Item[] {
    const startIndex = (this.itemsCurrentPage - 1) * this.itemsPageSize;
    return this.filteredItems.slice(
      startIndex,
      startIndex + this.itemsPageSize
    );
  }

  get itemsStartIndex(): number {
    return (this.itemsCurrentPage - 1) * this.itemsPageSize + 1;
  }

  get itemsEndIndex(): number {
    return Math.min(
      this.itemsCurrentPage * this.itemsPageSize,
      this.filteredItems.length
    );
  }

  // Items pagination methods
  changeItemsPage(page: number): void {
    if (page >= 1 && page <= this.itemsTotalPages) {
      this.itemsCurrentPage = page;
    }
  }

  changeItemsPageSize(size: number): void {
    this.itemsPageSize = size;
    this.itemsCurrentPage = 1;
  }

  getItemsPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(
      1,
      this.itemsCurrentPage - Math.floor(maxVisiblePages / 2)
    );
    let endPage = Math.min(
      this.itemsTotalPages,
      startPage + maxVisiblePages - 1
    );

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  openAddItemModal(): void {
    this.isEditingItem = false;
    this.selectedItem = null;
    this.itemForm.reset({
      itemCode: this.generateItemCode(),
      itemName: '',
      description: '',
      category: 'Electronics',
      unit: 'piece',
      defaultPrice: 0,
      status: 'active',
    });
    this.showItemModal = true;
    this.clearMessages();
  }

  openEditItemModal(item: Item): void {
    this.isEditingItem = true;
    this.selectedItem = item;
    this.itemForm.patchValue({
      itemCode: item.itemCode,
      itemName: item.itemName,
      description: item.description || '',
      category: item.category,
      unit: item.unit,
      defaultPrice: item.defaultPrice || 0,
      status: item.status,
    });
    this.showItemModal = true;
    this.clearMessages();
  }

  saveItem(): void {
    if (this.itemForm.invalid) {
      this.markFormGroupTouched(this.itemForm);
      return;
    }

    this.isLoading = true;
    const formData = this.itemForm.value;

    if (this.isEditingItem && this.selectedItem?.id) {
      this.apiService.updateItem(this.selectedItem.id, formData).subscribe({
        next: (updated) => {
          const index = this.items.findIndex((i) => i.id === updated.id);
          if (index !== -1) {
            this.items[index] = updated;
          }
          this.filterItems();
          this.showSuccess('Item updated successfully');
          this.closeItemModal();
          this.isLoading = false;
        },
        error: (err) => {
          this.showError('Failed to update item');
          this.isLoading = false;
        },
      });
    } else {
      this.apiService.createItem(formData).subscribe({
        next: (created) => {
          this.items.push(created);
          this.filterItems();
          this.showSuccess('Item created successfully');
          this.closeItemModal();
          this.isLoading = false;
        },
        error: (err) => {
          this.showError('Failed to create item');
          this.isLoading = false;
        },
      });
    }
  }

  confirmDeleteItem(item: Item): void {
    this.deleteType = 'item';
    this.deleteItemId = item.id!;
    this.selectedItem = item;
    this.showDeleteConfirm = true;
  }

  deleteItem(): void {
    if (!this.deleteItemId) return;

    this.isLoading = true;
    this.apiService.deleteItem(this.deleteItemId).subscribe({
      next: () => {
        this.items = this.items.filter((i) => i.id !== this.deleteItemId);
        this.filterItems();
        this.showSuccess('Item deleted successfully');
        this.closeDeleteConfirm();
        this.isLoading = false;
      },
      error: (err) => {
        this.showError('Failed to delete item');
        this.isLoading = false;
      },
    });
  }

  closeItemModal(): void {
    this.showItemModal = false;
    this.selectedItem = null;
    this.itemForm.reset();
  }

  private generateItemCode(): string {
    const prefix = 'ITM-';
    const existingCodes = this.items.map((i) => i.itemCode);
    let counter = this.items.length + 1;
    let newCode = prefix + counter.toString().padStart(3, '0');

    while (existingCodes.includes(newCode)) {
      counter++;
      newCode = prefix + counter.toString().padStart(3, '0');
    }
    return newCode;
  }

  // ==================== VENDOR ITEMS CRUD ====================
  filterVendorItems(): void {
    this.filteredVendorItems = this.vendorItems.filter((vi) => {
      const matchesSearch =
        !this.vendorItemSearchTerm ||
        vi.itemName
          ?.toLowerCase()
          .includes(this.vendorItemSearchTerm.toLowerCase()) ||
        vi.vendorName
          ?.toLowerCase()
          .includes(this.vendorItemSearchTerm.toLowerCase());
      const matchesVendor =
        !this.vendorItemVendorFilter ||
        vi.vendorId === this.vendorItemVendorFilter;
      return matchesSearch && matchesVendor;
    });
    // Reset to first page when filtering
    this.vendorItemsCurrentPage = 1;
  }

  // Vendor Items pagination getters
  get vendorItemsTotalPages(): number {
    return Math.ceil(
      this.filteredVendorItems.length / this.vendorItemsPageSize
    );
  }

  get paginatedVendorItems(): VendorItem[] {
    const startIndex =
      (this.vendorItemsCurrentPage - 1) * this.vendorItemsPageSize;
    return this.filteredVendorItems.slice(
      startIndex,
      startIndex + this.vendorItemsPageSize
    );
  }

  get vendorItemsStartIndex(): number {
    return (this.vendorItemsCurrentPage - 1) * this.vendorItemsPageSize + 1;
  }

  get vendorItemsEndIndex(): number {
    return Math.min(
      this.vendorItemsCurrentPage * this.vendorItemsPageSize,
      this.filteredVendorItems.length
    );
  }

  // Vendor Items pagination methods
  changeVendorItemsPage(page: number): void {
    if (page >= 1 && page <= this.vendorItemsTotalPages) {
      this.vendorItemsCurrentPage = page;
    }
  }

  changeVendorItemsPageSize(size: number): void {
    this.vendorItemsPageSize = size;
    this.vendorItemsCurrentPage = 1;
  }

  getVendorItemsPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(
      1,
      this.vendorItemsCurrentPage - Math.floor(maxVisiblePages / 2)
    );
    let endPage = Math.min(
      this.vendorItemsTotalPages,
      startPage + maxVisiblePages - 1
    );

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  openAddVendorItemModal(): void {
    this.isEditingVendorItem = false;
    this.selectedVendorItem = null;
    this.vendorItemForm.reset({
      vendorId: '',
      itemId: '',
      unitPrice: 0,
      minOrderQuantity: 1,
      leadTimeDays: 1,
      isPreferred: false,
      status: 'active',
    });
    this.showVendorItemModal = true;
    this.clearMessages();
  }

  openEditVendorItemModal(vendorItem: VendorItem): void {
    this.isEditingVendorItem = true;
    this.selectedVendorItem = vendorItem;
    this.vendorItemForm.patchValue({
      vendorId: vendorItem.vendorId,
      itemId: vendorItem.itemId,
      unitPrice: vendorItem.unitPrice,
      minOrderQuantity: vendorItem.minOrderQuantity || 1,
      leadTimeDays: vendorItem.leadTimeDays || 1,
      isPreferred: vendorItem.isPreferred || false,
      status: vendorItem.status,
    });
    this.showVendorItemModal = true;
    this.clearMessages();
  }

  saveVendorItem(): void {
    if (this.vendorItemForm.invalid) {
      this.markFormGroupTouched(this.vendorItemForm);
      return;
    }

    this.isLoading = true;
    const formData = this.vendorItemForm.value;

    // Get vendor and item names
    const vendor = this.vendors.find((v) => v.id === formData.vendorId);
    const item = this.items.find((i) => i.id === formData.itemId);

    const vendorItemData: Partial<VendorItem> = {
      ...formData,
      vendorName: vendor?.vendorName || '',
      itemName: item?.itemName || '',
      itemCode: item?.itemCode || '',
    };

    if (this.isEditingVendorItem && this.selectedVendorItem?.id) {
      this.apiService
        .updateVendorItem(this.selectedVendorItem.id, vendorItemData)
        .subscribe({
          next: (updated) => {
            const index = this.vendorItems.findIndex(
              (vi) => vi.id === updated.id
            );
            if (index !== -1) {
              this.vendorItems[index] = updated;
            }
            this.filterVendorItems();
            this.showSuccess('Vendor item mapping updated successfully');
            this.closeVendorItemModal();
            this.isLoading = false;
          },
          error: (err) => {
            this.showError('Failed to update vendor item mapping');
            this.isLoading = false;
          },
        });
    } else {
      // Check if mapping already exists
      const existingMapping = this.vendorItems.find(
        (vi) =>
          vi.vendorId === formData.vendorId && vi.itemId === formData.itemId
      );

      if (existingMapping) {
        this.showError('This item is already mapped to this vendor');
        this.isLoading = false;
        return;
      }

      this.apiService.createVendorItem(vendorItemData).subscribe({
        next: (created) => {
          this.vendorItems.push(created);
          this.filterVendorItems();
          this.showSuccess('Vendor item mapping created successfully');
          this.closeVendorItemModal();
          this.isLoading = false;
        },
        error: (err) => {
          this.showError('Failed to create vendor item mapping');
          this.isLoading = false;
        },
      });
    }
  }

  confirmDeleteVendorItem(vendorItem: VendorItem): void {
    this.deleteType = 'vendor-item';
    this.deleteItemId = vendorItem.id!;
    this.selectedVendorItem = vendorItem;
    this.showDeleteConfirm = true;
  }

  deleteVendorItem(): void {
    if (!this.deleteItemId) return;

    this.isLoading = true;
    this.apiService.deleteVendorItem(this.deleteItemId).subscribe({
      next: () => {
        this.vendorItems = this.vendorItems.filter(
          (vi) => vi.id !== this.deleteItemId
        );
        this.filterVendorItems();
        this.showSuccess('Vendor item mapping deleted successfully');
        this.closeDeleteConfirm();
        this.isLoading = false;
      },
      error: (err) => {
        this.showError('Failed to delete vendor item mapping');
        this.isLoading = false;
      },
    });
  }

  closeVendorItemModal(): void {
    this.showVendorItemModal = false;
    this.selectedVendorItem = null;
    this.vendorItemForm.reset();
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm = false;
    this.deleteItemId = '';
    this.selectedItem = null;
    this.selectedVendorItem = null;
  }

  // ==================== HELPER METHODS ====================
  getVendorName(vendorId: string): string {
    return this.vendors.find((v) => v.id === vendorId)?.vendorName || 'Unknown';
  }

  getItemName(itemId: string): string {
    return this.items.find((i) => i.id === itemId)?.itemName || 'Unknown';
  }

  getItemsForVendor(vendorId: string): VendorItem[] {
    return this.vendorItems.filter(
      (vi) => vi.vendorId === vendorId && vi.status === 'active'
    );
  }

  getVendorsForItem(itemId: string): VendorItem[] {
    return this.vendorItems.filter(
      (vi) => vi.itemId === itemId && vi.status === 'active'
    );
  }

  private showError(message: string): void {
    this.errorMessage = message;
    this.successMessage = '';
    setTimeout(() => (this.errorMessage = ''), 5000);
  }

  private showSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = '';
    setTimeout(() => (this.successMessage = ''), 5000);
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
