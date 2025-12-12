import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import {
  DocumentScannerService,
  ExtractedDocumentData,
  ScanProgress,
  ExtractedField,
} from '../../core/services/document-scanner/document-scanner.service';
import { ApiService } from '../../core/services/api/api.service';

@Component({
  selector: 'app-document-scanner',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './document-scanner.component.html',
  styleUrls: ['./document-scanner.component.css'],
})
export class DocumentScannerComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // State
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  isProcessing = false;
  scanProgress: ScanProgress | null = null;
  extractedData: ExtractedDocumentData | null = null;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  // Edit mode
  isEditing = false;
  editForm!: FormGroup;

  // Vendors for dropdown
  vendors: { id: string; name: string }[] = [];

  // Drag and drop state
  isDragOver = false;

  constructor(
    private documentScanner: DocumentScannerService,
    private apiService: ApiService,
    private fb: FormBuilder,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initEditForm();
    this.loadVendors();
  }

  private initEditForm(): void {
    this.editForm = this.fb.group({
      vendorName: ['', Validators.required],
      vendorId: [''],
      invoiceNumber: [''],
      grnNumber: [''],
      poNumber: [''],
      totalAmount: [0, [Validators.required, Validators.min(0)]],
      subtotal: [0, Validators.min(0)],
      taxAmount: [0, Validators.min(0)],
      taxRate: [0, Validators.min(0)],
      invoiceDate: [''],
      dueDate: [''],
      currency: ['USD'],
      notes: [''],
    });
  }

  private loadVendors(): void {
    this.apiService.getVendorOptions().subscribe({
      next: (vendors) => {
        this.vendors = vendors;
      },
      error: (err) => console.error('Error loading vendors:', err),
    });
  }

  // File selection via button
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  // Drag and drop handlers
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  // Handle file selection
  private handleFile(file: File): void {
    this.clearMessages();
    this.extractedData = null;
    this.isEditing = false;

    // Validate file type
    const validTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/webp',
      'application/pdf',
    ];
    if (!validTypes.includes(file.type)) {
      this.errorMessage =
        'Invalid file type. Please upload an image (PNG, JPG, JPEG, GIF, WEBP) or PDF.';
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.errorMessage = 'File size too large. Maximum size is 10MB.';
      return;
    }

    this.selectedFile = file;

    // Create preview URL
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }
    this.previewUrl = URL.createObjectURL(file);
  }

  // Trigger file input click
  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  // Scan document
  scanDocument(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Please select a document first.';
      return;
    }

    this.clearMessages();
    this.isProcessing = true;
    this.extractedData = null;

    this.documentScanner
      .scanDocument(this.selectedFile, (progress) => {
        this.scanProgress = progress;
      })
      .subscribe({
        next: (data) => {
          this.extractedData = data;
          this.isProcessing = false;
          this.scanProgress = null;
          this.populateEditForm(data);
          this.successMessage =
            'Document scanned successfully! Review and edit the extracted data below.';
        },
        error: (err) => {
          this.isProcessing = false;
          this.scanProgress = null;
          this.errorMessage =
            err.message || 'Failed to scan document. Please try again.';
          console.error('Scan error:', err);
        },
      });
  }

  // Populate edit form with extracted data
  private populateEditForm(data: ExtractedDocumentData): void {
    this.editForm.patchValue({
      vendorName: data.vendorName || '',
      invoiceNumber: data.invoiceNumber || '',
      grnNumber: data.grnNumber || '',
      poNumber: data.poNumber || '',
      totalAmount: data.totalAmount || 0,
      subtotal: data.subtotal || 0,
      taxAmount: data.taxAmount || 0,
      taxRate: data.taxRate || 0,
      invoiceDate: data.invoiceDate || '',
      dueDate: data.dueDate || '',
      currency: data.currency || 'USD',
      notes: '',
    });

    // Try to match vendor
    if (data.vendorName) {
      const matchedVendor = this.vendors.find(
        (v) =>
          v.name.toLowerCase().includes(data.vendorName!.toLowerCase()) ||
          data.vendorName!.toLowerCase().includes(v.name.toLowerCase())
      );
      if (matchedVendor) {
        this.editForm.patchValue({ vendorId: matchedVendor.id });
      }
    }
  }

  // Toggle edit mode
  toggleEditMode(): void {
    this.isEditing = !this.isEditing;
  }

  // Create purchase order from extracted data
  createPurchaseOrder(): void {
    if (!this.extractedData || !this.editForm.valid) {
      this.errorMessage = 'Please complete all required fields.';
      return;
    }

    const formData = this.editForm.value;

    const purchaseData = {
      vendorId: formData.vendorId || '',
      vendorName: formData.vendorName,
      purchaseOrderNumber:
        formData.poNumber || formData.invoiceNumber || `PO-${Date.now()}`,
      orderDate: formData.invoiceDate || new Date().toISOString().split('T')[0],
      expectedDeliveryDate: formData.dueDate || '',
      status: 'pending' as const,
      items:
        this.extractedData.lineItems.length > 0
          ? this.extractedData.lineItems
          : [
              {
                description: 'Items from invoice',
                quantity: 1,
                unitPrice: formData.subtotal,
                total: formData.subtotal,
              },
            ],
      subtotal: formData.subtotal,
      tax: formData.taxAmount,
      totalAmount: formData.totalAmount,
      notes: `Extracted from ${
        this.extractedData.documentType
      } document. Invoice #: ${formData.invoiceNumber || 'N/A'}. ${
        formData.notes || ''
      }`,
    };

    this.apiService.createPurchase(purchaseData).subscribe({
      next: (created) => {
        this.successMessage = `Purchase order created successfully! PO #: ${created.purchaseOrderNumber}`;
        setTimeout(() => {
          this.router.navigate(['/purchase']);
        }, 2000);
      },
      error: (err) => {
        this.errorMessage =
          'Failed to create purchase order. Please try again.';
        console.error('Error creating purchase:', err);
      },
    });
  }

  // Clear current document
  clearDocument(): void {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }
    this.selectedFile = null;
    this.previewUrl = null;
    this.extractedData = null;
    this.isEditing = false;
    this.clearMessages();
    this.initEditForm();

    // Reset file input
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  // Clear messages
  private clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }

  // Get document type icon
  getDocumentTypeIcon(): string {
    if (!this.extractedData) return 'bi-file-earmark';
    switch (this.extractedData.documentType) {
      case 'invoice':
        return 'bi-receipt';
      case 'grn':
        return 'bi-box-seam';
      case 'purchase_order':
        return 'bi-cart-check';
      default:
        return 'bi-file-earmark';
    }
  }

  // Get document type label
  getDocumentTypeLabel(): string {
    if (!this.extractedData) return 'Document';
    switch (this.extractedData.documentType) {
      case 'invoice':
        return 'Invoice';
      case 'grn':
        return 'Goods Receipt Note';
      case 'purchase_order':
        return 'Purchase Order';
      default:
        return 'Unknown Document';
    }
  }

  // Get confidence color class
  getConfidenceClass(confidence: number): string {
    if (confidence >= 0.9) return 'confidence-high';
    if (confidence >= 0.7) return 'confidence-medium';
    return 'confidence-low';
  }

  // Get confidence label
  getConfidenceLabel(confidence: number): string {
    if (confidence >= 0.9) return 'High';
    if (confidence >= 0.7) return 'Medium';
    return 'Low';
  }

  // Format currency
  formatCurrency(amount: number | null, currency: string = 'USD'): string {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  // Copy to clipboard
  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      // Show brief success indication
    });
  }

  // Download raw text
  downloadRawText(): void {
    if (!this.extractedData?.rawText) return;

    const blob = new Blob([this.extractedData.rawText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extracted-text-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
