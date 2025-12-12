import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AIRiskAnalysisService, AIProvider } from '../../core/services/ai-risk-analysis/ai-risk-analysis.service';
import { 
  Vendor, 
  VendorRiskAssessment, 
  RiskFactor, 
  RiskLevel,
  AIRiskInsight 
} from '../../core/models/vendor/vendor.model';
import { ChatMessage } from '../../core/models/insights/insights.model';

@Component({
  selector: 'app-risk-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './risk-analysis.component.html',
  styleUrl: './risk-analysis.component.css'
})
export class RiskAnalysisComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // State
  isAnalyzing = false;
  selectedVendor: Vendor | null = null;
  currentAssessment: VendorRiskAssessment | null = null;
  chatMessages: ChatMessage[] = [];
  chatInput = '';
  isChatting = false;
  apiKeyInput = '';
  geminiKeyInput = '';
  showApiKeyModal = false;
  activeTab: 'overview' | 'factors' | 'insights' | 'chat' = 'overview';

  constructor(
    private aiRiskService: AIRiskAnalysisService,
    private cdr: ChangeDetectorRef
  ) {}

  // Sample vendors for demo - varying risk levels
  vendors: Vendor[] = [
    // LOW RISK VENDORS (Below 50)
    {
      id: '1',
      name: 'Premium Materials Co',
      email: 'contact@premiummaterials.com',
      category: 'Raw Materials',
      status: 'active',
      createdAt: new Date('2020-09-05'),
      updatedAt: new Date('2024-11-01'),
      totalPurchases: 45000,
      averageOrderValue: 2800,
      paymentTerms: 15,
      creditLimit: 50000,
      outstandingBalance: 5000,
      onTimeDeliveryRate: 99,
      qualityScore: 98,
      responseTime: 2,
      defectRate: 0.1,
      certifications: ['ISO 9001', 'ISO 14001', 'OHSAS 18001', 'Six Sigma'],
      complianceStatus: 'compliant',
      lastAuditDate: new Date('2024-10-20')
    },
    {
      id: '2',
      name: 'Stellar Logistics Inc',
      email: 'info@stellarlogistics.com',
      category: 'Logistics',
      status: 'active',
      createdAt: new Date('2019-03-15'),
      updatedAt: new Date('2024-11-10'),
      totalPurchases: 38000,
      averageOrderValue: 1500,
      paymentTerms: 20,
      creditLimit: 40000,
      outstandingBalance: 8000,
      onTimeDeliveryRate: 97,
      qualityScore: 96,
      responseTime: 4,
      defectRate: 0.3,
      certifications: ['ISO 9001', 'C-TPAT', 'SmartWay'],
      complianceStatus: 'compliant',
      lastAuditDate: new Date('2024-09-15')
    },
    {
      id: '3',
      name: 'EcoGreen Supplies',
      email: 'sales@ecogreen.com',
      category: 'Sustainable Products',
      status: 'active',
      createdAt: new Date('2021-01-10'),
      updatedAt: new Date('2024-11-05'),
      totalPurchases: 28000,
      averageOrderValue: 1200,
      paymentTerms: 30,
      creditLimit: 35000,
      outstandingBalance: 3500,
      onTimeDeliveryRate: 95,
      qualityScore: 94,
      responseTime: 6,
      defectRate: 0.5,
      certifications: ['ISO 14001', 'FSC', 'B Corp'],
      complianceStatus: 'compliant',
      lastAuditDate: new Date('2024-08-01')
    },
    // MEDIUM RISK VENDORS (50-75)
    {
      id: '4',
      name: 'Acme Corporation',
      email: 'contact@acme.com',
      category: 'Manufacturing',
      status: 'active',
      createdAt: new Date('2022-01-15'),
      updatedAt: new Date('2024-11-01'),
      totalPurchases: 250000,
      averageOrderValue: 5000,
      paymentTerms: 30,
      creditLimit: 100000,
      outstandingBalance: 45000,
      onTimeDeliveryRate: 92,
      qualityScore: 88,
      responseTime: 12,
      defectRate: 1.5,
      certifications: ['ISO 9001', 'ISO 14001'],
      complianceStatus: 'compliant',
      lastAuditDate: new Date('2024-06-15')
    },
    {
      id: '5',
      name: 'Global Supplies Ltd',
      email: 'info@globalsupplies.com',
      category: 'Wholesale',
      status: 'active',
      createdAt: new Date('2021-06-20'),
      updatedAt: new Date('2024-10-15'),
      totalPurchases: 180000,
      averageOrderValue: 3500,
      paymentTerms: 45,
      creditLimit: 75000,
      outstandingBalance: 62000,
      onTimeDeliveryRate: 78,
      qualityScore: 72,
      responseTime: 36,
      defectRate: 4.2,
      certifications: ['ISO 9001'],
      complianceStatus: 'pending-review',
      lastAuditDate: new Date('2023-12-01')
    },
    {
      id: '6',
      name: 'Metro Industrial',
      email: 'contact@metroindustrial.com',
      category: 'Industrial Equipment',
      status: 'active',
      createdAt: new Date('2020-08-12'),
      updatedAt: new Date('2024-10-28'),
      totalPurchases: 120000,
      averageOrderValue: 4500,
      paymentTerms: 45,
      creditLimit: 80000,
      outstandingBalance: 55000,
      onTimeDeliveryRate: 82,
      qualityScore: 78,
      responseTime: 28,
      defectRate: 3.0,
      certifications: ['ISO 9001'],
      complianceStatus: 'pending-review',
      lastAuditDate: new Date('2024-02-20')
    },
    // HIGH RISK VENDORS (75-90)
    {
      id: '7',
      name: 'Tech Components Inc',
      email: 'sales@techcomponents.com',
      category: 'Electronics',
      status: 'active',
      createdAt: new Date('2023-03-10'),
      updatedAt: new Date('2024-11-10'),
      totalPurchases: 420000,
      averageOrderValue: 8500,
      paymentTerms: 60,
      creditLimit: 200000,
      outstandingBalance: 180000,
      onTimeDeliveryRate: 65,
      qualityScore: 60,
      responseTime: 72,
      defectRate: 8.5,
      certifications: [],
      complianceStatus: 'non-compliant',
      lastAuditDate: new Date('2023-06-01')
    },
    {
      id: '8',
      name: 'QuickParts Express',
      email: 'orders@quickparts.com',
      category: 'Auto Parts',
      status: 'active',
      createdAt: new Date('2022-11-05'),
      updatedAt: new Date('2024-09-15'),
      totalPurchases: 350000,
      averageOrderValue: 6000,
      paymentTerms: 75,
      creditLimit: 150000,
      outstandingBalance: 140000,
      onTimeDeliveryRate: 58,
      qualityScore: 55,
      responseTime: 84,
      defectRate: 9.0,
      certifications: [],
      complianceStatus: 'pending-review',
      lastAuditDate: new Date('2023-03-10')
    },
    // CRITICAL RISK VENDORS (90+)
    {
      id: '9',
      name: 'Discount Bulk Traders',
      email: 'bulk@discounttraders.com',
      category: 'Wholesale',
      status: 'active',
      createdAt: new Date('2023-08-20'),
      updatedAt: new Date('2024-08-01'),
      totalPurchases: 580000,
      averageOrderValue: 12000,
      paymentTerms: 90,
      creditLimit: 100000,
      outstandingBalance: 95000,
      onTimeDeliveryRate: 42,
      qualityScore: 38,
      responseTime: 120,
      defectRate: 15.0,
      certifications: [],
      complianceStatus: 'non-compliant',
      lastAuditDate: new Date('2022-06-15')
    },
    {
      id: '10',
      name: 'Offshore Manufacturing Co',
      email: 'sales@offshoremanuf.com',
      category: 'Manufacturing',
      status: 'active',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-07-20'),
      totalPurchases: 720000,
      averageOrderValue: 15000,
      paymentTerms: 120,
      creditLimit: 80000,
      outstandingBalance: 78000,
      onTimeDeliveryRate: 35,
      qualityScore: 32,
      responseTime: 168,
      defectRate: 18.5,
      certifications: [],
      complianceStatus: 'non-compliant',
      lastAuditDate: new Date('2022-01-10')
    },
    {
      id: '11',
      name: 'FastCheap Imports',
      email: 'info@fastcheapimports.com',
      category: 'Import/Export',
      status: 'active',
      createdAt: new Date('2023-05-01'),
      updatedAt: new Date('2024-06-15'),
      totalPurchases: 450000,
      averageOrderValue: 9000,
      paymentTerms: 90,
      creditLimit: 60000,
      outstandingBalance: 58000,
      onTimeDeliveryRate: 28,
      qualityScore: 25,
      responseTime: 200,
      defectRate: 22.0,
      certifications: [],
      complianceStatus: 'non-compliant',
      lastAuditDate: new Date('2021-12-01')
    },
    {
      id: '12',
      name: 'Unknown Ventures LLC',
      email: 'contact@unknownventures.com',
      category: 'Miscellaneous',
      status: 'active',
      createdAt: new Date('2024-06-01'),
      updatedAt: new Date('2024-10-01'),
      totalPurchases: 850000,
      averageOrderValue: 20000,
      paymentTerms: 150,
      creditLimit: 50000,
      outstandingBalance: 49500,
      onTimeDeliveryRate: 20,
      qualityScore: 18,
      responseTime: 240,
      defectRate: 28.0,
      certifications: [],
      complianceStatus: 'non-compliant',
      lastAuditDate: new Date('2020-06-01')
    }
  ];

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
      .subscribe(analyzing => this.isAnalyzing = analyzing);

    this.aiRiskService.chatHistory$
      .pipe(takeUntil(this.destroy$))
      .subscribe(messages => this.chatMessages = messages);
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
      this.currentAssessment = await this.aiRiskService.analyzeVendorRisk(this.selectedVendor);
      this.cdr.detectChanges();
    } catch (error) {
      this.errorMessage = 'Risk analysis failed. Using local calculation instead.';
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
      this.errorMessage = 'No API key configured. Click "Configure AI" to add your OpenAI API key.';
      alert('No API key configured. Please add your API key first.');
      return;
    }
    
    try {
      // Simple test call
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (response.ok) {
        alert('API connection successful! ✓');
      } else {
        const error = await response.json();
        this.errorMessage = `API Error: ${error.error?.message || response.statusText}`;
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
      critical: 'risk-critical'
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
      neutral: 'impact-neutral'
    };
    const normalizedImpact = (impact || 'neutral').toLowerCase();
    return classes[normalizedImpact] || 'impact-neutral';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  }

  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'financial': 'bi-currency-dollar',
      'operational': 'bi-gear',
      'compliance': 'bi-shield-check',
      'supply-chain': 'bi-diagram-3',
      'reputational': 'bi-star',
      'market': 'bi-graph-up',
      'geopolitical': 'bi-globe',
      'technology': 'bi-cpu',
      'performance': 'bi-speedometer2'
    };
    return icons[category.toLowerCase()] || 'bi-exclamation-triangle';
  }
}
