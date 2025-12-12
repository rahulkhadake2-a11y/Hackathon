import { RiskCategory, RiskLevel } from '../vendor/vendor.model';

export interface Insight {
  id: string;
  title: string;
  description: string;
  type: InsightType;
  category: InsightCategory;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  isRead: boolean;
  actionable: boolean;
  actions?: InsightAction[];
  relatedVendorIds?: string[];
  metrics?: InsightMetric[];
}

export type InsightType = 
  | 'risk-alert'
  | 'opportunity'
  | 'trend'
  | 'anomaly'
  | 'recommendation'
  | 'compliance'
  | 'performance';

export type InsightCategory = 
  | 'vendor-risk'
  | 'cost-optimization'
  | 'supply-chain'
  | 'market-trend'
  | 'compliance'
  | 'performance'
  | 'forecast';

export interface InsightAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary';
  action: string;
  completed: boolean;
}

export interface InsightMetric {
  label: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
}

// AI-specific insights
export interface AIAnalysisResult {
  id: string;
  analysisType: AIAnalysisType;
  timestamp: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  
  // Results
  summary: string;
  insights: AIInsight[];
  riskAssessment?: AIRiskResult;
  predictions?: AIPrediction[];
  
  // Metadata
  modelUsed: string;
  confidence: number;
  processingTime: number; // milliseconds
}

export type AIAnalysisType = 
  | 'vendor-risk'
  | 'spend-analysis'
  | 'market-analysis'
  | 'fraud-detection'
  | 'demand-forecast'
  | 'supplier-diversification';

export interface AIInsight {
  id: string;
  title: string;
  content: string;
  category: RiskCategory | InsightCategory;
  severity: RiskLevel;
  confidence: number;
  supportingData?: Record<string, any>;
  recommendations: string[];
}

export interface AIRiskResult {
  overallScore: number;
  level: RiskLevel;
  factors: AIRiskFactor[];
  trend: 'improving' | 'stable' | 'declining';
  nextReviewDate: Date;
}

export interface AIRiskFactor {
  name: string;
  category: RiskCategory;
  score: number;
  weight: number;
  description: string;
  indicators: string[];
  mitigationStrategies: string[];
}

export interface AIPrediction {
  metric: string;
  currentValue: number;
  predictedValue: number;
  predictedDate: Date;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  factors: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    tokens?: number;
    model?: string;
    analysisType?: AIAnalysisType;
  };
}
