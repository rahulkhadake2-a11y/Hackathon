import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import {
  ApiService,
  Purchase,
  PurchaseItem,
  Vendor,
  VendorItem,
  Item,
} from '../../core/services/api/api.service';

interface PurchaseFormItem {
  itemId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

@Component({
  selector: 'app-add-purchase',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './add-purchase.component.html',
  styleUrl: './add-purchase.component.css',
})
export class AddPurchaseComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  isEditMode = false;
  purchaseId: string | null = null;
  isLoading = false;
  isSaving = false;

  vendors: Vendor[] = [];

  // Master items and vendor-specific items
  allItems: Item[] = [];
  vendorItems: VendorItem[] = [];
  availableItems: VendorItem[] = []; // Items available for selected vendor

  // Form fields
  vendorId = '';
  purchaseOrderNumber = '';
  orderDate = '';
  expectedDeliveryDate = '';
  actualDeliveryDate = '';
  status: 'pending' | 'approved' | 'shipped' | 'delivered' | 'cancelled' =
    'pending';
  notes = '';
  urgent = false;
  createdBy = '';

  // Risk-related fields
  onTimeDelivery: boolean | null = null;
  deliveryDelayDays: number | null = null;
  qualityRating: number | null = null;
  defectCount: number | null = null;
  returnedItems: number | null = null;
  paymentStatus: 'pending' | 'paid' | 'overdue' | 'partial' = 'pending';
  paymentDelayDays: number | null = null;
  leadTime: number | null = null;
  communicationRating: number | null = null;

  // Purchase items
  items: PurchaseFormItem[] = [
    { itemId: '', description: '', quantity: 1, unitPrice: 0, total: 0 },
  ];

  // Tax rate (8%)
  taxRate = 0.08;

  statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  paymentStatusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'partial', label: 'Partial' },
  ];

  qualityRatingOptions = [
    { value: 1, label: '1 - Poor' },
    { value: 2, label: '2 - Fair' },
    { value: 3, label: '3 - Good' },
    { value: 4, label: '4 - Very Good' },
    { value: 5, label: '5 - Excellent' },
  ];

  communicationRatingOptions = [
    { value: 1, label: '1 - Poor' },
    { value: 2, label: '2 - Fair' },
    { value: 3, label: '3 - Good' },
    { value: 4, label: '4 - Very Good' },
    { value: 5, label: '5 - Excellent' },
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.loadVendors();
    this.loadItems();
    this.loadVendorItems();
    this.generatePONumber();

    // Check if editing
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.purchaseId = id;
      this.loadPurchase(id);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadVendors() {
    this.apiService
      .getVendors()
      .pipe(takeUntil(this.destroy$))
      .subscribe((vendors) => {
        this.vendors = vendors.filter((v) => v.status === 'active');
      });
  }

  loadItems() {
    this.apiService
      .getItems()
      .pipe(takeUntil(this.destroy$))
      .subscribe((items) => {
        this.allItems = items.filter((i) => i.status === 'active');
      });
  }

  loadVendorItems() {
    this.apiService
      .getVendorItems()
      .pipe(takeUntil(this.destroy$))
      .subscribe((vendorItems) => {
        this.vendorItems = vendorItems.filter((vi) => vi.status === 'active');
        // If vendor is already selected, filter available items
        if (this.vendorId) {
          this.onVendorChange();
        }
      });
  }

  // Called when vendor selection changes
  onVendorChange() {
    // Filter vendor items based on selected vendor
    this.availableItems = this.vendorItems.filter(
      (vi) => vi.vendorId === this.vendorId && vi.status === 'active'
    );

    // Clear item selections if vendor changed (except in edit mode when first loading)
    if (!this.isLoading) {
      this.items = [
        { itemId: '', description: '', quantity: 1, unitPrice: 0, total: 0 },
      ];
    }
  }

  // Called when an item is selected from dropdown
  onItemSelect(index: number) {
    const item = this.items[index];
    const vendorItem = this.availableItems.find(
      (vi) => vi.itemId === item.itemId
    );

    if (vendorItem) {
      item.description = vendorItem.itemName || '';
      item.unitPrice = vendorItem.unitPrice;
      item.quantity = Math.max(item.quantity, vendorItem.minOrderQuantity || 1);
      this.updateItemTotal(index);
    }
  }

  loadPurchase(id: string) {
    this.isLoading = true;
    this.apiService
      .getPurchaseById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (purchase) => {
          this.populateForm(purchase);
          this.isLoading = false;
        },
        error: () => {
          alert('Failed to load purchase order');
          this.router.navigate(['/purchase']);
        },
      });
  }

  populateForm(purchase: Purchase) {
    this.vendorId = purchase.vendorId;
    this.purchaseOrderNumber = purchase.purchaseOrderNumber;
    this.orderDate = purchase.orderDate;
    this.expectedDeliveryDate = purchase.expectedDeliveryDate || '';
    this.actualDeliveryDate = purchase.actualDeliveryDate || '';
    this.status = purchase.status;
    this.notes = purchase.notes || '';
    this.urgent = purchase.urgent || false;
    this.createdBy = purchase.createdBy || '';

    // Risk fields
    this.onTimeDelivery = purchase.onTimeDelivery ?? null;
    this.deliveryDelayDays = purchase.deliveryDelayDays ?? null;
    this.qualityRating = purchase.qualityRating ?? null;
    this.defectCount = purchase.defectCount ?? null;
    this.returnedItems = purchase.returnedItems ?? null;
    this.paymentStatus = purchase.paymentStatus || 'pending';
    this.paymentDelayDays = purchase.paymentDelayDays ?? null;
    this.leadTime = purchase.leadTime ?? null;
    this.communicationRating = purchase.communicationRating ?? null;

    // Filter available items for this vendor
    this.onVendorChange();

    // Items - try to match with vendor items for itemId
    if (purchase.items && purchase.items.length > 0) {
      this.items = purchase.items.map((item) => {
        // Try to find matching vendor item by description
        const matchingVendorItem = this.availableItems.find(
          (vi) =>
            vi.itemName === item.description || vi.itemCode === item.description
        );
        return {
          itemId: matchingVendorItem?.itemId || '',
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        };
      });
    }
  }

  generatePONumber() {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    this.purchaseOrderNumber = `PO-${year}-${random}`;
  }

  // Item management
  addItem() {
    this.items.push({
      itemId: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    });
  }

  removeItem(index: number) {
    if (this.items.length > 1) {
      this.items.splice(index, 1);
    }
  }

  updateItemTotal(index: number) {
    const item = this.items[index];
    item.total = item.quantity * item.unitPrice;
  }

  get subtotal(): number {
    return this.items.reduce((sum, item) => sum + item.total, 0);
  }

  get tax(): number {
    return this.subtotal * this.taxRate;
  }

  get totalAmount(): number {
    return this.subtotal + this.tax;
  }

  // Delivery date change handler
  onActualDeliveryDateChange() {
    if (this.actualDeliveryDate && this.expectedDeliveryDate) {
      const expected = new Date(this.expectedDeliveryDate);
      const actual = new Date(this.actualDeliveryDate);
      const diffDays = Math.ceil(
        (actual.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24)
      );

      this.onTimeDelivery = diffDays <= 0;
      this.deliveryDelayDays = diffDays > 0 ? diffDays : 0;

      // Calculate lead time
      if (this.orderDate) {
        const order = new Date(this.orderDate);
        this.leadTime = Math.ceil(
          (actual.getTime() - order.getTime()) / (1000 * 60 * 60 * 24)
        );
      }
    }
  }

  // Calculate defect rate
  get defectRate(): number {
    const totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
    if (totalItems === 0 || !this.defectCount) return 0;
    return (this.defectCount / totalItems) * 100;
  }

  getSelectedVendorName(): string {
    const vendor = this.vendors.find((v) => v.id === this.vendorId);
    return vendor ? vendor.vendorName : '';
  }

  // Check if an item is already selected in another row (to avoid duplicates)
  isItemAlreadySelected(itemId: string, currentIndex: number): boolean {
    return this.items.some(
      (item, index) => item.itemId === itemId && index !== currentIndex
    );
  }

  // Get available items for dropdown, excluding already selected items
  getAvailableItemsForRow(currentIndex: number): VendorItem[] {
    const selectedItemIds = this.items
      .filter((_, index) => index !== currentIndex)
      .map((item) => item.itemId)
      .filter((id) => id); // Filter out empty strings

    return this.availableItems.filter(
      (vi) => !selectedItemIds.includes(vi.itemId)
    );
  }

  // Get minimum order quantity for an item
  getMinOrderQuantity(itemId: string): number {
    const vendorItem = this.availableItems.find((vi) => vi.itemId === itemId);
    return vendorItem?.minOrderQuantity || 1;
  }

  isFormValid(): boolean {
    return (
      !!this.vendorId &&
      !!this.purchaseOrderNumber &&
      !!this.orderDate &&
      this.items.length > 0 &&
      this.items.every(
        (item) => (item.itemId || item.description) && item.quantity > 0
      )
    );
  }

  savePurchase() {
    if (!this.isFormValid()) {
      alert('Please fill in all required fields');
      return;
    }

    this.isSaving = true;

    const purchaseData: Partial<Purchase> = {
      vendorId: this.vendorId,
      vendorName: this.getSelectedVendorName(),
      purchaseOrderNumber: this.purchaseOrderNumber,
      orderDate: this.orderDate,
      expectedDeliveryDate: this.expectedDeliveryDate || undefined,
      actualDeliveryDate: this.actualDeliveryDate || undefined,
      status: this.status,
      items: this.items as PurchaseItem[],
      subtotal: this.subtotal,
      tax: this.tax,
      totalAmount: this.totalAmount,
      notes: this.notes || undefined,
      urgent: this.urgent,
      createdBy: this.createdBy || 'System',

      // Risk-related fields
      onTimeDelivery: this.onTimeDelivery ?? undefined,
      deliveryDelayDays: this.deliveryDelayDays ?? undefined,
      qualityRating: this.qualityRating ?? undefined,
      defectCount: this.defectCount ?? undefined,
      defectRate: this.defectRate || undefined,
      returnedItems: this.returnedItems ?? undefined,
      paymentStatus: this.paymentStatus,
      paymentDelayDays: this.paymentDelayDays ?? undefined,
      leadTime: this.leadTime ?? undefined,
      communicationRating: this.communicationRating ?? undefined,
    };

    if (this.isEditMode && this.purchaseId) {
      this.apiService
        .updatePurchase(this.purchaseId, purchaseData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            alert('Purchase order updated successfully!');
            this.router.navigate(['/purchase']);
          },
          error: () => {
            alert('Failed to update purchase order');
            this.isSaving = false;
          },
        });
    } else {
      this.apiService
        .createPurchase(purchaseData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            alert('Purchase order created successfully!');
            this.router.navigate(['/purchase']);
          },
          error: () => {
            alert('Failed to create purchase order');
            this.isSaving = false;
          },
        });
    }
  }

  cancel() {
    this.router.navigate(['/purchase']);
  }
}
