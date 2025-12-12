import { RiskLevel } from '../vendor/vendor.model';

export interface Scorecard {
  id: string;
  vendorId: string;
  vendorName: string;
  period: string;
  
  // Overall scores
  overallScore: number;
  previousScore?: number;
  trend: 'up' | 'down' | 'stable';
  
  // Category scores
  financialScore: number;
  operationalScore: number;
  qualityScore: number;
  complianceScore: number;
  
  // Risk integration
  riskScore?: number;
  riskLevel?: RiskLevel;
  
  // Performance metrics
  metrics: ScorecardMetric[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface ScorecardMetric {
  id: string;
  name: string;
  category: 'financial' | 'operational' | 'quality' | 'compliance' | 'risk';
  value: number;
  target: number;
  unit: string;
  weight: number;
  status: 'met' | 'below' | 'above';
  trend: 'improving' | 'stable' | 'declining';
}

export interface ScorecardSummary {
  totalVendors: number;
  averageScore: number;
  topPerformers: { vendorId: string; vendorName: string; score: number }[];
  bottomPerformers: { vendorId: string; vendorName: string; score: number }[];
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  scoreDistribution: {
    excellent: number; // 90-100
    good: number; // 70-89
    fair: number; // 50-69
    poor: number; // 0-49
  };
}