import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import {
  AIRiskAnalysisService,
  AIProvider,
  ItemAnalysisInput,
  DetailedItemAnalysis,
  VendorComparisonResult,
} from '../../core/services/ai-risk-analysis/ai-risk-analysis.service';
import { ApiService, Purchase, Item, VendorItem } from '../../core/services/api/api.service';
import {
  Vendor,
  VendorRiskAssessment,
  RiskFactor,
  RiskLevel,
  AIRiskInsight,
} from '../../core/models/vendor/vendor.model';
import { ChatMessage } from '../../core/models/insights/insights.model';
import { AiAnalyzedCountPipe } from '../../shared/pipes/ai-analyzed-count.pipe';

// Interface for item analysis
interface ItemVendorOption {
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
  leadTimeDays?: number;
  isPreferred?: boolean;
  minOrderQuantity?: number;
}

interface ItemAnalysis {
  itemName: string;
  itemCode?: string;
  masterItemId?: string;
  totalPurchases: number;
  totalQuantity: number;
  avgPrice: number;
  vendorOptions: ItemVendorOption[];
  recommendedVendor: ItemVendorOption | null;
  // AI Analysis fields
  aiAnalyzed?: boolean;
  aiRiskLevel?: 'low' | 'medium' | 'high' | 'critical';
  aiScore?: number;
  aiInsights?: string[];
  aiRecommendation?: string;
  supplyChainRisk?: number;
  priceStability?: number;
  demandTrend?: 'increasing' | 'stable' | 'decreasing';
  category?: string;
  lastUpdated?: Date;
  // Detailed vendor comparison (when analyzing single item)
  detailedAnalysis?: DetailedItemAnalysis;
}

@Component({
  selector: 'app-risk-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule, AiAnalyzedCountPipe],
  templateUrl: './risk-analysis.component.html',
  styleUrl: './risk-analysis.component.css',
})
export class RiskAnalysisComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // State
  isAnalyzing = false;
  isLoadingVendors = false;
  isLoadingItems = false;
  selectedVendor: Vendor | null = null;
  currentAssessment: VendorRiskAssessment | null = null;
  chatMessages: ChatMessage[] = [];
  chatInput = '';
  isChatting = false;
  apiKeyInput = '';
  geminiKeyInput = '';
  showApiKeyModal = false;
  activeTab: 'overview' | 'factors' | 'insights' | 'chat' = 'overview';
  
  // Main view mode: 'vendor' or 'items'
  viewMode: 'vendor' | 'items' = 'vendor';

  // Item Analysis
  itemAnalysisList: ItemAnalysis[] = [];
  filteredItemAnalysis: ItemAnalysis[] = [];
  itemSearchQuery = '';
  itemSortBy: 'name' | 'purchases' | 'savings' | 'risk' | 'score' = 'score';
  isAnalyzingItems = false;
  itemAnalysisProgress = 0;
  selectedItemForDetail: ItemAnalysis | null = null;
  
  // Detailed vendor comparison modal
  showVendorComparisonModal = false;
  vendorComparisonResult: DetailedItemAnalysis | null = null;
  isAnalyzingVendorComparison = false;
  
  // Track expanded items (by item name)
  expandedItems: Set<string> = new Set();

  // Vendors loaded from API with purchase metrics
  vendors: Vendor[] = [];

  constructor(
    private aiRiskService: AIRiskAnalysisService,
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  // Add error message property
  errorMessage: string = '';

  get apiKeyStatus(): string {
    return this.aiRiskService.getApiKeyStatus();
  }

  get hasApiKey(): boolean {
    return this.aiRiskService.hasApiKey();
  }

  get useLocalAnalysis(): boolean {
    return this.aiRiskService.getUseLocalAnalysis();
  }

  get currentProvider(): AIProvider {
    return this.aiRiskService.getProvider();
  }

  setProvider(provider: AIProvider): void {
    this.aiRiskService.setProvider(provider);
  }

  toggleAnalysisMode(): void {
    const newMode = !this.aiRiskService.getUseLocalAnalysis();
    this.aiRiskService.setUseLocalAnalysis(newMode);
  }

  // Save Gemini API Key (FREE!)
  setGeminiKey(): void {
    if (this.geminiKeyInput.trim()) {
      this.aiRiskService.setGeminiApiKey(this.geminiKeyInput.trim());
      localStorage.setItem('gemini_api_key', this.geminiKeyInput.trim());
      this.geminiKeyInput = '';
      alert('Gemini API Key saved! This is FREE to use.');
    }
  }

  get hasGeminiKey(): boolean {
    return this.aiRiskService.hasGeminiKey();
  }

  ngOnInit(): void {
    // Load vendors from API with purchase metrics
    this.loadVendors();

    // Load saved API keys from localStorage
    const savedApiKey = localStorage.getItem('openai_api_key');
    if (savedApiKey) {
      this.aiRiskService.setApiKey(savedApiKey);
    }

    // Load Gemini key (FREE!)
    const savedGeminiKey = localStorage.getItem('gemini_api_key');
    if (savedGeminiKey) {
      this.aiRiskService.setGeminiApiKey(savedGeminiKey);
    }

    this.aiRiskService.isAnalyzing$
      .pipe(takeUntil(this.destroy$))
      .subscribe((analyzing) => (this.isAnalyzing = analyzing));

    this.aiRiskService.chatHistory$
      .pipe(takeUntil(this.destroy$))
      .subscribe((messages) => (this.chatMessages = messages));
  }

  loadVendors(): void {
    this.isLoadingVendors = true;
    this.apiService
      .getVendorsWithPurchaseMetrics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (vendors) => {
          this.vendors = vendors;
          this.isLoadingVendors = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Failed to load vendors from API';
          this.isLoadingVendors = false;
          this.cdr.detectChanges();
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectVendor(vendor: Vendor): void {
    this.selectedVendor = vendor;
    this.currentAssessment = null;
    this.errorMessage = '';
    this.aiRiskService.clearChatHistory();
  }

  async runRiskAnalysis(): Promise<void> {
    if (!this.selectedVendor) return;

    this.errorMessage = '';
    try {
      this.currentAssessment = await this.aiRiskService.analyzeVendorRisk(
        this.selectedVendor
      );
      this.cdr.detectChanges();
    } catch (error) {
      this.errorMessage =
        'Risk analysis failed. Using local calculation instead.';
      this.cdr.detectChanges();
    }
  }

  async sendChatMessage(): Promise<void> {
    if (!this.chatInput.trim() || this.isChatting) return;

    this.isChatting = true;
    const message = this.chatInput;
    this.chatInput = '';

    try {
      await this.aiRiskService.chatAboutRisk(
        message,
        this.selectedVendor || undefined,
        this.currentAssessment || undefined
      );
    } catch (error) {
      // Chat error handled silently
    } finally {
      this.isChatting = false;
    }
  }

  setApiKey(): void {
    if (this.apiKeyInput.trim()) {
      this.aiRiskService.setApiKey(this.apiKeyInput.trim());
      this.showApiKeyModal = false;
      // Store in localStorage for persistence
      localStorage.setItem('openai_api_key', this.apiKeyInput.trim());
      this.apiKeyInput = '';
      alert('API Key saved successfully!');
    }
  }

  async testApiConnection(): Promise<void> {
    this.errorMessage = '';
    const apiKey = localStorage.getItem('openai_api_key') || '';

    if (!apiKey) {
      this.errorMessage =
        'No API key configured. Click "Configure AI" to add your OpenAI API key.';
      alert('No API key configured. Please add your API key first.');
      return;
    }

    try {
      // Simple test call
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        alert('API connection successful! ✓');
      } else {
        const error = await response.json();
        this.errorMessage = `API Error: ${
          error.error?.message || response.statusText
        }`;
        alert(`API Error: ${error.error?.message || response.statusText}`);
      }
    } catch (error) {
      this.errorMessage = 'Failed to connect to OpenAI API.';
      alert('Failed to connect to OpenAI API');
    }
  }

  getRiskLevelClass(level: RiskLevel | string): string {
    const classes: Record<string, string> = {
      low: 'risk-low',
      medium: 'risk-medium',
      high: 'risk-high',
      critical: 'risk-critical',
    };
    const normalizedLevel = (level || 'medium').toLowerCase();
    return classes[normalizedLevel] || 'risk-medium';
  }

  getRiskScoreColor(score: number): string {
    if (score >= 75) return '#dc3545';
    if (score >= 50) return '#fd7e14';
    if (score >= 25) return '#ffc107';
    return '#28a745';
  }

  getImpactClass(impact: 'positive' | 'negative' | 'neutral' | string): string {
    const classes: Record<string, string> = {
      positive: 'impact-positive',
      negative: 'impact-negative',
      neutral: 'impact-neutral',
    };
    const normalizedImpact = (impact || 'neutral').toLowerCase();
    return classes[normalizedImpact] || 'impact-neutral';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  }

  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      financial: 'bi-currency-dollar',
      operational: 'bi-gear',
      compliance: 'bi-shield-check',
      'supply-chain': 'bi-diagram-3',
      reputational: 'bi-star',
      market: 'bi-graph-up',
      geopolitical: 'bi-globe',
      technology: 'bi-cpu',
      performance: 'bi-speedometer2',
    };
    return icons[category.toLowerCase()] || 'bi-exclamation-triangle';
  }

  // Switch between vendor and item analysis view
  setViewMode(mode: 'vendor' | 'items'): void {
    this.viewMode = mode;
    if (mode === 'items' && this.itemAnalysisList.length === 0) {
      this.loadItemAnalysis();
    }
  }

  // Load and analyze items using MASTER DATA (items + vendorItems) plus purchase history
  loadItemAnalysis(): void {
    this.isLoadingItems = true;
    
    forkJoin({
      purchases: this.apiService.getPurchases(),
      vendors: this.apiService.getVendorsWithPurchaseMetrics(),
      items: this.apiService.getItems(),
      vendorItems: this.apiService.getVendorItems()
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ purchases, vendors, items, vendorItems }) => {
          this.analyzeItemsFromMasterData(items, vendorItems, purchases, vendors);
          this.isLoadingItems = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Failed to load item analysis data';
          this.isLoadingItems = false;
          this.cdr.detectChanges();
        }
      });
  }

  // Analyze items and group by item name across vendors
  private analyzeItems(purchases: Purchase[], vendors: Vendor[]): void {
    // Create a map to group items by description (normalized)
    const itemMap = new Map<string, {
      vendorData: Map<string, {
        vendorId: string;
        vendorName: string;
        prices: number[];
        quantities: number[];
        purchaseCount: number;
        dates: Date[];
      }>;
      totalQuantity: number;
      totalPurchases: number;
      allDates: Date[];
    }>();

    // Process all purchases
    purchases.forEach(purchase => {
      if (purchase.status === 'cancelled') return;
      
      purchase.items.forEach(item => {
        const normalizedName = item.description.toLowerCase().trim();
        
        if (!itemMap.has(normalizedName)) {
          itemMap.set(normalizedName, {
            vendorData: new Map(),
            totalQuantity: 0,
            totalPurchases: 0,
            allDates: []
          });
        }
        
        const itemData = itemMap.get(normalizedName)!;
        itemData.totalQuantity += item.quantity;
        itemData.totalPurchases++;
        if (purchase.orderDate) {
          itemData.allDates.push(new Date(purchase.orderDate));
        }
        
        const vendorId = purchase.vendorId;
        const vendorName = purchase.vendorName || 'Unknown Vendor';
        
        if (!itemData.vendorData.has(vendorId)) {
          itemData.vendorData.set(vendorId, {
            vendorId,
            vendorName,
            prices: [],
            quantities: [],
            purchaseCount: 0,
            dates: []
          });
        }
        
        const vendorItemData = itemData.vendorData.get(vendorId)!;
        vendorItemData.prices.push(item.unitPrice);
        vendorItemData.quantities.push(item.quantity);
        vendorItemData.purchaseCount++;
        if (purchase.orderDate) {
          vendorItemData.dates.push(new Date(purchase.orderDate));
        }
      });
    });

    // Convert to analysis list
    this.itemAnalysisList = Array.from(itemMap.entries())
      .filter(([_, data]) => data.vendorData.size > 0)
      .map(([itemName, data]) => {
        const vendorOptions: ItemVendorOption[] = Array.from(data.vendorData.values())
          .map(vd => {
            // Find vendor metrics
            const vendor = vendors.find(v => v.id === vd.vendorId);
            const qualityScore = vendor?.qualityScore || 80;
            const onTimeDeliveryRate = vendor?.onTimeDeliveryRate || 90;
            
            // Calculate average price and price variance
            const avgPrice = vd.prices.reduce((a, b) => a + b, 0) / vd.prices.length;
            const totalQuantity = vd.quantities.reduce((a, b) => a + b, 0);
            
            // Price variance (coefficient of variation)
            const priceVariance = vd.prices.length > 1 
              ? Math.sqrt(vd.prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / vd.prices.length) / avgPrice * 100
              : 0;
            
            // Last purchase date
            const lastPurchaseDate = vd.dates.length > 0 
              ? new Date(Math.max(...vd.dates.map(d => d.getTime())))
              : undefined;
            
            // Calculate reliability score (consistency of purchases)
            const reliabilityScore = Math.min(100, (vd.purchaseCount * 10) + qualityScore * 0.5 + onTimeDeliveryRate * 0.3);
            
            // Calculate risk score (lower is better)
            const qualityRisk = 100 - qualityScore;
            const deliveryRisk = 100 - onTimeDeliveryRate;
            const priceRisk = Math.min(priceVariance, 30);
            const riskScore = Math.round((qualityRisk * 0.35) + (deliveryRisk * 0.35) + (priceRisk * 0.15) + (100 - reliabilityScore) * 0.15);
            
            return {
              vendorId: vd.vendorId,
              vendorName: vd.vendorName,
              avgPrice,
              totalQuantity,
              purchaseCount: vd.purchaseCount,
              qualityScore,
              onTimeDeliveryRate,
              riskScore,
              isRecommended: false,
              lastPurchaseDate,
              priceVariance: Math.round(priceVariance * 100) / 100,
              reliabilityScore: Math.round(reliabilityScore)
            };
          })
          .sort((a, b) => a.riskScore - b.riskScore);
        
        // Mark the lowest risk vendor as recommended
        if (vendorOptions.length > 0) {
          vendorOptions[0].isRecommended = true;
        }
        
        // Calculate overall item metrics
        const allPrices = Array.from(data.vendorData.values()).flatMap(vd => vd.prices);
        const avgPrice = allPrices.length > 0 
          ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length 
          : 0;
        
        // Calculate price stability (inverse of price variance across all vendors)
        const priceStability = allPrices.length > 1
          ? Math.max(0, 100 - (Math.sqrt(allPrices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / allPrices.length) / avgPrice * 100))
          : 100;
        
        // Determine demand trend based on purchase frequency
        const sortedDates = data.allDates.sort((a, b) => a.getTime() - b.getTime());
        let demandTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
        if (sortedDates.length >= 4) {
          const midPoint = Math.floor(sortedDates.length / 2);
          const firstHalf = sortedDates.slice(0, midPoint).length;
          const secondHalf = sortedDates.slice(midPoint).length;
          if (secondHalf > firstHalf * 1.3) demandTrend = 'increasing';
          else if (secondHalf < firstHalf * 0.7) demandTrend = 'decreasing';
        }
        
        // Calculate supply chain risk (single vendor = higher risk)
        const supplyChainRisk = vendorOptions.length === 1 ? 70 : Math.max(0, 50 - vendorOptions.length * 10);
        
        // Last updated
        const lastUpdated = data.allDates.length > 0 
          ? new Date(Math.max(...data.allDates.map(d => d.getTime())))
          : undefined;
        
        return {
          itemName: this.capitalizeItemName(itemName),
          totalPurchases: data.totalPurchases,
          totalQuantity: data.totalQuantity,
          avgPrice,
          vendorOptions,
          recommendedVendor: vendorOptions.length > 0 ? vendorOptions[0] : null,
          aiAnalyzed: false,
          priceStability: Math.round(priceStability),
          demandTrend,
          supplyChainRisk,
          lastUpdated,
          category: this.detectItemCategory(itemName)
        };
      })
      .sort((a, b) => b.totalPurchases - a.totalPurchases);
    
    this.filteredItemAnalysis = [...this.itemAnalysisList];
    this.sortItems();
  }

  // NEW: Analyze items using MASTER DATA (items + vendorItems tables)
  // This shows ALL items from the master list and which vendors can supply them
  private analyzeItemsFromMasterData(
    masterItems: Item[], 
    vendorItemMappings: VendorItem[], 
    purchases: Purchase[], 
    vendors: Vendor[]
  ): void {
    // Create purchase history lookup for additional metrics
    const purchaseHistoryMap = new Map<string, {
      vendorId: string;
      prices: number[];
      quantities: number[];
      dates: Date[];
      purchaseCount: number;
    }[]>();

    // Build purchase history by item name
    purchases.forEach(purchase => {
      if (purchase.status === 'cancelled') return;
      
      purchase.items.forEach(pItem => {
        const normalizedName = pItem.description.toLowerCase().trim();
        
        if (!purchaseHistoryMap.has(normalizedName)) {
          purchaseHistoryMap.set(normalizedName, []);
        }
        
        const historyList = purchaseHistoryMap.get(normalizedName)!;
        let vendorHistory = historyList.find(h => h.vendorId === purchase.vendorId);
        
        if (!vendorHistory) {
          vendorHistory = {
            vendorId: purchase.vendorId,
            prices: [],
            quantities: [],
            dates: [],
            purchaseCount: 0
          };
          historyList.push(vendorHistory);
        }
        
        vendorHistory.prices.push(pItem.unitPrice);
        vendorHistory.quantities.push(pItem.quantity);
        vendorHistory.purchaseCount++;
        if (purchase.orderDate) {
          vendorHistory.dates.push(new Date(purchase.orderDate));
        }
      });
    });

    // Build analysis from master items
    this.itemAnalysisList = masterItems
      .filter(item => item.status === 'active')
      .map(masterItem => {
        // Find all vendors that can supply this item from vendorItems mapping
        const itemVendors = vendorItemMappings.filter(
          vi => vi.itemId === masterItem.id && vi.status === 'active'
        );

        // Get purchase history for this item (by name match)
        const normalizedMasterName = masterItem.itemName.toLowerCase().trim();
        const purchaseHistory = purchaseHistoryMap.get(normalizedMasterName) || [];

        // Build vendor options from master data
        const vendorOptions: ItemVendorOption[] = itemVendors.map(vi => {
          // Find vendor details
          const vendor = vendors.find(v => v.id === vi.vendorId);
          const qualityScore = vendor?.qualityScore || 80;
          const onTimeDeliveryRate = vendor?.onTimeDeliveryRate || 90;
          const vendorRating = vendor?.riskScore ? (100 - vendor.riskScore) / 20 : 4.0; // Convert risk score to rating

          // Get purchase history for this vendor-item combo
          const vendorPurchaseHistory = purchaseHistory.find(h => h.vendorId === vi.vendorId);
          
          // Calculate metrics from master data + purchase history
          const avgPrice = vi.unitPrice;
          const totalQuantity = vendorPurchaseHistory 
            ? vendorPurchaseHistory.quantities.reduce((a, b) => a + b, 0) 
            : 0;
          const purchaseCount = vendorPurchaseHistory?.purchaseCount || 0;
          
          // Price variance from purchase history
          const priceVariance = vendorPurchaseHistory && vendorPurchaseHistory.prices.length > 1
            ? Math.sqrt(
                vendorPurchaseHistory.prices.reduce((sum, p) => 
                  sum + Math.pow(p - avgPrice, 2), 0
                ) / vendorPurchaseHistory.prices.length
              ) / avgPrice * 100
            : 0;

          // Last purchase date
          const lastPurchaseDate = vendorPurchaseHistory && vendorPurchaseHistory.dates.length > 0
            ? new Date(Math.max(...vendorPurchaseHistory.dates.map(d => d.getTime())))
            : undefined;

          // Lead time factor (lower is better)
          const leadTimeScore = vi.leadTimeDays 
            ? Math.max(0, 100 - vi.leadTimeDays * 3) 
            : 70;

          // Calculate reliability score
          const reliabilityScore = Math.min(100, 
            (purchaseCount * 5) + 
            (qualityScore * 0.3) + 
            (onTimeDeliveryRate * 0.3) + 
            (leadTimeScore * 0.2) +
            (vendorRating * 4)
          );

          // Calculate risk score (lower is better)
          const qualityRisk = 100 - qualityScore;
          const deliveryRisk = 100 - onTimeDeliveryRate;
          const priceRisk = Math.min(priceVariance, 30);
          const leadTimeRisk = vi.leadTimeDays ? Math.min(vi.leadTimeDays * 2, 30) : 15;
          
          const riskScore = Math.round(
            (qualityRisk * 0.30) + 
            (deliveryRisk * 0.30) + 
            (priceRisk * 0.15) + 
            (leadTimeRisk * 0.15) +
            ((100 - vendorRating * 20) * 0.10)
          );

          return {
            vendorId: vi.vendorId,
            vendorName: vi.vendorName || vendor?.name || 'Unknown Vendor',
            avgPrice,
            totalQuantity,
            purchaseCount,
            qualityScore,
            onTimeDeliveryRate,
            riskScore: Math.max(0, Math.min(100, riskScore)),
            isRecommended: false,
            lastPurchaseDate,
            priceVariance: Math.round(priceVariance * 100) / 100,
            reliabilityScore: Math.round(reliabilityScore),
            leadTimeDays: vi.leadTimeDays,
            isPreferred: vi.isPreferred,
            minOrderQuantity: vi.minOrderQuantity
          };
        })
        .sort((a, b) => {
          // Sort by: preferred first, then by risk score (lower is better)
          if (a.isPreferred && !b.isPreferred) return -1;
          if (!a.isPreferred && b.isPreferred) return 1;
          return a.riskScore - b.riskScore;
        });

        // Mark the best vendor as recommended
        if (vendorOptions.length > 0) {
          vendorOptions[0].isRecommended = true;
        }

        // Calculate overall item metrics
        const avgPrice = vendorOptions.length > 0
          ? vendorOptions.reduce((sum, v) => sum + v.avgPrice, 0) / vendorOptions.length
          : masterItem.defaultPrice || 0;

        // Calculate price stability across vendors
        const prices = vendorOptions.map(v => v.avgPrice);
        const priceStability = prices.length > 1
          ? Math.max(0, 100 - (Math.sqrt(prices.reduce((sum, p) => 
              sum + Math.pow(p - avgPrice, 2), 0) / prices.length) / avgPrice * 100))
          : 100;

        // Total purchases and quantities from all vendors
        const totalPurchases = vendorOptions.reduce((sum, v) => sum + v.purchaseCount, 0);
        const totalQuantity = vendorOptions.reduce((sum, v) => sum + v.totalQuantity, 0);

        // Determine demand trend from purchase history
        const allDates = purchaseHistory.flatMap(h => h.dates).sort((a, b) => a.getTime() - b.getTime());
        let demandTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
        if (allDates.length >= 4) {
          const midPoint = Math.floor(allDates.length / 2);
          const firstHalf = allDates.slice(0, midPoint).length;
          const secondHalf = allDates.slice(midPoint).length;
          if (secondHalf > firstHalf * 1.3) demandTrend = 'increasing';
          else if (secondHalf < firstHalf * 0.7) demandTrend = 'decreasing';
        }

        // Supply chain risk (single vendor = higher risk)
        const supplyChainRisk = vendorOptions.length === 0 ? 100 
          : vendorOptions.length === 1 ? 70 
          : Math.max(0, 50 - vendorOptions.length * 10);

        // Last updated
        const lastUpdated = allDates.length > 0
          ? new Date(Math.max(...allDates.map(d => d.getTime())))
          : undefined;

        return {
          itemName: masterItem.itemName,
          itemCode: masterItem.itemCode,
          totalPurchases,
          totalQuantity,
          avgPrice,
          vendorOptions,
          recommendedVendor: vendorOptions.length > 0 ? vendorOptions[0] : null,
          aiAnalyzed: false,
          priceStability: Math.round(priceStability),
          demandTrend,
          supplyChainRisk,
          lastUpdated,
          category: masterItem.category || this.detectItemCategory(masterItem.itemName),
          masterItemId: masterItem.id
        };
      })
      .sort((a, b) => {
        // Sort by: items with vendors first, then by total purchases
        if (a.vendorOptions.length > 0 && b.vendorOptions.length === 0) return -1;
        if (a.vendorOptions.length === 0 && b.vendorOptions.length > 0) return 1;
        return b.totalPurchases - a.totalPurchases;
      });

    this.filteredItemAnalysis = [...this.itemAnalysisList];
    this.sortItems();
  }

  // Detect item category based on name
  private detectItemCategory(itemName: string): string {
    const name = itemName.toLowerCase();
    if (name.includes('electronic') || name.includes('cable') || name.includes('chip') || name.includes('circuit')) return 'Electronics';
    if (name.includes('paper') || name.includes('pen') || name.includes('office') || name.includes('staple')) return 'Office Supplies';
    if (name.includes('tool') || name.includes('machine') || name.includes('equipment')) return 'Equipment';
    if (name.includes('material') || name.includes('raw') || name.includes('steel') || name.includes('plastic')) return 'Raw Materials';
    if (name.includes('chemical') || name.includes('solvent') || name.includes('acid')) return 'Chemicals';
    if (name.includes('packaging') || name.includes('box') || name.includes('container')) return 'Packaging';
    return 'General';
  }

  // Capitalize item name properly
  private capitalizeItemName(name: string): string {
    return name.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Filter items by search query
  filterItems(): void {
    const query = this.itemSearchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredItemAnalysis = [...this.itemAnalysisList];
    } else {
      this.filteredItemAnalysis = this.itemAnalysisList.filter(item =>
        item.itemName.toLowerCase().includes(query) ||
        item.vendorOptions.some(v => v.vendorName.toLowerCase().includes(query))
      );
    }
    this.sortItems();
  }

  // Sort items - Best performing (low risk, high score) at TOP
  sortItems(): void {
    switch (this.itemSortBy) {
      case 'name':
        this.filteredItemAnalysis.sort((a, b) => a.itemName.localeCompare(b.itemName));
        break;
      case 'purchases':
        this.filteredItemAnalysis.sort((a, b) => b.totalPurchases - a.totalPurchases);
        break;
      case 'savings':
        this.filteredItemAnalysis.sort((a, b) => {
          const aSavings = this.calculatePotentialSavings(a);
          const bSavings = this.calculatePotentialSavings(b);
          return bSavings - aSavings;
        });
        break;
      case 'risk':
        // Sort by lowest risk first (best items on top)
        // Lower riskScore = better, so we sort ascending
        this.filteredItemAnalysis.sort((a, b) => {
          const aRisk = a.aiRiskLevel ? this.riskLevelToScore(a.aiRiskLevel) : (a.recommendedVendor?.riskScore || 100);
          const bRisk = b.aiRiskLevel ? this.riskLevelToScore(b.aiRiskLevel) : (b.recommendedVendor?.riskScore || 100);
          return aRisk - bRisk; // Lower risk first (best at top)
        });
        break;
      case 'score':
      default:
        // Sort by AI score (best first = highest score on top)
        // Higher score = better, so we sort descending
        this.filteredItemAnalysis.sort((a, b) => {
          const aScore = a.aiScore ?? this.calculateItemScore(a);
          const bScore = b.aiScore ?? this.calculateItemScore(b);
          return bScore - aScore; // Higher score first (best at top)
        });
        break;
    }
  }

  // Convert risk level to numeric score for sorting
  private riskLevelToScore(level: 'low' | 'medium' | 'high' | 'critical'): number {
    switch (level) {
      case 'low': return 10;
      case 'medium': return 40;
      case 'high': return 70;
      case 'critical': return 100;
      default: return 50;
    }
  }

  // Calculate item score (0-100, higher is better)
  calculateItemScore(item: ItemAnalysis): number {
    const vendorScore = item.recommendedVendor ? (100 - item.recommendedVendor.riskScore) : 50;
    const supplyScore = 100 - (item.supplyChainRisk || 50);
    const priceScore = item.priceStability || 50;
    const volumeScore = Math.min(100, item.totalPurchases * 5);
    
    return Math.round((vendorScore * 0.35) + (supplyScore * 0.25) + (priceScore * 0.2) + (volumeScore * 0.2));
  }

  // Run AI analysis for all items
  async runItemAIAnalysis(): Promise<void> {
    if (this.isAnalyzingItems || this.filteredItemAnalysis.length === 0) return;
    
    this.isAnalyzingItems = true;
    this.itemAnalysisProgress = 0;
    this.errorMessage = '';
    
    try {
      // Analyze ALL items, not just 20
      const itemsToAnalyze = [...this.filteredItemAnalysis];
      const total = itemsToAnalyze.length;
      
      for (let i = 0; i < itemsToAnalyze.length; i++) {
        const item = itemsToAnalyze[i];
        this.itemAnalysisProgress = Math.round(((i + 1) / total) * 100);
        
        try {
          const analysis = await this.aiRiskService.analyzeItem(item);
          
          // Update the item with AI analysis results - use masterItemId for unique identification
          // When both items have masterItemId, match by masterItemId only
          // Otherwise, fall back to itemName matching
          const index = this.itemAnalysisList.findIndex(it => {
            if (it.masterItemId && item.masterItemId) {
              return it.masterItemId === item.masterItemId;
            }
            return it.itemName === item.itemName;
          });
          if (index !== -1) {
            this.itemAnalysisList[index] = {
              ...this.itemAnalysisList[index],
              aiAnalyzed: true,
              aiRiskLevel: analysis.riskLevel,
              aiScore: analysis.score,
              aiInsights: analysis.insights,
              aiRecommendation: analysis.recommendation
            };
          }
          
          // Also update filtered list - use masterItemId for unique identification
          const filteredIndex = this.filteredItemAnalysis.findIndex(it => {
            if (it.masterItemId && item.masterItemId) {
              return it.masterItemId === item.masterItemId;
            }
            return it.itemName === item.itemName;
          });
          if (filteredIndex !== -1) {
            this.filteredItemAnalysis[filteredIndex] = {
              ...this.filteredItemAnalysis[filteredIndex],
              aiAnalyzed: true,
              aiRiskLevel: analysis.riskLevel,
              aiScore: analysis.score,
              aiInsights: analysis.insights,
              aiRecommendation: analysis.recommendation
            };
          }
          
          this.cdr.detectChanges();
        } catch (error) {
          console.error(`Failed to analyze item: ${item.itemName}`, error);
        }
        
        // Small delay between API calls to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Re-sort after analysis to show best items at top
      this.sortItems();
      
    } catch (error) {
      this.errorMessage = 'Item analysis failed. Please try again.';
    } finally {
      this.isAnalyzingItems = false;
      this.itemAnalysisProgress = 100;
      this.cdr.detectChanges();
    }
  }

  // Run AI analysis for a single item
  async analyzeSingleItem(item: ItemAnalysis): Promise<void> {
    if (this.isAnalyzingItems) return;
    
    this.isAnalyzingItems = true;
    this.errorMessage = '';
    
    try {
      const analysis = await this.aiRiskService.analyzeItem(item);
      
      // Update the item with AI analysis results - use masterItemId for unique identification
      // When both items have masterItemId, match by masterItemId only
      const index = this.itemAnalysisList.findIndex(it => {
        if (it.masterItemId && item.masterItemId) {
          return it.masterItemId === item.masterItemId;
        }
        return it.itemName === item.itemName;
      });
      if (index !== -1) {
        this.itemAnalysisList[index] = {
          ...this.itemAnalysisList[index],
          aiAnalyzed: true,
          aiRiskLevel: analysis.riskLevel,
          aiScore: analysis.score,
          aiInsights: analysis.insights,
          aiRecommendation: analysis.recommendation
        };
      }
      
      // Also update filtered list - use masterItemId for unique identification
      const filteredIndex = this.filteredItemAnalysis.findIndex(it => {
        if (it.masterItemId && item.masterItemId) {
          return it.masterItemId === item.masterItemId;
        }
        return it.itemName === item.itemName;
      });
      if (filteredIndex !== -1) {
        this.filteredItemAnalysis[filteredIndex] = {
          ...this.filteredItemAnalysis[filteredIndex],
          aiAnalyzed: true,
          aiRiskLevel: analysis.riskLevel,
          aiScore: analysis.score,
          aiInsights: analysis.insights,
          aiRecommendation: analysis.recommendation
        };
      }
      
      // Update selected item detail if it's the same item
      const isSameItem = (this.selectedItemForDetail?.masterItemId && item.masterItemId) 
        ? this.selectedItemForDetail?.masterItemId === item.masterItemId 
        : this.selectedItemForDetail?.itemName === item.itemName;
      if (isSameItem && this.selectedItemForDetail) {
        this.selectedItemForDetail = {
          ...this.selectedItemForDetail,
          aiAnalyzed: true,
          aiRiskLevel: analysis.riskLevel,
          aiScore: analysis.score,
          aiInsights: analysis.insights,
          aiRecommendation: analysis.recommendation
        };
      }
      
      // Re-sort to reflect new scores
      this.sortItems();
      this.cdr.detectChanges();
      
    } catch (error) {
      this.errorMessage = `Failed to analyze ${item.itemName}. Please try again.`;
    } finally {
      this.isAnalyzingItems = false;
      this.cdr.detectChanges();
    }
  }

  // Run detailed vendor comparison for a single item
  // This analyzes which vendor is the best choice when buying the same product from multiple vendors
  async analyzeItemVendorComparison(item: ItemAnalysis): Promise<void> {
    if (this.isAnalyzingVendorComparison) return;
    
    // Check if item has multiple vendors
    if (item.vendorOptions.length < 2) {
      this.errorMessage = `${item.itemName} has only ${item.vendorOptions.length} vendor(s). Vendor comparison requires at least 2 vendors.`;
      return;
    }
    
    this.isAnalyzingVendorComparison = true;
    this.showVendorComparisonModal = true;
    this.vendorComparisonResult = null;
    this.errorMessage = '';
    
    try {
      // Call the AI service for detailed vendor comparison
      const comparison = await this.aiRiskService.analyzeItemVendorComparison(item);
      this.vendorComparisonResult = comparison;
      
      // Also update the item with the detailed analysis
      const index = this.itemAnalysisList.findIndex(it => {
        if (it.masterItemId && item.masterItemId) {
          return it.masterItemId === item.masterItemId;
        }
        return it.itemName === item.itemName;
      });
      if (index !== -1) {
        this.itemAnalysisList[index] = {
          ...this.itemAnalysisList[index],
          detailedAnalysis: comparison
        };
      }
      
      // Update filtered list
      const filteredIndex = this.filteredItemAnalysis.findIndex(it => {
        if (it.masterItemId && item.masterItemId) {
          return it.masterItemId === item.masterItemId;
        }
        return it.itemName === item.itemName;
      });
      if (filteredIndex !== -1) {
        this.filteredItemAnalysis[filteredIndex] = {
          ...this.filteredItemAnalysis[filteredIndex],
          detailedAnalysis: comparison
        };
      }
      
      // Update selected item
      if (this.selectedItemForDetail && 
          (this.selectedItemForDetail.itemName === item.itemName || 
           this.selectedItemForDetail.masterItemId === item.masterItemId)) {
        this.selectedItemForDetail = {
          ...this.selectedItemForDetail!,
          detailedAnalysis: comparison
        } as ItemAnalysis;
      }
      
      this.cdr.detectChanges();
      
    } catch (error) {
      this.errorMessage = `Failed to compare vendors for ${item.itemName}. Please try again.`;
    } finally {
      this.isAnalyzingVendorComparison = false;
      this.cdr.detectChanges();
    }
  }

  // Close vendor comparison modal
  closeVendorComparisonModal(): void {
    this.showVendorComparisonModal = false;
    this.vendorComparisonResult = null;
  }

  // Get vendor comparison score class
  getVendorScoreClass(score: number): string {
    if (score >= 80) return 'score-excellent';
    if (score >= 65) return 'score-good';
    if (score >= 50) return 'score-average';
    return 'score-poor';
  }

  // Get rank badge class
  getRankBadgeClass(rank: number): string {
    switch (rank) {
      case 1: return 'rank-1';
      case 2: return 'rank-2';
      case 3: return 'rank-3';
      default: return 'rank-other';
    }
  }

  // Format cost savings
  formatCostSavings(savings: number): string {
    if (savings > 0) return `+${savings.toFixed(1)}% savings`;
    if (savings < 0) return `${savings.toFixed(1)}% premium`;
    return 'Average price';
  }

  // Get savings class
  getSavingsClass(savings: number): string {
    if (savings > 0) return 'savings-positive';
    if (savings < 0) return 'savings-negative';
    return 'savings-neutral';
  }

  // Get trend icon
  getTrendIcon(trend: string | undefined): string {
    switch (trend) {
      case 'increasing': return 'bi-graph-up-arrow';
      case 'decreasing': return 'bi-graph-down-arrow';
      default: return 'bi-dash-lg';
    }
  }

  // Get trend class
  getTrendClass(trend: string | undefined): string {
    switch (trend) {
      case 'increasing': return 'trend-up';
      case 'decreasing': return 'trend-down';
      default: return 'trend-stable';
    }
  }

  // Get score class
  getScoreClass(score: number): string {
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    if (score >= 40) return 'score-fair';
    return 'score-poor';
  }

  // Select item for detail view
  selectItemForDetail(item: ItemAnalysis): void {
    this.selectedItemForDetail = this.selectedItemForDetail?.itemName === item.itemName ? null : item;
  }

  // Toggle item expansion to show all vendors
  toggleItemExpand(item: ItemAnalysis, event: Event): void {
    event.stopPropagation(); // Prevent row click from triggering
    if (this.expandedItems.has(item.itemName)) {
      this.expandedItems.delete(item.itemName);
    } else {
      this.expandedItems.add(item.itemName);
    }
  }

  // Check if item is expanded
  isItemExpanded(item: ItemAnalysis): boolean {
    return this.expandedItems.has(item.itemName);
  }

  // Get alternate vendors (all except the recommended one)
  getAlternateVendors(item: ItemAnalysis): ItemVendorOption[] {
    if (!item.vendorOptions || item.vendorOptions.length <= 1) return [];
    return item.vendorOptions.slice(1); // Skip the first one (recommended)
  }

  // Calculate potential savings for an item
  calculatePotentialSavings(item: ItemAnalysis): number {
    if (item.vendorOptions.length < 2) return 0;
    
    const prices = item.vendorOptions.map(v => v.avgPrice);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    
    return (maxPrice - minPrice) * item.totalQuantity;
  }

  // Get risk level class for item vendor
  getItemRiskClass(riskScore: number): string {
    if (riskScore <= 20) return 'risk-low';
    if (riskScore <= 40) return 'risk-medium';
    if (riskScore <= 60) return 'risk-high';
    return 'risk-critical';
  }

  // Get risk label
  getRiskLabel(riskScore: number): string {
    if (riskScore <= 20) return 'Low Risk';
    if (riskScore <= 40) return 'Medium Risk';
    if (riskScore <= 60) return 'High Risk';
    return 'Critical Risk';
  }

  // Get count of items with multiple vendors
  getMultiVendorItemCount(): number {
    return this.filteredItemAnalysis.filter(i => i.vendorOptions.length > 1).length;
  }

  // Get color for vendor avatar based on vendor name
  getVendorColor(vendorName: string): string {
    const colors = [
      '#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#E91E63',
      '#00BCD4', '#795548', '#607D8B', '#3F51B5', '#009688'
    ];
    let hash = 0;
    for (let i = 0; i < vendorName.length; i++) {
      hash = vendorName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }
}
