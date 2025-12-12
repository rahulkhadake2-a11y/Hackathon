import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormGroup,
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  FormsModule,
  FormArray,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService, Vendor } from '../../core/services/api/api.service';

interface KeyValue {
  key: string;
  value: string;
}

interface OpBalance {
  referenceDate: string;
  reference: string;
  chequeNo: string;
  debit: number;
  credit: number;
  exchangeRate: number;
  dueDate: string;
}

interface BudgetRow {
  Slno: number;
  Periodending: number;
  Amount: number;
  isEditing: boolean;
}

interface UserRow {
  selectedUsers: string[];
  isEditing: boolean;
}

interface UploadedDocument {
  name: string;
  size: number;
  uploadedOn: Date;
  docUrl: string;
}

interface CostCenter {
  id: number;
  costCenterName: string;
  code: string;
}

interface Branch {
  branchName: string;
  code: string;
  isVisible: boolean;
}

@Component({
  selector: 'app-add-vendor',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './add-vendor.component.html',
  styleUrl: './add-vendor.component.css',
})
export class AddVendorComponent implements OnInit {
  // Form
  supplierForm!: FormGroup;
  opBalanceForm!: FormGroup;
  budgetForm!: FormGroup;
  costCenterTabForm!: FormGroup;

  // Mode
  isEditMode = false;
  vendorId: string | null = null;
  pageLoading = true;

  // Tabs
  activeTab = '0';

  // Pagination
  rows = 10;

  // Dropdown options
  accountType: KeyValue[] = [
    { key: 'Supplier', value: 'supplier' },
    { key: 'Manufacturer', value: 'manufacturer' },
    { key: 'Distributor', value: 'distributor' },
    { key: 'Wholesaler', value: 'wholesaler' },
  ];

  accountStatus: KeyValue[] = [
    { key: 'Active', value: 'active' },
    { key: 'Inactive', value: 'inactive' },
    { key: 'Pending', value: 'pending' },
    { key: 'Suspended', value: 'suspended' },
  ];

  accountCurrency: KeyValue[] = [
    { key: 'USD - US Dollar', value: 'USD' },
    { key: 'EUR - Euro', value: 'EUR' },
    { key: 'GBP - British Pound', value: 'GBP' },
    { key: 'INR - Indian Rupee', value: 'INR' },
    { key: 'AED - UAE Dirham', value: 'AED' },
  ];

  // Op Balance
  opBalanceTableHeader = [
    'Ref Date',
    'Reference',
    'Chq No',
    'Debit',
    'Credit',
    'Exchange Rate',
    'Due Date',
  ];
  opBalanceData: OpBalance[] = [];
  isOpBalanceDialogVisible = false;
  editingOpBalanceIndex: number | null = null;

  // Budget
  Budget: BudgetRow[] = [];
  financialYear = '';
  allocateValue = '';
  isBudgetDialogVisible = false;
  selectedBudgetIndex: number | null = null;

  // Cost Centers
  costCentersData: CostCenter[] = [
    { id: 1, costCenterName: 'Head Office', code: 'HO001' },
    { id: 2, costCenterName: 'Branch Office', code: 'BO001' },
    { id: 3, costCenterName: 'Warehouse', code: 'WH001' },
    { id: 4, costCenterName: 'Distribution Center', code: 'DC001' },
  ];

  branchesData: Branch[] = [
    { branchName: 'New York Branch', code: 'NY001', isVisible: false },
    { branchName: 'Los Angeles Branch', code: 'LA001', isVisible: false },
    { branchName: 'Chicago Branch', code: 'CH001', isVisible: false },
    { branchName: 'Houston Branch', code: 'HO001', isVisible: false },
  ];

  // Documents
  uploadedDocument: UploadedDocument[] = [];

  // Users
  users: UserRow[] = [];
  userslist: KeyValue[] = [
    { key: 'John Smith', value: 'john.smith' },
    { key: 'Jane Doe', value: 'jane.doe' },
    { key: 'Bob Wilson', value: 'bob.wilson' },
    { key: 'Alice Brown', value: 'alice.brown' },
    { key: 'Charlie Davis', value: 'charlie.davis' },
  ];

  // Permissions (for demo, all enabled)
  permissionData = {
    canAccess: true,
    canEdit: true,
    canDelete: true,
  };

  // Breadcrumb
  breadcrumbItems = [
    { label: 'Home', route: '/dashboard' },
    { label: 'Vendors', route: '/vendors' },
    { label: 'Add Vendor', route: '' },
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.checkEditMode();

    // Simulate loading
    setTimeout(() => {
      this.pageLoading = false;
    }, 800);
  }

  initForms(): void {
    // Main supplier form - field names match Vendor interface
    this.supplierForm = this.fb.group({
      vendorName: ['', [Validators.required, Validators.minLength(3)]],
      contactPerson: [''],
      email: ['', [Validators.email]],
      phone: [''],
      category: ['General'],
      status: ['active'],
      address: [''],
      city: [''],
      country: [''],
      taxId: [''],
      paymentTerms: ['Net 30'],
      creditLimit: [0],
    });

    // Op Balance form
    this.opBalanceForm = this.fb.group({
      referenceDate: [''],
      reference: [''],
      chequeNo: [''],
      debit: [0],
      credit: [0],
      exchangeRate: [1],
      dueDate: [''],
    });

    // Budget form
    this.budgetForm = this.fb.group({
      Slno: ['', Validators.required],
      Periodending: ['', Validators.required],
      Amount: ['', Validators.required],
    });

    // Cost center form
    this.costCenterTabForm = this.fb.group({
      costCenterName: ['', Validators.required],
    });
  }

  checkEditMode(): void {
    this.vendorId = this.route.snapshot.paramMap.get('id');
    if (this.vendorId && this.vendorId !== 'new') {
      this.isEditMode = true;
      this.loadVendorData();
    }
  }

  loadVendorData(): void {
    if (!this.vendorId) return;

    // Load vendor data from API
    this.apiService.getVendorById(this.vendorId).subscribe({
      next: (vendor) => {
        if (vendor) {
          this.supplierForm.patchValue({
            vendorName: vendor.vendorName,
            contactPerson: vendor.contactPerson,
            email: vendor.email,
            phone: vendor.phone,
            category: vendor.category,
            status: vendor.status,
            address: vendor.address || '',
            city: vendor.city || '',
            country: vendor.country || '',
            taxId: vendor.taxId || '',
            paymentTerms: vendor.paymentTerms || 'Net 30',
            creditLimit: vendor.creditLimit || 0,
          });
        }
        this.pageLoading = false;
      },
      error: (err: Error) => {
        console.error('Error loading vendor:', err);
        this.pageLoading = false;
      },
    });

    this.opBalanceData = [
      {
        referenceDate: '2024-01-15',
        reference: 'REF001',
        chequeNo: 'CHQ123',
        debit: 5000,
        credit: 0,
        exchangeRate: 1,
        dueDate: '2024-02-15',
      },
    ];
  }

  get getFormControl() {
    return this.supplierForm.controls;
  }

  get getCostCenterForm() {
    return this.costCenterTabForm.controls;
  }

  get createbranchform(): FormArray {
    return this.fb.array(
      this.branchesData.map((branch) =>
        this.fb.group({
          branchName: [branch.branchName],
          code: [branch.code],
          isVisible: [branch.isVisible],
        })
      )
    );
  }

  // Tab handling
  onTabChange(tabIndex: string): void {
    this.activeTab = tabIndex;
  }

  // Op Balance handlers
  handleOpBalanceDialog(): void {
    this.editingOpBalanceIndex = null;
    this.opBalanceForm.reset({
      debit: 0,
      credit: 0,
      exchangeRate: 1,
    });
    this.isOpBalanceDialogVisible = true;
  }

  handleEditBalance(index: number): void {
    this.editingOpBalanceIndex = index;
    const balance = this.opBalanceData[index];
    this.opBalanceForm.patchValue(balance);
    this.isOpBalanceDialogVisible = true;
  }

  handleSaveOpBalance(): void {
    if (this.opBalanceForm.valid) {
      const formData = this.opBalanceForm.value;
      if (this.editingOpBalanceIndex !== null) {
        this.opBalanceData[this.editingOpBalanceIndex] = formData;
      } else {
        this.opBalanceData.push(formData);
      }
      this.isOpBalanceDialogVisible = false;
      this.opBalanceForm.reset();
    }
  }

  handleDeleteOpBalance(index: number): void {
    if (confirm('Are you sure you want to delete this entry?')) {
      this.opBalanceData.splice(index, 1);
    }
  }

  handledDailogCancel(): void {
    this.isOpBalanceDialogVisible = false;
    this.opBalanceForm.reset();
  }

  // Budget handlers
  addBudgetRow(): void {
    this.selectedBudgetIndex = null;
    this.budgetForm.reset();
    this.isBudgetDialogVisible = true;
  }

  editBudgetRow(index: number): void {
    this.selectedBudgetIndex = index;
    const row = this.Budget[index];
    this.budgetForm.patchValue({
      Slno: row.Slno,
      Periodending: row.Periodending,
      Amount: row.Amount,
    });
    this.isBudgetDialogVisible = true;
  }

  deleteBudgetRow(index: number): void {
    if (confirm('Are you sure you want to delete this budget entry?')) {
      this.Budget.splice(index, 1);
    }
  }

  handleSaveBudget(): void {
    if (this.budgetForm.valid) {
      const formData = {
        ...this.budgetForm.value,
        isEditing: false,
      };
      if (this.selectedBudgetIndex !== null) {
        this.Budget[this.selectedBudgetIndex] = formData;
      } else {
        this.Budget.push(formData);
      }
      this.isBudgetDialogVisible = false;
      this.budgetForm.reset();
    }
  }

  handleBudgetDialogCancel(): void {
    this.isBudgetDialogVisible = false;
    this.budgetForm.reset();
  }

  allocate(): void {
    if (this.allocateValue && this.Budget.length > 0) {
      const amount = parseFloat(this.allocateValue) / this.Budget.length;
      this.Budget.forEach((row) => {
        row.Amount = amount;
      });
    }
  }

  // Document upload handler
  onDocumentUpload(event: any): void {
    const file = event.files?.[0];
    if (file) {
      const doc: UploadedDocument = {
        name: file.name,
        size: file.size / 1024,
        uploadedOn: new Date(),
        docUrl: URL.createObjectURL(file),
      };
      this.uploadedDocument.push(doc);
    }
  }

  // User handlers
  addUserRow(): void {
    this.users.push({
      selectedUsers: [],
      isEditing: true,
    });
  }

  editUserRow(index: number): void {
    this.users[index].isEditing = !this.users[index].isEditing;
  }

  deleteUserRow(index: number): void {
    if (confirm('Are you sure you want to delete this user entry?')) {
      this.users.splice(index, 1);
    }
  }

  // Form submission
  saveSupplierData(): void {
    if (this.supplierForm.valid) {
      const formValues = this.supplierForm.value;

      // Map form data to Vendor interface
      const vendorData: Partial<Vendor> = {
        vendorName: formValues.vendorName,
        contactPerson: formValues.contactPerson || '',
        email: formValues.email || '',
        phone: formValues.phone || '',
        category: formValues.category || 'General',
        status: formValues.status || 'active',
        address: formValues.address || '',
        city: formValues.city || '',
        country: formValues.country || '',
        taxId: formValues.taxId || '',
        paymentTerms: formValues.paymentTerms || 'Net 30',
        creditLimit: formValues.creditLimit || 0,
        totalPurchases: 0,
        rating: 0,
      };

      this.pageLoading = true;

      if (this.isEditMode && this.vendorId) {
        // Update existing vendor
        this.apiService.updateVendor(this.vendorId, vendorData).subscribe({
          next: () => {
            this.pageLoading = false;
            alert('Vendor updated successfully!');
            this.router.navigate(['/vendors']);
          },
          error: (err: Error) => {
            this.pageLoading = false;
            console.error('Error updating vendor:', err);
            alert('Error updating vendor. Please try again.');
          },
        });
      } else {
        // Create new vendor
        this.apiService.createVendor(vendorData).subscribe({
          next: (createdVendor) => {
            this.pageLoading = false;
            console.log('Vendor created:', createdVendor);
            alert('Vendor created successfully!');
            this.router.navigate(['/vendors']);
          },
          error: (err: Error) => {
            this.pageLoading = false;
            console.error('Error creating vendor:', err);
            alert('Error creating vendor. Please try again.');
          },
        });
      }
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.supplierForm.controls).forEach((key) => {
        this.supplierForm.get(key)?.markAsTouched();
      });
    }
  }

  returnToHome(): void {
    this.router.navigate(['/vendors']);
  }

  // File input trigger
  triggerFileInput(): void {
    const fileInput = document.getElementById(
      'documentUpload'
    ) as HTMLInputElement;
    fileInput?.click();
  }

  handleFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const doc: UploadedDocument = {
        name: file.name,
        size: file.size / 1024,
        uploadedOn: new Date(),
        docUrl: URL.createObjectURL(file),
      };
      this.uploadedDocument.push(doc);
    }
  }

  deleteDocument(index: number): void {
    if (confirm('Are you sure you want to delete this document?')) {
      this.uploadedDocument.splice(index, 1);
    }
  }
}
