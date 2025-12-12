import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, delay, map } from 'rxjs';
import { 
  Vendor, 
  VendorRiskAssessment, 
  RiskFactor, 
  RiskLevel, 
  RiskCategory,
  AIRiskInsight 
} from '../../models/vendor/vendor.model';
import { 
  AIAnalysisResult, 
  AIInsight, 
  ChatMessage,
  AIAnalysisType 
} from '../../models/insights/insights.model';

export interface AIConfig {
  apiKey: string;
  endpoint: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export type AIProvider = 'local' | 'openai' | 'gemini';

@Injectable({
  providedIn: 'root'
})
export class AIRiskAnalysisService {
  private config: AIConfig = {
    apiKey: '',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-3.5-turbo',
    maxTokens: 2000,
    temperature: 0.3
  };

  // Gemini config (FREE!)
  private geminiConfig = {
    apiKey: '',
    // Only use the working model
    model: 'gemma-3-1b-it',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models'
  };

  private analysisHistory = new BehaviorSubject<AIAnalysisResult[]>([]);
  private chatHistory = new BehaviorSubject<ChatMessage[]>([]);
  private isAnalyzing = new BehaviorSubject<boolean>(false);
  
  // Current AI provider
  private currentProvider: AIProvider = 'local';

  constructor() {}

  // Set AI provider
  setProvider(provider: AIProvider): void {
    this.currentProvider = provider;
  }

  getProvider(): AIProvider {
    return this.currentProvider;
  }

  // Set Gemini API key (FREE from Google)
  setGeminiApiKey(apiKey: string): void {
    this.geminiConfig.apiKey = apiKey;
    // List available models when key is set
    this.listAvailableGeminiModels();
  }

  // List available Gemini models for debugging
  async listAvailableGeminiModels(): Promise<string[]> {
    if (!this.geminiConfig.apiKey) {
      return [];
    }
    
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${this.geminiConfig.apiKey}`
      );
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      const models = data.models?.map((m: any) => m.name) || [];
      
      // Filter for models that support generateContent
      const generateModels = data.models
        ?.filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        ?.map((m: any) => m.name.replace('models/', '')) || [];      
      return generateModels;
    } catch (error) {
      return [];
    }
  }

  hasGeminiKey(): boolean {
    return !!this.geminiConfig.apiKey;
  }

  // Legacy support for local toggle
  setUseLocalAnalysis(useLocal: boolean): void {
    this.currentProvider = useLocal ? 'local' : 'openai';
  }

  getUseLocalAnalysis(): boolean {
    return this.currentProvider === 'local';
  }

  // Configure the AI service
  configure(config: Partial<AIConfig>): void {
    this.config = { ...this.config, ...config };
  }

  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
  }

  hasApiKey(): boolean {
    return !!this.config.apiKey && this.config.apiKey.length > 0;
  }

  getApiKeyStatus(): string {
    if (!this.config.apiKey) return 'Not configured';
    return `Configured (${this.config.apiKey.substring(0, 10)}...)`;
  }

  get isAnalyzing$(): Observable<boolean> {
    return this.isAnalyzing.asObservable();
  }

  get analysisHistory$(): Observable<AIAnalysisResult[]> {
    return this.analysisHistory.asObservable();
  }

  get chatHistory$(): Observable<ChatMessage[]> {
    return this.chatHistory.asObservable();
  }

  /**
   * Analyze vendor risk using AI
   */
  async analyzeVendorRisk(vendor: Vendor): Promise<VendorRiskAssessment> {
    this.isAnalyzing.next(true);

    try {
      switch (this.currentProvider) {
        case 'gemini':
          if (this.geminiConfig.apiKey) {
            return await this.performGeminiRiskAnalysis(vendor);
          }
          return this.calculateRiskLocally(vendor);
          
        case 'openai':
          if (this.config.apiKey) {
            return await this.performAIRiskAnalysis(vendor);
          }
          return this.calculateRiskLocally(vendor);
          
        case 'local':
        default:
          return this.calculateRiskLocally(vendor);
      }
    } finally {
      this.isAnalyzing.next(false);
    }
  }

  /**
   * Perform risk analysis using Google Gemini (FREE!)
   */
  private async performGeminiRiskAnalysis(vendor: Vendor): Promise<VendorRiskAssessment> {
    const prompt = this.buildRiskAnalysisPrompt(vendor);
    
    try {
      const endpoint = `${this.geminiConfig.baseUrl}/${this.geminiConfig.model}:generateContent?key=${this.geminiConfig.apiKey}`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an expert vendor risk analyst. ${prompt}\n\nRespond ONLY with valid JSON, no markdown or explanation.`
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2000
          }
        })
      });

      if (!response.ok) {
        return this.calculateRiskLocally(vendor);
      }

      const data = await response.json();
      
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!aiResponse) {
        return this.calculateRiskLocally(vendor);
      }
      
      return this.parseAIRiskResponse(aiResponse, vendor);
      
    } catch (error) {
      return this.calculateRiskLocally(vendor);
    }
  }

  /**
   * Perform AI-powered risk analysis via API
   */
  private async performAIRiskAnalysis(vendor: Vendor): Promise<VendorRiskAssessment> {
    const prompt = this.buildRiskAnalysisPrompt(vendor);
    
    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: `You are an expert vendor risk analyst. Analyze vendor data and provide detailed risk assessments in JSON format. 
              Focus on financial stability, operational reliability, compliance status, and market position.
              Always respond with valid JSON matching the expected schema. Do not include markdown code blocks, just return raw JSON.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature
        })
      });

      if (!response.ok) {
        return this.calculateRiskLocally(vendor);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        return this.calculateRiskLocally(vendor);
      }
      
      const aiResponse = data.choices[0].message.content;
      return this.parseAIRiskResponse(aiResponse, vendor);
      
    } catch (error) {
      return this.calculateRiskLocally(vendor);
    }
  }

  /**
   * Build the prompt for risk analysis
   */
  private buildRiskAnalysisPrompt(vendor: Vendor): string {
    // Cast to any to access extended properties from API
    const v = vendor as any;
    
    return `
Analyze the following vendor for risk assessment:

VENDOR PROFILE:
- Name: ${vendor.name}
- Category: ${vendor.category}
- Status: ${vendor.status}
- Compliance Status: ${vendor.complianceStatus}
- Email: ${vendor.email || 'Not provided'}
- Phone: ${vendor.phone || 'Not provided'}

FINANCIAL METRICS:
- Total Purchases Value: $${vendor.totalPurchases?.toLocaleString() || '0'}
- Average Order Value: $${vendor.averageOrderValue?.toLocaleString() || '0'}
- Credit Limit: $${vendor.creditLimit?.toLocaleString() || '0'}
- Outstanding Balance: $${vendor.outstandingBalance?.toLocaleString() || '0'}
- Payment Terms: ${vendor.paymentTerms || 30} days

PURCHASE HISTORY:
- Number of Purchase Orders: ${v.purchaseCount || 0}
- Delivered Orders: ${v.deliveredCount || 0}
- Vendor Rating: ${v.rating || 'Not rated'}/5

PERFORMANCE METRICS:
- On-Time Delivery Rate: ${vendor.onTimeDeliveryRate || 0}%
- Quality Score: ${vendor.qualityScore || 0}/100
- Defect Rate: ${vendor.defectRate || 0}%
- Response Time: ${vendor.responseTime || 0} hours

COMPLIANCE:
- Certifications: ${vendor.certifications?.join(', ') || 'None'}
- Last Audit Date: ${vendor.lastAuditDate || 'Not available'}

Please provide a comprehensive risk assessment with:
1. Overall risk score (0-100, where higher = more risk)
2. Risk level (low/medium/high/critical)
3. Detailed risk factors by category (financial, operational, compliance, etc.)
4. AI-powered insights with confidence levels
5. Specific recommendations for risk mitigation

Respond in valid JSON format matching this structure:
{
  "overallRiskScore": number,
  "riskLevel": "low" | "medium" | "high" | "critical",
  "riskFactors": [
    {
      "category": string,
      "name": string,
      "description": string,
      "severity": "low" | "medium" | "high" | "critical",
      "score": number,
      "recommendation": string
    }
  ],
  "aiInsights": [
    {
      "title": string,
      "description": string,
      "impact": "positive" | "negative" | "neutral",
      "confidence": number,
      "category": string,
      "actionRequired": boolean,
      "suggestedActions": string[]
    }
  ],
  "recommendations": string[]
}`;
  }

  /**
   * Parse AI response into VendorRiskAssessment
   */
  private parseAIRiskResponse(aiResponse: string, vendor: Vendor): VendorRiskAssessment {
    try {
      // Extract JSON from response (handle various formats)
      let jsonStr = aiResponse.trim();
      
      // Remove markdown code blocks if present (handles ```json, ```, with newlines or spaces)
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      
      // Try to find JSON object in the response
      const jsonStartIndex = jsonStr.indexOf('{');
      const jsonEndIndex = jsonStr.lastIndexOf('}');
      if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonStartIndex < jsonEndIndex) {
        jsonStr = jsonStr.substring(jsonStartIndex, jsonEndIndex + 1);
      }
      
      const parsed = JSON.parse(jsonStr);
      
      // Validate required fields exist
      if (!parsed.overallRiskScore && parsed.overallRiskScore !== 0) {
        return this.calculateRiskLocally(vendor);
      }
      
      const riskFactors = (parsed.riskFactors || []).map((rf: any) => ({
        category: (rf.category || 'general').toLowerCase(),
        name: rf.name || 'Unknown Factor',
        description: rf.description || '',
        severity: (rf.severity || 'medium').toLowerCase() as RiskLevel,
        score: rf.score || 50,
        recommendation: rf.recommendation || '',
        id: this.generateId()
      }));
      
      const aiInsights = (parsed.aiInsights || []).map((insight: any) => ({
        title: insight.title || 'Insight',
        description: insight.description || '',
        impact: (insight.impact || 'neutral').toLowerCase() as 'positive' | 'negative' | 'neutral',
        // Handle confidence as integer (0-100) or decimal (0-1)
        confidence: insight.confidence 
          ? (insight.confidence > 1 ? insight.confidence / 100 : insight.confidence) 
          : 0.7,
        category: insight.category || 'general',
        actionRequired: insight.actionRequired || false,
        suggestedActions: insight.suggestedActions || 
          (insight.actionRequired ? ['Review and take appropriate action'] : []),
        id: this.generateId()
      }));
      
      const recommendations = parsed.recommendations || ['Review vendor periodically'];
      
      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        assessmentDate: new Date(),
        overallRiskScore: parsed.overallRiskScore || 50,
        riskLevel: (parsed.riskLevel || this.determineRiskLevel(parsed.overallRiskScore || 50)).toLowerCase() as RiskLevel,
        riskFactors,
        aiInsights,
        recommendations,
        historicalTrend: this.generateMockTrend(),
        comparisonToPeers: {
          averageRiskScore: 45,
          percentile: this.calculatePercentile(parsed.overallRiskScore || 50),
          betterThanPeers: (parsed.overallRiskScore || 50) < 45
        }
      };
    } catch (error) {
      return this.calculateRiskLocally(vendor);
    }
  }

  /**
   * Calculate risk locally without AI API
   */
  calculateRiskLocally(vendor: Vendor): VendorRiskAssessment {
    const riskFactors = this.analyzeRiskFactors(vendor);
    const overallRiskScore = this.calculateOverallScore(riskFactors);
    const riskLevel = this.determineRiskLevel(overallRiskScore);

    return {
      vendorId: vendor.id,
      vendorName: vendor.name,
      assessmentDate: new Date(),
      overallRiskScore,
      riskLevel,
      riskFactors,
      aiInsights: this.generateLocalInsights(vendor, riskFactors),
      recommendations: this.generateRecommendations(riskFactors),
      historicalTrend: this.generateMockTrend(),
      comparisonToPeers: {
        averageRiskScore: 45,
        percentile: this.calculatePercentile(overallRiskScore),
        betterThanPeers: overallRiskScore < 45
      }
    };
  }

  /**
   * Analyze individual risk factors
   */
  private analyzeRiskFactors(vendor: Vendor): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Safely get values with defaults
    const outstandingBalance = vendor.outstandingBalance || 0;
    const creditLimit = vendor.creditLimit || 50000;
    const paymentTerms = vendor.paymentTerms || 30;
    const onTimeDeliveryRate = vendor.onTimeDeliveryRate || 100;
    const qualityScore = vendor.qualityScore || 100;
    const defectRate = vendor.defectRate || 0;
    const responseTime = vendor.responseTime || 12;
    const totalPurchases = vendor.totalPurchases || 0;

    // Financial Risk
    const utilizationRate = creditLimit > 0 ? outstandingBalance / creditLimit : 0;
    factors.push({
      category: 'financial',
      name: 'Credit Utilization',
      description: `Vendor is using ${(utilizationRate * 100).toFixed(1)}% of credit limit`,
      severity: utilizationRate > 0.8 ? 'high' : utilizationRate > 0.5 ? 'medium' : 'low',
      score: Math.min(utilizationRate * 100, 100),
      recommendation: utilizationRate > 0.8 
        ? 'Consider reviewing credit terms or requiring prepayment' 
        : 'Credit utilization is within acceptable range'
    });

    // Payment Terms Risk
    factors.push({
      category: 'financial',
      name: 'Payment Terms Risk',
      description: `Payment terms of ${paymentTerms} days`,
      severity: paymentTerms > 60 ? 'high' : paymentTerms > 30 ? 'medium' : 'low',
      score: Math.min((paymentTerms / 90) * 100, 100),
      recommendation: paymentTerms > 60 
        ? 'Extended payment terms increase financial exposure' 
        : 'Payment terms are standard'
    });

    // Operational Risk - Delivery Performance
    const deliveryRisk = 100 - onTimeDeliveryRate;
    factors.push({
      category: 'operational',
      name: 'Delivery Reliability',
      description: `On-time delivery rate of ${onTimeDeliveryRate}%`,
      severity: deliveryRisk > 20 ? 'high' : deliveryRisk > 10 ? 'medium' : 'low',
      score: deliveryRisk,
      recommendation: deliveryRisk > 20 
        ? 'Implement delivery monitoring and backup supplier strategy' 
        : 'Delivery performance is satisfactory'
    });

    // Quality Risk
    factors.push({
      category: 'operational',
      name: 'Quality Performance',
      description: `Quality score of ${qualityScore}/100 with ${defectRate}% defect rate`,
      severity: qualityScore < 70 ? 'high' : qualityScore < 85 ? 'medium' : 'low',
      score: 100 - qualityScore,
      recommendation: qualityScore < 70 
        ? 'Quality improvement plan required' 
        : 'Quality levels are acceptable'
    });

    // Response Time Risk
    factors.push({
      category: 'operational',
      name: 'Responsiveness',
      description: `Average response time of ${responseTime} hours`,
      severity: responseTime > 48 ? 'high' : responseTime > 24 ? 'medium' : 'low',
      score: Math.min((responseTime / 72) * 100, 100),
      recommendation: responseTime > 48 
        ? 'Communication SLAs should be established' 
        : 'Response time is adequate'
    });

    // Compliance Risk
    const complianceStatus = vendor.complianceStatus || 'pending-review';
    factors.push({
      category: 'compliance',
      name: 'Compliance Status',
      description: `Current compliance status: ${complianceStatus}`,
      severity: complianceStatus === 'non-compliant' ? 'critical' 
        : complianceStatus === 'pending-review' ? 'medium' : 'low',
      score: complianceStatus === 'non-compliant' ? 100 
        : complianceStatus === 'pending-review' ? 50 : 10,
      recommendation: complianceStatus === 'non-compliant' 
        ? 'Immediate compliance review and remediation required' 
        : 'Continue regular compliance monitoring'
    });

    // Certification Risk
    const certCount = vendor.certifications?.length || 0;
    factors.push({
      category: 'compliance',
      name: 'Certifications',
      description: `Vendor has ${certCount} certification(s)`,
      severity: certCount === 0 ? 'medium' : 'low',
      score: certCount === 0 ? 60 : Math.max(40 - certCount * 10, 10),
      recommendation: certCount === 0 
        ? 'Request relevant industry certifications' 
        : 'Certification status is adequate'
    });

    // Supply Chain Concentration Risk
    const concentrationRisk = totalPurchases > 100000 ? 70 : totalPurchases > 50000 ? 40 : 20;
    factors.push({
      category: 'supply-chain',
      name: 'Concentration Risk',
      description: `Total purchases of $${totalPurchases.toLocaleString()} may indicate dependency`,
      severity: concentrationRisk > 60 ? 'high' : concentrationRisk > 30 ? 'medium' : 'low',
      score: concentrationRisk,
      recommendation: concentrationRisk > 60 
        ? 'Develop alternative supplier strategy to reduce dependency' 
        : 'Supplier concentration is manageable'
    });

    return factors;
  }

  /**
   * Calculate overall risk score from factors
   */
  private calculateOverallScore(factors: RiskFactor[]): number {
    const weights: Record<RiskCategory, number> = {
      'financial': 0.25,
      'operational': 0.25,
      'compliance': 0.20,
      'supply-chain': 0.15,
      'reputational': 0.05,
      'market': 0.05,
      'geopolitical': 0.05
    };

    let totalWeight = 0;
    let weightedSum = 0;

    factors.forEach(factor => {
      const weight = weights[factor.category] || 0.05;
      weightedSum += factor.score * weight;
      totalWeight += weight;
    });

    return Math.round(weightedSum / totalWeight);
  }

  /**
   * Determine risk level from score
   */
  private determineRiskLevel(score: number): RiskLevel {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  /**
   * Generate insights locally
   */
  private generateLocalInsights(vendor: Vendor, factors: RiskFactor[]): AIRiskInsight[] {
    const insights: AIRiskInsight[] = [];

    // Financial Health Insight
    const financialFactors = factors.filter(f => f.category === 'financial');
    const avgFinancialScore = financialFactors.reduce((a, b) => a + b.score, 0) / financialFactors.length;
    
    insights.push({
      id: this.generateId(),
      title: 'Financial Health Assessment',
      description: avgFinancialScore > 50 
        ? `Financial indicators show elevated risk. Credit utilization and payment terms require attention.`
        : `Financial indicators are within acceptable range. Continue monitoring key metrics.`,
      impact: avgFinancialScore > 50 ? 'negative' : 'positive',
      confidence: 0.85,
      category: 'financial',
      actionRequired: avgFinancialScore > 50,
      suggestedActions: avgFinancialScore > 50 
        ? ['Review credit terms', 'Request updated financial statements', 'Consider reducing order volume']
        : ['Maintain current monitoring frequency']
    });

    // Operational Performance Insight
    insights.push({
      id: this.generateId(),
      title: 'Operational Performance Analysis',
      description: vendor.onTimeDeliveryRate < 90 || vendor.qualityScore < 80
        ? `Operational metrics indicate performance gaps. Delivery rate: ${vendor.onTimeDeliveryRate}%, Quality: ${vendor.qualityScore}/100`
        : `Strong operational performance. Vendor maintains high delivery and quality standards.`,
      impact: vendor.onTimeDeliveryRate < 90 || vendor.qualityScore < 80 ? 'negative' : 'positive',
      confidence: 0.90,
      category: 'operational',
      actionRequired: vendor.onTimeDeliveryRate < 90 || vendor.qualityScore < 80,
      suggestedActions: vendor.onTimeDeliveryRate < 90 
        ? ['Establish delivery SLAs', 'Implement delivery tracking', 'Develop contingency plans']
        : ['Continue current monitoring']
    });

    // Compliance Insight
    insights.push({
      id: this.generateId(),
      title: 'Compliance Risk Evaluation',
      description: vendor.complianceStatus === 'compliant'
        ? `Vendor maintains compliant status with ${vendor.certifications?.length || 0} active certifications.`
        : `Compliance status requires attention. Current status: ${vendor.complianceStatus}`,
      impact: vendor.complianceStatus === 'compliant' ? 'positive' : 'negative',
      confidence: 0.95,
      category: 'compliance',
      actionRequired: vendor.complianceStatus !== 'compliant',
      suggestedActions: vendor.complianceStatus !== 'compliant'
        ? ['Schedule compliance audit', 'Request compliance documentation', 'Review regulatory requirements']
        : ['Schedule next compliance review']
    });

    // Supply Chain Dependency Insight
    insights.push({
      id: this.generateId(),
      title: 'Supply Chain Dependency Analysis',
      description: vendor.totalPurchases > 100000
        ? `High purchasing volume ($${vendor.totalPurchases.toLocaleString()}) indicates significant dependency on this vendor.`
        : `Moderate vendor dependency. Consider maintaining current diversification strategy.`,
      impact: vendor.totalPurchases > 100000 ? 'negative' : 'neutral',
      confidence: 0.80,
      category: 'supply-chain',
      actionRequired: vendor.totalPurchases > 100000,
      suggestedActions: vendor.totalPurchases > 100000
        ? ['Identify alternative suppliers', 'Develop dual-sourcing strategy', 'Assess criticality of supplied items']
        : ['Continue monitoring supplier landscape']
    });

    return insights;
  }

  /**
   * Generate recommendations based on risk factors
   */
  private generateRecommendations(factors: RiskFactor[]): string[] {
    const recommendations: string[] = [];
    
    const criticalFactors = factors.filter(f => f.severity === 'critical');
    const highFactors = factors.filter(f => f.severity === 'high');

    if (criticalFactors.length > 0) {
      recommendations.push('URGENT: Address critical risk factors immediately to prevent potential business disruption');
    }

    if (highFactors.length > 0) {
      recommendations.push(`Develop mitigation plans for ${highFactors.length} high-risk factor(s)`);
    }

    // Category-specific recommendations
    const categories = [...new Set(factors.map(f => f.category))];
    categories.forEach(category => {
      const categoryFactors = factors.filter(f => f.category === category);
      const avgScore = categoryFactors.reduce((a, b) => a + b.score, 0) / categoryFactors.length;
      
      if (avgScore > 50) {
        switch (category) {
          case 'financial':
            recommendations.push('Review financial terms and consider requesting financial guarantees');
            break;
          case 'operational':
            recommendations.push('Implement enhanced monitoring and establish performance SLAs');
            break;
          case 'compliance':
            recommendations.push('Schedule compliance audit and review regulatory requirements');
            break;
          case 'supply-chain':
            recommendations.push('Develop alternative supplier strategy to reduce concentration risk');
            break;
        }
      }
    });

    recommendations.push('Schedule quarterly risk review meetings with vendor');
    recommendations.push('Update vendor risk assessment in 90 days');

    return recommendations;
  }

  /**
   * Chat with AI about vendor risks
   */
  async chatAboutRisk(
    message: string, 
    vendorContext?: Vendor,
    assessmentContext?: VendorRiskAssessment
  ): Promise<string> {
    const userMessage: ChatMessage = {
      id: this.generateId(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    const currentHistory = this.chatHistory.getValue();
    this.chatHistory.next([...currentHistory, userMessage]);

    if (!this.config.apiKey) {
      // Return helpful response without AI
      const response = this.generateLocalChatResponse(message, vendorContext, assessmentContext);
      const assistantMessage: ChatMessage = {
        id: this.generateId(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      this.chatHistory.next([...this.chatHistory.getValue(), assistantMessage]);
      return response;
    }

    try {
      const contextPrompt = this.buildChatContext(vendorContext, assessmentContext);
      
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: `You are an expert vendor risk analyst assistant. Help users understand vendor risks, provide recommendations, and answer questions about risk management. ${contextPrompt}`
            },
            ...currentHistory.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: message }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      });

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      const assistantMessage: ChatMessage = {
        id: this.generateId(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        metadata: {
          model: this.config.model,
          tokens: data.usage?.total_tokens
        }
      };

      this.chatHistory.next([...this.chatHistory.getValue(), assistantMessage]);
      return aiResponse;
    } catch (error) {
      const errorResponse = 'I apologize, but I encountered an error processing your request. Please try again.';
      const errorMessage: ChatMessage = {
        id: this.generateId(),
        role: 'assistant',
        content: errorResponse,
        timestamp: new Date()
      };
      this.chatHistory.next([...this.chatHistory.getValue(), errorMessage]);
      return errorResponse;
    }
  }

  private buildChatContext(vendor?: Vendor, assessment?: VendorRiskAssessment): string {
    if (!vendor && !assessment) return '';

    let context = '\n\nCurrent Context:';
    
    if (vendor) {
      context += `\nVendor: ${vendor.name} (${vendor.category})`;
      context += `\nStatus: ${vendor.status}, Compliance: ${vendor.complianceStatus}`;
    }
    
    if (assessment) {
      context += `\nRisk Score: ${assessment.overallRiskScore}/100 (${assessment.riskLevel})`;
      context += `\nKey Risk Factors: ${assessment.riskFactors.slice(0, 3).map(f => f.name).join(', ')}`;
    }

    return context;
  }

  private generateLocalChatResponse(
    message: string, 
    vendor?: Vendor, 
    assessment?: VendorRiskAssessment
  ): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('risk') && lowerMessage.includes('score')) {
      return assessment 
        ? `The current risk score for ${vendor?.name || 'this vendor'} is ${assessment.overallRiskScore}/100, classified as ${assessment.riskLevel} risk. The main contributing factors are: ${assessment.riskFactors.slice(0, 3).map(f => f.name).join(', ')}.`
        : 'Please run a risk assessment first to get the risk score.';
    }

    if (lowerMessage.includes('recommend') || lowerMessage.includes('suggestion')) {
      return assessment
        ? `Here are the key recommendations:\n\n${assessment.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
        : 'Run a risk assessment to get specific recommendations for this vendor.';
    }

    if (lowerMessage.includes('compliance')) {
      return vendor
        ? `Compliance Status: ${vendor.complianceStatus}\nCertifications: ${vendor.certifications?.join(', ') || 'None on record'}\nLast Audit: ${vendor.lastAuditDate || 'Not available'}`
        : 'Please select a vendor to view compliance information.';
    }

    if (lowerMessage.includes('financial')) {
      return vendor
        ? `Financial Overview:\n- Total Purchases: $${vendor.totalPurchases.toLocaleString()}\n- Credit Limit: $${vendor.creditLimit.toLocaleString()}\n- Outstanding Balance: $${vendor.outstandingBalance.toLocaleString()}\n- Payment Terms: ${vendor.paymentTerms} days`
        : 'Please select a vendor to view financial information.';
    }

    return 'I can help you analyze vendor risks, understand risk scores, get recommendations, and answer questions about compliance or financial metrics. What would you like to know?';
  }

  /**
   * Bulk analyze multiple vendors
   */
  async analyzeMultipleVendors(vendors: Vendor[]): Promise<VendorRiskAssessment[]> {
    const assessments: VendorRiskAssessment[] = [];
    
    for (const vendor of vendors) {
      const assessment = await this.analyzeVendorRisk(vendor);
      assessments.push(assessment);
    }

    return assessments.sort((a, b) => b.overallRiskScore - a.overallRiskScore);
  }

  /**
   * Get risk distribution analysis
   */
  getRiskDistribution(assessments: VendorRiskAssessment[]): Record<RiskLevel, number> {
    const distribution: Record<RiskLevel, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    assessments.forEach(a => {
      distribution[a.riskLevel]++;
    });

    return distribution;
  }

  clearChatHistory(): void {
    this.chatHistory.next([]);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private calculatePercentile(score: number): number {
    // Mock percentile calculation
    return Math.max(0, Math.min(100, 100 - score));
  }

  private generateMockTrend(): { date: Date; riskScore: number; riskLevel: RiskLevel }[] {
    const trend = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const score = Math.floor(Math.random() * 30) + 30; // 30-60 range
      trend.push({
        date,
        riskScore: score,
        riskLevel: this.determineRiskLevel(score)
      });
    }
    
    return trend;
  }
}
