import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  AiForecastingService,
  ForecastData,
  StockOutForecast,
  DemandForecast,
  PricingForecast,
  VendorRiskForecast,
} from '../../core/services/ai-forecasting/ai-forecasting.service';

@Component({
  selector: 'app-ai-forecasting',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './ai-forecasting.component.html',
  styleUrls: ['./ai-forecasting.component.css'],
})
export class AiForecastingComponent implements OnInit {
  forecast: ForecastData | null = null;
  isLoading = true;
  error: string | null = null;

  // Active tab for mobile view
  activeTab: 'stockout' | 'demand' | 'pricing' | 'vendor' = 'stockout';

  // Expanded sections
  expandedSections = {
    stockout: true,
    demand: true,
    pricing: true,
    vendor: true,
  };

  constructor(private forecastingService: AiForecastingService) {}

  ngOnInit(): void {
    this.loadForecast();
  }

  loadForecast(): void {
    this.isLoading = true;
    this.error = null;

    this.forecastingService.getAllForecasts().subscribe({
      next: (result: ForecastData) => {
        this.forecast = result;
        this.isLoading = false;
      },
      error: (err: Error) => {
        console.error('Error loading forecast:', err);
        this.error = 'Failed to load forecast data. Please try again.';
        this.isLoading = false;
      },
    });
  }

  refreshForecast(): void {
    this.loadForecast();
  }

  toggleSection(section: 'stockout' | 'demand' | 'pricing' | 'vendor'): void {
    this.expandedSections[section] = !this.expandedSections[section];
  }

  setActiveTab(tab: 'stockout' | 'demand' | 'pricing' | 'vendor'): void {
    this.activeTab = tab;
  }

  // Helper methods for UI
  getRiskLevelClass(level: string): string {
    switch (level) {
      case 'critical':
        return 'badge-critical';
      case 'high':
        return 'badge-high';
      case 'medium':
        return 'badge-medium';
      case 'low':
        return 'badge-low';
      default:
        return 'badge-info';
    }
  }

  getTrendIcon(trend: string): string {
    switch (trend) {
      case 'increasing':
      case 'rising':
      case 'worsening':
        return 'bi-arrow-up-right';
      case 'decreasing':
      case 'falling':
      case 'improving':
        return 'bi-arrow-down-right';
      case 'stable':
        return 'bi-arrow-right';
      default:
        return 'bi-dash';
    }
  }

  getTrendClass(trend: string): string {
    switch (trend) {
      case 'increasing':
      case 'rising':
        return 'trend-up';
      case 'decreasing':
      case 'falling':
        return 'trend-down';
      case 'stable':
        return 'trend-stable';
      case 'improving':
        return 'trend-up';
      case 'worsening':
        return 'trend-down';
      default:
        return '';
    }
  }

  getAlertLevelClass(level: string): string {
    switch (level) {
      case 'critical':
        return 'alert-critical';
      case 'warning':
        return 'alert-warning';
      case 'watch':
        return 'alert-watch';
      case 'none':
        return 'alert-none';
      default:
        return '';
    }
  }

  getConfidenceWidth(confidence: number): string {
    return `${confidence}%`;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatPercent(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }

  getStockOutProgress(prediction: StockOutForecast): number {
    // Progress bar based on days until stockout (30 days = 100% safe)
    const maxDays = 30;
    return Math.min((prediction.daysUntilStockOut / maxDays) * 100, 100);
  }

  getRiskScoreProgress(score: number): number {
    return score;
  }

  getTopStockOutRisks(): StockOutForecast[] {
    if (!this.forecast) return [];
    return this.forecast.stockOutForecasts
      .filter(
        (p: StockOutForecast) =>
          p.riskLevel === 'critical' || p.riskLevel === 'high'
      )
      .slice(0, 5);
  }

  getHighRiskVendors(): VendorRiskForecast[] {
    if (!this.forecast) return [];
    return this.forecast.vendorRiskForecasts
      .filter(
        (v: VendorRiskForecast) =>
          v.alertLevel === 'critical' || v.alertLevel === 'warning'
      )
      .slice(0, 5);
  }

  getDemandGrowthItems(): DemandForecast[] {
    if (!this.forecast) return [];
    return this.forecast.demandForecasts
      .filter((d: DemandForecast) => d.demandTrend === 'rising')
      .sort(
        (a: DemandForecast, b: DemandForecast) => b.growthRate - a.growthRate
      )
      .slice(0, 5);
  }

  getPriceAlerts(): PricingForecast[] {
    if (!this.forecast) return [];
    return this.forecast.pricingForecasts
      .filter((p: PricingForecast) => Math.abs(p.priceChangePercent) > 10)
      .slice(0, 5);
  }
}
