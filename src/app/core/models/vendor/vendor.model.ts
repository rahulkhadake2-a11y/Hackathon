export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  category: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
  
  // Financial metrics
  totalPurchases: number;
  averageOrderValue: number;
  paymentTerms: number; // days
  creditLimit: number;
  outstandingBalance: number;
  
  // Performance metrics
  onTimeDeliveryRate: number; // percentage
  qualityScore: number; // 0-100
  responseTime: number; // hours
  defectRate: number; // percentage
  
  // Compliance
  certifications?: string[];
  complianceStatus: 'compliant' | 'non-compliant' | 'pending-review';
  lastAuditDate?: Date;
  
  // Risk related
  riskScore?: number;
  riskLevel?: RiskLevel;
  riskFactors?: RiskFactor[];
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskFactor {
  category: RiskCategory;
  name: string;
  description: string;
  severity: RiskLevel;
  score: number; // 0-100
  recommendation?: string;
}

export type RiskCategory = 
  | 'financial'
  | 'operational'
  | 'compliance'
  | 'reputational'
  | 'supply-chain'
  | 'market'
  | 'geopolitical'
  | 'technology'
  | 'performance'
  | string; // Allow any string for AI-generated categories

export interface VendorRiskAssessment {
  vendorId: string;
  vendorName: string;
  assessmentDate: Date;
  overallRiskScore: number;
  riskLevel: RiskLevel;
  riskFactors: RiskFactor[];
  aiInsights: AIRiskInsight[];
  recommendations: string[];
  historicalTrend: RiskTrendPoint[];
  comparisonToPeers?: PeerComparison;
}

export interface AIRiskInsight {
  id: string;
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  confidence: number; // 0-1
  category: RiskCategory;
  actionRequired: boolean;
  suggestedActions?: string[];
}

export interface RiskTrendPoint {
  date: Date;
  riskScore: number;
  riskLevel: RiskLevel;
}

export interface PeerComparison {
  averageRiskScore: number;
  percentile: number;
  betterThanPeers: boolean;
}

export interface VendorMetrics {
  vendorId: string;
  period: string;
  revenue: number;
  orderCount: number;
  averageLeadTime: number;
  returnRate: number;
  disputeCount: number;
  satisfactionScore: number;
}
