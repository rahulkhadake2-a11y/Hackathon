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

// Interface for item analysis input (should match the component interface)
export interface ItemAnalysisInput {
  itemName: string;
  totalPurchases: number;
  totalQuantity: number;
  avgPrice: number;
  vendorOptions: {
    vendorId: string;
    vendorName: string;
    avgPrice: number;
    totalQuantity: number;
    purchaseCount: number;
    qualityScore: number;
    onTimeDeliveryRate: number;
    riskScore: number;
    isRecommended: boolean;
    lastPurchaseDate?: Date;
    priceVariance?: number;
    reliabilityScore?: number;
  }[];
  recommendedVendor: any | null;
  priceStability?: number;
  demandTrend?: 'increasing' | 'stable' | 'decreasing';
  supplyChainRisk?: number;
  category?: string;
}

// Interface for item analysis result
export interface ItemAnalysisResult {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0-100, higher is better
  insights: string[];
  recommendation: string;
}

// Interface for detailed vendor comparison when analyzing a single item
export interface VendorComparisonResult {
  vendorId: string;
  vendorName: string;
  overallScore: number; // 0-100, higher is better
  rank: number; // 1 = best choice
  isRecommended: boolean;
  scores: {
    price: number; // 0-100
    quality: number; // 0-100
    delivery: number; // 0-100
    reliability: number; // 0-100
    riskScore: number; // 0-100, lower is better
  };
  pros: string[];
  cons: string[];
  costSavingsVsAvg: number; // Positive = savings, negative = premium
  aiVerdict: string; // Short AI recommendation for this vendor
}

// Interface for detailed item vendor analysis
export interface DetailedItemAnalysis {
  itemName: string;
  category: string;
  totalVendors: number;
  vendorComparisons: VendorComparisonResult[];
  bestChoice: VendorComparisonResult | null;
  bestValue: VendorComparisonResult | null; // Best price
  bestQuality: VendorComparisonResult | null; // Highest quality
  mostReliable: VendorComparisonResult | null; // Best delivery + reliability
  overallRecommendation: string;
  procurementStrategy: string;
  riskMitigation: string[];
  costOptimization: string[];
}

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
            console.log("Gemini")
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
   * Analyze item risk using AI
   * This analyzes procurement items across vendors to identify risks,
   * optimize sourcing, and provide actionable recommendations
   */
  async analyzeItem(item: ItemAnalysisInput): Promise<ItemAnalysisResult> {
    try {
      switch (this.currentProvider) {
        case 'gemini':
          if (this.geminiConfig.apiKey) {
            return await this.performGeminiItemAnalysis(item);
          }
          return this.calculateItemRiskLocally(item);

        case 'openai':
          if (this.config.apiKey) {
            return await this.performOpenAIItemAnalysis(item);
          }
          return this.calculateItemRiskLocally(item);

        case 'local':
        default:
          return this.calculateItemRiskLocally(item);
      }
    } catch (error) {
      console.error('Item analysis failed:', error);
      return this.calculateItemRiskLocally(item);
    }
  }

  /**
   * Analyze a single item with detailed vendor comparison
   * This provides a comprehensive analysis of which vendor to choose for an item
   * when the same product can be purchased from multiple vendors
   */
  async analyzeItemVendorComparison(item: ItemAnalysisInput): Promise<DetailedItemAnalysis> {
    try {
      switch (this.currentProvider) {
        case 'gemini':
          if (this.geminiConfig.apiKey) {
            return await this.performGeminiVendorComparison(item);
          }
          return this.calculateVendorComparisonLocally(item);

        case 'openai':
          if (this.config.apiKey) {
            return await this.performOpenAIVendorComparison(item);
          }
          return this.calculateVendorComparisonLocally(item);

        case 'local':
        default:
          return this.calculateVendorComparisonLocally(item);
      }
    } catch (error) {
      console.error('Vendor comparison analysis failed:', error);
      return this.calculateVendorComparisonLocally(item);
    }
  }

  /**
   * Perform vendor comparison using Gemini AI
   */
  private async performGeminiVendorComparison(item: ItemAnalysisInput): Promise<DetailedItemAnalysis> {
    const prompt = this.buildVendorComparisonPrompt(item);

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
              text: `You are an expert procurement analyst. Your task is to compare vendors for an item and recommend the best choice. ${prompt}\n\nRespond ONLY with valid JSON, no markdown or explanation.`
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2500
          }
        })
      });

      if (!response.ok) {
        console.error('Gemini API error for vendor comparison:', response.status);
        return this.calculateVendorComparisonLocally(item);
      }

      const data = await response.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!aiResponse) {
        return this.calculateVendorComparisonLocally(item);
      }

      return this.parseVendorComparisonResponse(aiResponse, item);

    } catch (error) {
      console.error('Gemini vendor comparison failed:', error);
      return this.calculateVendorComparisonLocally(item);
    }
  }

  /**
   * Perform vendor comparison using OpenAI
   */
  private async performOpenAIVendorComparison(item: ItemAnalysisInput): Promise<DetailedItemAnalysis> {
    const prompt = this.buildVendorComparisonPrompt(item);

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
              content: `You are an expert procurement analyst specializing in vendor selection and comparison. Compare vendors for items and provide detailed recommendations. Always respond with valid JSON.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2500,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        return this.calculateVendorComparisonLocally(item);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;
      
      if (!aiResponse) {
        return this.calculateVendorComparisonLocally(item);
      }

      return this.parseVendorComparisonResponse(aiResponse, item);

    } catch (error) {
      console.error('OpenAI vendor comparison failed:', error);
      return this.calculateVendorComparisonLocally(item);
    }
  }

  /**
   * Build prompt for detailed vendor comparison
   */
  private buildVendorComparisonPrompt(item: ItemAnalysisInput): string {
    const vendorDetails = item.vendorOptions.map((v, index) => `
  VENDOR ${index + 1}: ${v.vendorName} (ID: ${v.vendorId})
    - Unit Price: $${v.avgPrice.toFixed(2)}
    - Total Quantity Supplied: ${v.totalQuantity} units
    - Number of Purchases: ${v.purchaseCount}
    - Quality Score: ${v.qualityScore}/100
    - On-Time Delivery Rate: ${v.onTimeDeliveryRate}%
    - Current Risk Score: ${v.riskScore}/100 (lower is better)
    - Price Variance: ${v.priceVariance?.toFixed(2) || 0}%
    - Reliability Score: ${v.reliabilityScore || 'N/A'}/100
    - Last Purchase: ${v.lastPurchaseDate ? new Date(v.lastPurchaseDate).toLocaleDateString() : 'N/A'}`).join('\n');

    const avgPrice = item.avgPrice;

    return `
VENDOR COMPARISON ANALYSIS REQUEST

I need to purchase "${item.itemName}" (Category: ${item.category || 'General'}) and have ${item.vendorOptions.length} vendors who can supply this item.

ITEM DETAILS:
- Item Name: ${item.itemName}
- Category: ${item.category || 'General'}
- Historical Purchases: ${item.totalPurchases}
- Total Quantity Purchased: ${item.totalQuantity} units
- Average Market Price: $${avgPrice.toFixed(2)}
- Demand Trend: ${item.demandTrend || 'stable'}
- Supply Chain Risk: ${item.supplyChainRisk || 50}/100

AVAILABLE VENDORS:
${vendorDetails}

Please analyze each vendor and provide:
1. A score (0-100) for each vendor across: price, quality, delivery, reliability
2. Pros and cons for each vendor
3. Cost savings/premium vs average price
4. Which vendor is BEST OVERALL (balanced)
5. Which vendor is BEST VALUE (price)
6. Which vendor is BEST QUALITY
7. Which vendor is MOST RELIABLE
8. Overall procurement strategy recommendation
9. Risk mitigation suggestions
10. Cost optimization opportunities

Respond in valid JSON format:
{
  "vendorComparisons": [
    {
      "vendorId": "string",
      "vendorName": "string",
      "overallScore": number,
      "rank": number,
      "isRecommended": boolean,
      "scores": {
        "price": number,
        "quality": number,
        "delivery": number,
        "reliability": number,
        "riskScore": number
      },
      "pros": ["string"],
      "cons": ["string"],
      "costSavingsVsAvg": number,
      "aiVerdict": "string"
    }
  ],
  "bestChoiceVendorId": "string",
  "bestValueVendorId": "string",
  "bestQualityVendorId": "string",
  "mostReliableVendorId": "string",
  "overallRecommendation": "string",
  "procurementStrategy": "string",
  "riskMitigation": ["string"],
  "costOptimization": ["string"]
}`;
  }

  /**
   * Parse vendor comparison AI response
   */
  private parseVendorComparisonResponse(aiResponse: string, item: ItemAnalysisInput): DetailedItemAnalysis {
    try {
      let jsonStr = aiResponse.trim();

      // Remove markdown code blocks if present
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      // Find JSON object
      const jsonStartIndex = jsonStr.indexOf('{');
      const jsonEndIndex = jsonStr.lastIndexOf('}');
      if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
        jsonStr = jsonStr.substring(jsonStartIndex, jsonEndIndex + 1);
      }

      const parsed = JSON.parse(jsonStr);

      // Build vendor comparisons
      const vendorComparisons: VendorComparisonResult[] = (parsed.vendorComparisons || []).map((vc: any, index: number) => {
        const originalVendor = item.vendorOptions.find(v => v.vendorId === vc.vendorId || v.vendorName === vc.vendorName);
        return {
          vendorId: vc.vendorId || originalVendor?.vendorId || `V${index}`,
          vendorName: vc.vendorName || originalVendor?.vendorName || `Vendor ${index + 1}`,
          overallScore: Math.max(0, Math.min(100, vc.overallScore || 50)),
          rank: vc.rank || index + 1,
          isRecommended: vc.isRecommended || false,
          scores: {
            price: vc.scores?.price || 50,
            quality: vc.scores?.quality || originalVendor?.qualityScore || 50,
            delivery: vc.scores?.delivery || originalVendor?.onTimeDeliveryRate || 50,
            reliability: vc.scores?.reliability || originalVendor?.reliabilityScore || 50,
            riskScore: vc.scores?.riskScore || originalVendor?.riskScore || 50
          },
          pros: Array.isArray(vc.pros) ? vc.pros : [],
          cons: Array.isArray(vc.cons) ? vc.cons : [],
          costSavingsVsAvg: vc.costSavingsVsAvg || ((item.avgPrice - (originalVendor?.avgPrice || item.avgPrice)) / item.avgPrice * 100),
          aiVerdict: vc.aiVerdict || 'No verdict provided'
        };
      });

      // If AI didn't return comparisons, calculate locally
      if (vendorComparisons.length === 0) {
        return this.calculateVendorComparisonLocally(item);
      }

      // Sort by overall score
      vendorComparisons.sort((a, b) => b.overallScore - a.overallScore);
      vendorComparisons.forEach((vc, idx) => vc.rank = idx + 1);
      if (vendorComparisons.length > 0) {
        vendorComparisons[0].isRecommended = true;
      }

      // Find best in each category
      const findVendor = (vendorId: string) => vendorComparisons.find(v => v.vendorId === vendorId) || null;
      
      const bestChoice = vendorComparisons[0] || null;
      const bestValue = [...vendorComparisons].sort((a, b) => b.scores.price - a.scores.price)[0] || null;
      const bestQuality = [...vendorComparisons].sort((a, b) => b.scores.quality - a.scores.quality)[0] || null;
      const mostReliable = [...vendorComparisons].sort((a, b) => (b.scores.delivery + b.scores.reliability) - (a.scores.delivery + a.scores.reliability))[0] || null;

      return {
        itemName: item.itemName,
        category: item.category || 'General',
        totalVendors: item.vendorOptions.length,
        vendorComparisons,
        bestChoice,
        bestValue: parsed.bestValueVendorId ? findVendor(parsed.bestValueVendorId) : bestValue,
        bestQuality: parsed.bestQualityVendorId ? findVendor(parsed.bestQualityVendorId) : bestQuality,
        mostReliable: parsed.mostReliableVendorId ? findVendor(parsed.mostReliableVendorId) : mostReliable,
        overallRecommendation: parsed.overallRecommendation || `Recommend ${bestChoice?.vendorName} as the best overall choice.`,
        procurementStrategy: parsed.procurementStrategy || 'Continue with current procurement approach.',
        riskMitigation: Array.isArray(parsed.riskMitigation) ? parsed.riskMitigation : ['Monitor vendor performance regularly'],
        costOptimization: Array.isArray(parsed.costOptimization) ? parsed.costOptimization : ['Negotiate volume discounts']
      };

    } catch (error) {
      console.error('Failed to parse vendor comparison response:', error);
      return this.calculateVendorComparisonLocally(item);
    }
  }

  /**
   * Calculate vendor comparison locally without AI
   */
  private calculateVendorComparisonLocally(item: ItemAnalysisInput): DetailedItemAnalysis {
    const avgPrice = item.avgPrice;
    
    // Calculate scores for each vendor
    const vendorComparisons: VendorComparisonResult[] = item.vendorOptions.map((v, index) => {
      // Price score (lower price = higher score)
      const priceDiff = ((avgPrice - v.avgPrice) / avgPrice) * 100;
      const priceScore = Math.max(0, Math.min(100, 50 + priceDiff * 2));
      
      // Quality score
      const qualityScore = v.qualityScore || 80;
      
      // Delivery score
      const deliveryScore = v.onTimeDeliveryRate || 90;
      
      // Reliability score
      const reliabilityScore = v.reliabilityScore || Math.min(100, 50 + v.purchaseCount * 5);
      
      // Risk score (lower is better)
      const riskScore = v.riskScore || 30;
      
      // Overall score (weighted)
      const overallScore = Math.round(
        (priceScore * 0.25) +
        (qualityScore * 0.30) +
        (deliveryScore * 0.25) +
        (reliabilityScore * 0.10) +
        ((100 - riskScore) * 0.10)
      );

      // Generate pros
      const pros: string[] = [];
      if (priceScore >= 60) pros.push(`Competitive pricing ($${v.avgPrice.toFixed(2)})`);
      if (qualityScore >= 90) pros.push(`Excellent quality score (${qualityScore}%)`);
      if (deliveryScore >= 95) pros.push(`Outstanding delivery performance (${deliveryScore}%)`);
      if (v.purchaseCount >= 10) pros.push(`Proven track record (${v.purchaseCount} orders)`);
      if (riskScore <= 20) pros.push('Low risk vendor');
      if (pros.length === 0) pros.push('Acceptable overall performance');

      // Generate cons
      const cons: string[] = [];
      if (priceScore < 40) cons.push(`Higher than average price (+${Math.abs(priceDiff).toFixed(1)}%)`);
      if (qualityScore < 80) cons.push(`Quality concerns (${qualityScore}%)`);
      if (deliveryScore < 85) cons.push(`Delivery issues (${deliveryScore}% on-time)`);
      if (v.purchaseCount < 3) cons.push('Limited purchase history');
      if (riskScore >= 50) cons.push(`Higher risk profile (${riskScore})`);
      if (cons.length === 0) cons.push('No significant concerns');

      // Cost savings vs average
      const costSavingsVsAvg = priceDiff;

      // AI verdict
      let aiVerdict = '';
      if (overallScore >= 80) {
        aiVerdict = 'Excellent choice - highly recommended for this item';
      } else if (overallScore >= 65) {
        aiVerdict = 'Good option - reliable vendor with solid performance';
      } else if (overallScore >= 50) {
        aiVerdict = 'Acceptable - consider for backup or price negotiation';
      } else {
        aiVerdict = 'Caution advised - significant improvement needed';
      }

      return {
        vendorId: v.vendorId,
        vendorName: v.vendorName,
        overallScore,
        rank: 0, // Will be set after sorting
        isRecommended: false,
        scores: {
          price: Math.round(priceScore),
          quality: qualityScore,
          delivery: deliveryScore,
          reliability: Math.round(reliabilityScore),
          riskScore
        },
        pros,
        cons,
        costSavingsVsAvg,
        aiVerdict
      };
    });

    // Sort by overall score and assign ranks
    vendorComparisons.sort((a, b) => b.overallScore - a.overallScore);
    vendorComparisons.forEach((vc, idx) => {
      vc.rank = idx + 1;
      vc.isRecommended = idx === 0;
    });

    // Identify best in each category
    const bestChoice = vendorComparisons[0] || null;
    const bestValue = [...vendorComparisons].sort((a, b) => b.scores.price - a.scores.price)[0] || null;
    const bestQuality = [...vendorComparisons].sort((a, b) => b.scores.quality - a.scores.quality)[0] || null;
    const mostReliable = [...vendorComparisons].sort((a, b) => 
      (b.scores.delivery + b.scores.reliability) - (a.scores.delivery + a.scores.reliability)
    )[0] || null;

    // Generate recommendations
    const overallRecommendation = bestChoice 
      ? `Based on comprehensive analysis, ${bestChoice.vendorName} is the recommended vendor for "${item.itemName}" with an overall score of ${bestChoice.overallScore}/100. They offer the best balance of price, quality, and reliability.`
      : 'Unable to determine a recommended vendor. Consider expanding vendor options.';

    const procurementStrategy = item.vendorOptions.length === 1
      ? `SINGLE SOURCE RISK: Only one vendor available. Urgently qualify additional suppliers to reduce dependency on ${item.vendorOptions[0]?.vendorName}.`
      : item.vendorOptions.length >= 3
        ? `MULTI-SOURCE STRATEGY: With ${item.vendorOptions.length} qualified vendors, consider splitting orders to maintain relationships and leverage competitive pricing.`
        : `DUAL SOURCE: Two vendors available. Maintain both relationships for supply security.`;

    const riskMitigation: string[] = [];
    if (item.vendorOptions.length === 1) {
      riskMitigation.push('Qualify at least one backup vendor to reduce single-source risk');
    }
    if (item.supplyChainRisk && item.supplyChainRisk > 50) {
      riskMitigation.push('Consider safety stock for this high-risk item');
    }
    if (bestChoice && bestChoice.scores.riskScore > 30) {
      riskMitigation.push(`Monitor ${bestChoice.vendorName} closely for potential issues`);
    }
    riskMitigation.push('Conduct quarterly vendor performance reviews');

    const costOptimization: string[] = [];
    if (bestValue && bestChoice && bestValue.vendorId !== bestChoice.vendorId) {
      costOptimization.push(`Consider ${bestValue.vendorName} for non-critical orders (${bestValue.costSavingsVsAvg.toFixed(1)}% savings)`);
    }
    if (item.totalQuantity > 100) {
      costOptimization.push('Negotiate volume discounts for high-quantity purchases');
    }
    costOptimization.push('Consolidate orders to reduce shipping costs');
    if (item.vendorOptions.length >= 2) {
      costOptimization.push('Use competitive bidding to drive better pricing');
    }

    return {
      itemName: item.itemName,
      category: item.category || 'General',
      totalVendors: item.vendorOptions.length,
      vendorComparisons,
      bestChoice,
      bestValue,
      bestQuality,
      mostReliable,
      overallRecommendation,
      procurementStrategy,
      riskMitigation,
      costOptimization
    };
  }

  /**
   * Perform item analysis using Google Gemini
   */
  private async performGeminiItemAnalysis(item: ItemAnalysisInput): Promise<ItemAnalysisResult> {
    const prompt = this.buildItemAnalysisPrompt(item);

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
              text: `You are an expert procurement analyst specializing in item risk assessment and vendor optimization. ${prompt}\n\nRespond ONLY with valid JSON, no markdown or explanation.`
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1500
          }
        })
      });

      if (!response.ok) {
        console.error('Gemini API error for item analysis:', response.status);
        return this.calculateItemRiskLocally(item);
      }

      const data = await response.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!aiResponse) {
        return this.calculateItemRiskLocally(item);
      }

      return this.parseItemAnalysisResponse(aiResponse, item);

    } catch (error) {
      console.error('Gemini item analysis failed:', error);
      return this.calculateItemRiskLocally(item);
    }
  }

  /**
   * Perform item analysis using OpenAI
   */
  private async performOpenAIItemAnalysis(item: ItemAnalysisInput): Promise<ItemAnalysisResult> {
    const prompt = this.buildItemAnalysisPrompt(item);

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
              content: `You are an expert procurement analyst specializing in item risk assessment and vendor optimization. Analyze item data and provide detailed risk assessments in JSON format. Focus on supply chain risks, pricing stability, vendor reliability, and sourcing optimization. Always respond with valid JSON matching the expected schema. Do not include markdown code blocks, just return raw JSON.`
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
        console.error('OpenAI API error for item analysis:', response.status);
        return this.calculateItemRiskLocally(item);
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        return this.calculateItemRiskLocally(item);
      }

      const aiResponse = data.choices[0].message.content;
      return this.parseItemAnalysisResponse(aiResponse, item);

    } catch (error) {
      console.error('OpenAI item analysis failed:', error);
      return this.calculateItemRiskLocally(item);
    }
  }

  /**
   * Build the prompt for item analysis
   */
  private buildItemAnalysisPrompt(item: ItemAnalysisInput): string {
    const vendorDetails = item.vendorOptions.map((v, index) => `
  Vendor ${index + 1}: ${v.vendorName}
    - Average Price: $${v.avgPrice.toFixed(2)}
    - Total Quantity Supplied: ${v.totalQuantity}
    - Purchase Count: ${v.purchaseCount}
    - Quality Score: ${v.qualityScore}/100
    - On-Time Delivery Rate: ${v.onTimeDeliveryRate}%
    - Risk Score: ${v.riskScore}/100
    - Price Variance: ${v.priceVariance?.toFixed(2) || 'N/A'}%
    - Reliability Score: ${v.reliabilityScore || 'N/A'}/100
    - Is Recommended: ${v.isRecommended ? 'Yes' : 'No'}`).join('\n');

    return `
Analyze the following procurement item for risk assessment:

ITEM PROFILE:
- Item Name: ${item.itemName}
- Category: ${item.category || 'General'}
- Total Purchases: ${item.totalPurchases}
- Total Quantity Purchased: ${item.totalQuantity}
- Average Price Across Vendors: $${item.avgPrice.toFixed(2)}

SUPPLY CHAIN METRICS:
- Number of Available Vendors: ${item.vendorOptions.length}
- Supply Chain Risk Score: ${item.supplyChainRisk || 'N/A'}/100
- Price Stability Score: ${item.priceStability || 'N/A'}/100
- Demand Trend: ${item.demandTrend || 'stable'}

VENDOR OPTIONS:
${vendorDetails}

${item.recommendedVendor ? `
CURRENT RECOMMENDED VENDOR: ${item.recommendedVendor.vendorName}
- Avg Price: $${item.recommendedVendor.avgPrice.toFixed(2)}
- Quality Score: ${item.recommendedVendor.qualityScore}/100
- On-Time Delivery: ${item.recommendedVendor.onTimeDeliveryRate}%
` : 'No recommended vendor identified yet.'}

Please provide a comprehensive item risk assessment with:
1. Risk level (low/medium/high/critical) based on supply chain, pricing, and vendor reliability
2. Overall score (0-100, where higher = better/safer procurement option)
3. Key insights (3-5 actionable insights about this item's procurement)
4. Primary recommendation for optimizing this item's procurement

Consider factors like:
- Single-source dependency risk
- Price volatility and stability
- Vendor reliability and quality
- Demand trends and future availability
- Cost optimization opportunities
- Quality consistency across vendors

Respond in valid JSON format matching this structure:
{
  "riskLevel": "low" | "medium" | "high" | "critical",
  "score": number,
  "insights": ["insight1", "insight2", "insight3"],
  "recommendation": "Primary actionable recommendation"
}`;
  }

  /**
   * Parse AI response for item analysis
   */
  private parseItemAnalysisResponse(aiResponse: string, item: ItemAnalysisInput): ItemAnalysisResult {
    try {
      // Extract JSON from response (handle various formats)
      let jsonStr = aiResponse.trim();

      // Remove markdown code blocks if present
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

      // Validate and normalize response
      const validRiskLevels = ['low', 'medium', 'high', 'critical'];
      const riskLevel = validRiskLevels.includes(parsed.riskLevel?.toLowerCase()) 
        ? parsed.riskLevel.toLowerCase() as 'low' | 'medium' | 'high' | 'critical'
        : this.determineItemRiskLevel(parsed.score || 50);

      const score = typeof parsed.score === 'number' 
        ? Math.max(0, Math.min(100, parsed.score))
        : 50;

      const insights = Array.isArray(parsed.insights) && parsed.insights.length > 0
        ? parsed.insights.slice(0, 5).map((i: any) => String(i))
        : this.generateLocalItemInsights(item);

      const recommendation = typeof parsed.recommendation === 'string' && parsed.recommendation.length > 0
        ? parsed.recommendation
        : this.generateLocalItemRecommendation(item);

      return {
        riskLevel,
        score,
        insights,
        recommendation
      };
    } catch (error) {
      console.error('Failed to parse item AI response:', error);
      return this.calculateItemRiskLocally(item);
    }
  }

  /**
   * Calculate item risk locally without AI API
   */
  private calculateItemRiskLocally(item: ItemAnalysisInput): ItemAnalysisResult {
    // Calculate score based on multiple factors
    let score = 50; // Base score

    // Vendor diversity (more vendors = lower risk, higher score)
    const vendorCount = item.vendorOptions.length;
    if (vendorCount === 1) {
      score -= 20; // Single source penalty
    } else if (vendorCount >= 3) {
      score += 15; // Multi-source bonus
    } else {
      score += 5; // Two vendors is okay
    }

    // Price stability
    const priceStability = item.priceStability || 50;
    score += (priceStability - 50) * 0.3;

    // Supply chain risk (lower is better)
    const supplyChainRisk = item.supplyChainRisk || 50;
    score -= (supplyChainRisk - 50) * 0.2;

    // Best vendor quality
    if (item.recommendedVendor) {
      const vendorQuality = item.recommendedVendor.qualityScore || 80;
      const vendorDelivery = item.recommendedVendor.onTimeDeliveryRate || 90;
      score += ((vendorQuality - 80) * 0.15) + ((vendorDelivery - 90) * 0.15);
    }

    // Volume consideration (higher volume = more critical)
    if (item.totalPurchases > 20) {
      score += 5; // Established item
    }

    // Clamp score to valid range
    score = Math.max(0, Math.min(100, Math.round(score)));

    // Determine risk level
    const riskLevel = this.determineItemRiskLevel(score);

    // Generate insights
    const insights = this.generateLocalItemInsights(item);

    // Generate recommendation
    const recommendation = this.generateLocalItemRecommendation(item);

    return {
      riskLevel,
      score,
      insights,
      recommendation
    };
  }

  /**
   * Determine item risk level from score
   */
  private determineItemRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    // Score is "higher = better", so we invert for risk level
    if (score >= 75) return 'low';
    if (score >= 50) return 'medium';
    if (score >= 25) return 'high';
    return 'critical';
  }

  /**
   * Generate local insights for item analysis
   */
  private generateLocalItemInsights(item: ItemAnalysisInput): string[] {
    const insights: string[] = [];

    // Vendor diversity insight
    if (item.vendorOptions.length === 1) {
      insights.push(`Single-source dependency: Only ${item.vendorOptions[0].vendorName} supplies this item. Consider qualifying additional vendors.`);
    } else if (item.vendorOptions.length >= 3) {
      insights.push(`Good vendor diversity with ${item.vendorOptions.length} qualified suppliers, reducing supply chain risk.`);
    } else {
      insights.push(`Moderate vendor base with ${item.vendorOptions.length} suppliers. Consider expanding for critical items.`);
    }

    // Price analysis insight
    if (item.vendorOptions.length > 1) {
      const prices = item.vendorOptions.map(v => v.avgPrice);
      const priceDiff = Math.max(...prices) - Math.min(...prices);
      const priceDiffPercent = (priceDiff / item.avgPrice) * 100;
      
      if (priceDiffPercent > 20) {
        insights.push(`Significant price variation (${priceDiffPercent.toFixed(0)}%) across vendors - opportunity for cost optimization.`);
      } else {
        insights.push(`Price consistency is good across vendors (${priceDiffPercent.toFixed(0)}% variance).`);
      }
    }

    // Quality insight
    if (item.recommendedVendor) {
      const avgQuality = item.vendorOptions.reduce((sum, v) => sum + v.qualityScore, 0) / item.vendorOptions.length;
      if (avgQuality >= 90) {
        insights.push(`Excellent quality performance across vendors (avg ${avgQuality.toFixed(0)}/100).`);
      } else if (avgQuality < 75) {
        insights.push(`Quality scores need attention (avg ${avgQuality.toFixed(0)}/100) - consider vendor quality improvement programs.`);
      }
    }

    // Demand trend insight
    if (item.demandTrend === 'increasing') {
      insights.push('Demand is trending upward - ensure supply capacity can meet growing requirements.');
    } else if (item.demandTrend === 'decreasing') {
      insights.push('Demand is declining - review inventory levels and avoid overstocking.');
    }

    // Supply chain risk insight
    if (item.supplyChainRisk && item.supplyChainRisk > 60) {
      insights.push('High supply chain risk detected - develop contingency sourcing plans.');
    }

    return insights.slice(0, 5); // Limit to 5 insights
  }

  /**
   * Generate local recommendation for item
   */
  private generateLocalItemRecommendation(item: ItemAnalysisInput): string {
    // Priority recommendations based on risk factors
    if (item.vendorOptions.length === 1) {
      return `Qualify additional vendors for ${item.itemName} to mitigate single-source dependency risk. Current sole supplier: ${item.vendorOptions[0].vendorName}.`;
    }

    if (item.vendorOptions.length > 1) {
      const prices = item.vendorOptions.map(v => v.avgPrice);
      const maxPrice = Math.max(...prices);
      const minPrice = Math.min(...prices);
      const priceDiff = ((maxPrice - minPrice) / item.avgPrice) * 100;
      
      if (priceDiff > 25) {
        const cheapestVendor = item.vendorOptions.find(v => v.avgPrice === minPrice);
        return `Consider consolidating purchases with ${cheapestVendor?.vendorName} (lowest price at $${minPrice.toFixed(2)}) if quality meets requirements. Potential savings of ${priceDiff.toFixed(0)}%.`;
      }
    }

    if (item.recommendedVendor && item.recommendedVendor.qualityScore < 80) {
      return `Work with ${item.recommendedVendor.vendorName} on quality improvement program to increase quality score from ${item.recommendedVendor.qualityScore} to target of 90+.`;
    }

    if (item.demandTrend === 'increasing') {
      return `Secure long-term supply agreements to ensure capacity for increasing demand of ${item.itemName}.`;
    }

    return `Continue monitoring ${item.itemName} procurement performance and maintain current vendor relationships.`;
  }

  /**
   * Perform risk analysis using Google Gemini (FREE!)
   */
  private async performGeminiRiskAnalysis(vendor: Vendor): Promise<VendorRiskAssessment> {
    const prompt = this.buildRiskAnalysisPrompt(vendor);

    try {
      const endpoint = `${this.geminiConfig.baseUrl}/${this.geminiConfig.model}:generateContent?key=${this.geminiConfig.apiKey}`;

      const systemContext = `You are an expert vendor risk analyst for procurement. Your task is to calculate accurate risk scores based on vendor performance data.

CRITICAL RULES FOR RISK SCORING:
- Risk Score of 0 = NO RISK (perfect vendor with 100% quality and 100% delivery)
- Risk Score of 100 = MAXIMUM RISK (terrible vendor to avoid)
- A vendor with Quality Score 100/100 and 100% On-Time Delivery should have Risk Score between 0-10
- A vendor with Quality Score 80/100 and 80% On-Time Delivery should have Risk Score around 20-30
- A vendor with Quality Score 60/100 and 60% On-Time Delivery should have Risk Score around 40-50
- A vendor with Quality Score below 50 or Delivery below 50% should have Risk Score 60+

ALWAYS calculate the risk score mathematically based on the provided metrics. Do not randomly generate scores.`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemContext}\n\n${prompt}\n\nRespond ONLY with valid JSON, no markdown or explanation.`
            }]
          }],
          generationConfig: {
            temperature: 0.1,  // Lower temperature for more consistent/accurate results
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

    // Pre-calculate expected risk indicators for the AI
    const qualityScore = vendor.qualityScore || 0;
    const onTimeDeliveryRate = vendor.onTimeDeliveryRate || 0;
    const rating = v.rating || 0;
    
    // Calculate a suggested risk score based on actual metrics
    // Lower is better for risk score (0 = no risk, 100 = maximum risk)
    const qualityRisk = Math.max(0, 100 - qualityScore); // 100 quality = 0 risk
    const deliveryRisk = Math.max(0, 100 - onTimeDeliveryRate); // 100% delivery = 0 risk
    const ratingRisk = rating > 0 ? Math.max(0, (5 - rating) * 20) : 50; // 5 rating = 0 risk
    const suggestedRiskScore = Math.round((qualityRisk * 0.35) + (deliveryRisk * 0.35) + (ratingRisk * 0.30));

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

PERFORMANCE METRICS (CRITICAL FOR RISK CALCULATION):
- On-Time Delivery Rate: ${onTimeDeliveryRate}% ${onTimeDeliveryRate >= 95 ? '(EXCELLENT)' : onTimeDeliveryRate >= 85 ? '(GOOD)' : onTimeDeliveryRate >= 70 ? '(NEEDS IMPROVEMENT)' : '(POOR)'}
- Quality Score: ${qualityScore}/100 ${qualityScore >= 95 ? '(EXCELLENT)' : qualityScore >= 85 ? '(GOOD)' : qualityScore >= 70 ? '(NEEDS IMPROVEMENT)' : '(POOR)'}
- Response Time: ${vendor.responseTime || 0} hours

COMPLIANCE:
- Certifications: ${vendor.certifications?.join(', ') || 'None'}
- Last Audit Date: ${vendor.lastAuditDate || 'Not available'}

RISK CALCULATION GUIDELINES:
The overall risk score should be calculated as follows (IMPORTANT - follow these rules strictly):
- Risk Score = 0 means NO RISK (best case - perfect vendor)
- Risk Score = 100 means MAXIMUM RISK (worst case - avoid this vendor)

Calculate risk based on these weighted factors:
1. Quality Score Impact (35% weight): If quality is 100, quality risk = 0. If quality is 0, quality risk = 100.
   Formula: qualityRisk = 100 - qualityScore
2. Delivery Rate Impact (35% weight): If delivery is 100%, delivery risk = 0. If delivery is 0%, delivery risk = 100.
   Formula: deliveryRisk = 100 - onTimeDeliveryRate
3. Rating Impact (30% weight): If rating is 5/5, rating risk = 0. If rating is 1/5, rating risk = 80.
   Formula: ratingRisk = (5 - rating) * 20

Based on the data provided, the calculated risk score should be approximately: ${suggestedRiskScore}

Risk Level Guidelines:
- Risk Score 0-20: "low" risk (excellent vendor)
- Risk Score 21-40: "medium" risk (acceptable vendor with minor concerns)
- Risk Score 41-60: "high" risk (significant concerns, needs monitoring)
- Risk Score 61-100: "critical" risk (serious issues, consider alternatives)

Please provide a comprehensive risk assessment with:
1. Overall risk score (0-100, where 0 = no risk, 100 = maximum risk) - USE THE CALCULATION GUIDELINES ABOVE
2. Risk level (low/medium/high/critical) - MUST MATCH THE RISK SCORE
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

      // Validate and correct the AI's risk score if it's clearly wrong
      let aiRiskScore = parsed.overallRiskScore;
      const qualityScore = vendor.qualityScore || 0;
      const onTimeDeliveryRate = vendor.onTimeDeliveryRate || 0;
      
      // Calculate expected risk score for validation
      const qualityRisk = Math.max(0, 100 - qualityScore);
      const deliveryRisk = Math.max(0, 100 - onTimeDeliveryRate);
      const v = vendor as any;
      const rating = v.rating || 3;
      const ratingRisk = Math.max(0, (5 - rating) * 20);
      const expectedRiskScore = Math.round((qualityRisk * 0.35) + (deliveryRisk * 0.35) + (ratingRisk * 0.30));
      
      // If AI score is way off from expected (more than 30 points difference), use calculated score
      const scoreDifference = Math.abs(aiRiskScore - expectedRiskScore);
      if (scoreDifference > 30) {
        console.warn(`AI risk score (${aiRiskScore}) significantly differs from calculated (${expectedRiskScore}). Using calculated score.`);
        aiRiskScore = expectedRiskScore;
      }
      
      // Clamp the score to valid range
      aiRiskScore = Math.max(0, Math.min(100, aiRiskScore));

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

      // Determine risk level based on the validated/corrected score
      const finalRiskLevel = this.determineRiskLevel(aiRiskScore);

      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        assessmentDate: new Date(),
        overallRiskScore: aiRiskScore,
        riskLevel: finalRiskLevel,
        riskFactors,
        aiInsights,
        recommendations,
        historicalTrend: this.generateMockTrend(),
        comparisonToPeers: {
          averageRiskScore: 45,
          percentile: this.calculatePercentile(aiRiskScore),
          betterThanPeers: aiRiskScore < 45
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
      description: `Quality score of ${qualityScore}/100 (based on customer ratings)`,
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
   * Risk Score Guidelines:
   * - 0-20: low risk (excellent vendor)
   * - 21-40: medium risk (acceptable vendor with minor concerns)
   * - 41-60: high risk (significant concerns, needs monitoring)
   * - 61-100: critical risk (serious issues, consider alternatives)
   */
  private determineRiskLevel(score: number): RiskLevel {
    if (score >= 61) return 'critical';
    if (score >= 41) return 'high';
    if (score >= 21) return 'medium';
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
