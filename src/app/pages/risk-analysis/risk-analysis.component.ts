import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import {
  AIRiskAnalysisService,
  AIProvider,
} from '../../core/services/ai-risk-analysis/ai-risk-analysis.service';
import { ApiService } from '../../core/services/api/api.service';
import {
  Vendor,
  VendorRiskAssessment,
  RiskFactor,
  RiskLevel,
  AIRiskInsight,
} from '../../core/models/vendor/vendor.model';
import { ChatMessage } from '../../core/models/insights/insights.model';

@Component({
  selector: 'app-risk-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './risk-analysis.component.html',
  styleUrl: './risk-analysis.component.css',
})
export class RiskAnalysisComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // State
  isAnalyzing = false;
  isLoadingVendors = false;
  selectedVendor: Vendor | null = null;
  currentAssessment: VendorRiskAssessment | null = null;
  chatMessages: ChatMessage[] = [];
  chatInput = '';
  isChatting = false;
  apiKeyInput = '';
  geminiKeyInput = '';
  showApiKeyModal = false;
  activeTab: 'overview' | 'factors' | 'insights' | 'chat' = 'overview';

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
}
