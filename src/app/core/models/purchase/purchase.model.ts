export interface Purchase {
  id: string;
  vendorId: string;
  vendorName: string;
  orderDate: Date;
  deliveryDate?: Date;
  expectedDeliveryDate: Date;
  
  // Order details
  items: PurchaseItem[];
  totalAmount: number;
  currency: string;
  
  // Status
  status: PurchaseStatus;
  paymentStatus: PaymentStatus;
  
  // Quality
  qualityIssues?: QualityIssue[];
  returnedItems?: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

export interface PurchaseItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
}

export type PurchaseStatus = 
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export type PaymentStatus = 
  | 'pending'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'refunded';

export interface QualityIssue {
  id: string;
  type: 'defect' | 'damage' | 'wrong-item' | 'quantity-mismatch' | 'other';
  description: string;
  severity: 'low' | 'medium' | 'high';
  resolved: boolean;
  resolutionDate?: Date;
}

export interface PurchaseAnalytics {
  totalPurchases: number;
  totalValue: number;
  averageOrderValue: number;
  onTimeDeliveryRate: number;
  qualityIssueRate: number;
  topVendors: { vendorId: string; vendorName: string; totalValue: number }[];
  purchasesByCategory: { category: string; count: number; value: number }[];
  monthlyTrend: { month: string; value: number; count: number }[];
}
