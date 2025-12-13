import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ApiService,
  Vendor,
  Purchase,
  Item,
  VendorItem,
  RiskAnalysis,
} from '../api/api.service';

// Forecast Types
export interface StockOutForecast {
  itemId: string;
  itemCode: string;
  itemName: string;
  category: string;
  currentStock: number;
  avgDailyUsage: number;
  daysUntilStockOut: number;
  predictedStockOutDate: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  reorderPoint: number;
  suggestedOrderQty: number;
  lastOrderDate: string | null;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface DemandForecast {
  itemId: string;
  itemCode: string;
  itemName: string;
  category: string;
  currentMonthDemand: number;
  lastMonthDemand: number;
  avgMonthlyDemand: number;
  predictedNextMonthDemand: number;
  demandTrend: 'rising' | 'stable' | 'falling';
  growthRate: number;
  seasonalityFactor: number;
  confidence: number;
}

export interface PricingForecast {
  itemId: string;
  itemCode: string;
  itemName: string;
  category: string;
  currentAvgPrice: number;
  lastMonthAvgPrice: number;
  priceChange: number;
  priceChangePercent: number;
  priceTrend: 'increasing' | 'stable' | 'decreasing';
  predictedNextPrice: number;
  volatility: 'high' | 'medium' | 'low';
  bestVendorPrice: number;
  bestVendor: string;
  savingsOpportunity: number;
}

export interface VendorRiskForecast {
  vendorId: string;
  vendorName: string;
  category: string;
  currentRiskScore: number;
  predictedRiskScore: number;
  riskTrend: 'improving' | 'stable' | 'worsening';
  onTimeDeliveryRate: number;
  deliveryTrend: 'improving' | 'stable' | 'worsening';
  qualityScore: number;
  qualityTrend: 'improving' | 'stable' | 'worsening';
  paymentHealth: 'good' | 'warning' | 'critical';
  recommendations: string[];
  alertLevel: 'none' | 'watch' | 'warning' | 'critical';
}

export interface ForecastSummary {
  stockOutAlerts: number;
  criticalItems: number;
  risingDemandItems: number;
  priceIncreaseItems: number;
  atRiskVendors: number;
  totalSavingsOpportunity: number;
  lastUpdated: Date;
}

export interface ForecastData {
  summary: ForecastSummary;
  stockOutForecasts: StockOutForecast[];
  demandForecasts: DemandForecast[];
  pricingForecasts: PricingForecast[];
  vendorRiskForecasts: VendorRiskForecast[];
}

@Injectable({
  providedIn: 'root',
})
export class AiForecastingService {
  constructor(private apiService: ApiService) {}

  /**
   * Get all forecasts based on ERP data
   */
  getAllForecasts(): Observable<ForecastData> {
    return forkJoin({
      items: this.apiService.getItems(),
      vendors: this.apiService.getVendors(),
      purchases: this.apiService.getPurchases(),
      vendorItems: this.apiService.getVendorItems(),
      riskAnalysis: this.apiService.getRiskAnalysisList(),
    }).pipe(
      map(({ items, vendors, purchases, vendorItems, riskAnalysis }) => {
        const stockOutForecasts = this.calculateStockOutForecasts(
          items,
          purchases,
          vendorItems
        );
        const demandForecasts = this.calculateDemandForecasts(items, purchases);
        const pricingForecasts = this.calculatePricingForecasts(
          items,
          purchases,
          vendorItems,
          vendors
        );
        const vendorRiskForecasts = this.calculateVendorRiskForecasts(
          vendors,
          purchases,
          riskAnalysis
        );

        const summary: ForecastSummary = {
          stockOutAlerts: stockOutForecasts.filter(
            (s) => s.riskLevel === 'critical' || s.riskLevel === 'high'
          ).length,
          criticalItems: stockOutForecasts.filter(
            (s) => s.riskLevel === 'critical'
          ).length,
          risingDemandItems: demandForecasts.filter(
            (d) => d.demandTrend === 'rising'
          ).length,
          priceIncreaseItems: pricingForecasts.filter(
            (p) => p.priceTrend === 'increasing'
          ).length,
          atRiskVendors: vendorRiskForecasts.filter(
            (v) => v.alertLevel === 'warning' || v.alertLevel === 'critical'
          ).length,
          totalSavingsOpportunity: pricingForecasts.reduce(
            (sum, p) => sum + p.savingsOpportunity,
            0
          ),
          lastUpdated: new Date(),
        };

        return {
          summary,
          stockOutForecasts,
          demandForecasts,
          pricingForecasts,
          vendorRiskForecasts,
        };
      })
    );
  }

  /**
   * Calculate stock-out predictions based on usage patterns
   */
  private calculateStockOutForecasts(
    items: Item[],
    purchases: Purchase[],
    vendorItems: VendorItem[]
  ): StockOutForecast[] {
    const forecasts: StockOutForecast[] = [];
    const now = new Date();

    items.forEach((item) => {
      // Get purchase history for this item
      const itemPurchases = purchases.filter((p) =>
        p.items?.some(
          (pi) =>
            pi.description
              ?.toLowerCase()
              .includes(item.itemName?.toLowerCase()) ||
            pi.description?.toLowerCase().includes(item.itemCode?.toLowerCase())
        )
      );

      // Calculate average daily usage from purchase history
      const totalQuantity = itemPurchases.reduce((sum, p) => {
        const itemInPurchase = p.items?.find((pi) =>
          pi.description?.toLowerCase().includes(item.itemName?.toLowerCase())
        );
        return sum + (itemInPurchase?.quantity || 0);
      }, 0);

      // Assume data spans ~6 months (180 days)
      const avgDailyUsage = totalQuantity / 180 || Math.random() * 5 + 1; // Fallback to random for demo

      // Simulate current stock (in real app, this would come from inventory)
      const currentStock = Math.floor(Math.random() * 100) + 10;

      // Calculate days until stock-out
      const daysUntilStockOut =
        avgDailyUsage > 0 ? Math.floor(currentStock / avgDailyUsage) : 999;

      // Predicted stock-out date
      const stockOutDate = new Date(now);
      stockOutDate.setDate(stockOutDate.getDate() + daysUntilStockOut);

      // Determine risk level
      let riskLevel: 'critical' | 'high' | 'medium' | 'low';
      if (daysUntilStockOut <= 7) riskLevel = 'critical';
      else if (daysUntilStockOut <= 14) riskLevel = 'high';
      else if (daysUntilStockOut <= 30) riskLevel = 'medium';
      else riskLevel = 'low';

      // Calculate reorder point (14 days of stock + safety buffer)
      const reorderPoint = Math.ceil(avgDailyUsage * 14 * 1.2);

      // Suggested order quantity (30 days of stock)
      const suggestedOrderQty = Math.ceil(avgDailyUsage * 30);

      // Get last order date
      const lastOrder = itemPurchases
        .filter((p) => p.status === 'delivered')
        .sort(
          (a, b) =>
            new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
        )[0];

      // Determine trend based on recent purchases
      const recentPurchases = itemPurchases.filter((p) => {
        const orderDate = new Date(p.orderDate);
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return orderDate >= threeMonthsAgo;
      });

      const olderPurchases = itemPurchases.filter((p) => {
        const orderDate = new Date(p.orderDate);
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return orderDate < threeMonthsAgo && orderDate >= sixMonthsAgo;
      });

      let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
      if (recentPurchases.length > olderPurchases.length * 1.2)
        trend = 'increasing';
      else if (recentPurchases.length < olderPurchases.length * 0.8)
        trend = 'decreasing';

      forecasts.push({
        itemId: item.id || '',
        itemCode: item.itemCode,
        itemName: item.itemName,
        category: item.category,
        currentStock,
        avgDailyUsage: Math.round(avgDailyUsage * 10) / 10,
        daysUntilStockOut,
        predictedStockOutDate: stockOutDate.toISOString().split('T')[0],
        riskLevel,
        reorderPoint,
        suggestedOrderQty,
        lastOrderDate: lastOrder?.orderDate || null,
        trend,
      });
    });

    // Sort by days until stock-out (most urgent first)
    return forecasts.sort((a, b) => a.daysUntilStockOut - b.daysUntilStockOut);
  }

  /**
   * Calculate demand forecasts using simple trend analysis
   */
  private calculateDemandForecasts(
    items: Item[],
    purchases: Purchase[]
  ): DemandForecast[] {
    const forecasts: DemandForecast[] = [];
    const now = new Date();

    items.forEach((item) => {
      // Get purchase history
      const itemPurchases = purchases.filter((p) =>
        p.items?.some(
          (pi) =>
            pi.description
              ?.toLowerCase()
              .includes(item.itemName?.toLowerCase()) ||
            pi.description?.toLowerCase().includes(item.itemCode?.toLowerCase())
        )
      );

      // Group purchases by month
      const monthlyDemand: { [key: string]: number } = {};

      itemPurchases.forEach((p) => {
        const date = new Date(p.orderDate);
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, '0')}`;
        const quantity =
          p.items?.find((pi) =>
            pi.description?.toLowerCase().includes(item.itemName?.toLowerCase())
          )?.quantity || 0;
        monthlyDemand[monthKey] = (monthlyDemand[monthKey] || 0) + quantity;
      });

      const months = Object.keys(monthlyDemand).sort();
      const demands = months.map((m) => monthlyDemand[m]);

      // Current and last month
      const currentMonth = `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, '0')}`;
      const lastMonthDate = new Date(now);
      lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
      const lastMonth = `${lastMonthDate.getFullYear()}-${String(
        lastMonthDate.getMonth() + 1
      ).padStart(2, '0')}`;

      const currentMonthDemand =
        monthlyDemand[currentMonth] || Math.floor(Math.random() * 50) + 10;
      const lastMonthDemand =
        monthlyDemand[lastMonth] || Math.floor(Math.random() * 50) + 10;
      const avgMonthlyDemand =
        demands.length > 0
          ? demands.reduce((a, b) => a + b, 0) / demands.length
          : (currentMonthDemand + lastMonthDemand) / 2;

      // Calculate growth rate
      const growthRate =
        lastMonthDemand > 0
          ? ((currentMonthDemand - lastMonthDemand) / lastMonthDemand) * 100
          : 0;

      // Determine trend
      let demandTrend: 'rising' | 'stable' | 'falling' = 'stable';
      if (growthRate > 10) demandTrend = 'rising';
      else if (growthRate < -10) demandTrend = 'falling';

      // Simple prediction: apply growth rate to current demand
      const predictedNextMonthDemand = Math.round(
        currentMonthDemand * (1 + growthRate / 100)
      );

      // Seasonality factor (simplified - would need more data in real app)
      const seasonalityFactor =
        1 + Math.sin((now.getMonth() * Math.PI) / 6) * 0.1;

      // Confidence based on data availability
      const confidence = Math.min(0.95, 0.5 + demands.length * 0.05);

      forecasts.push({
        itemId: item.id || '',
        itemCode: item.itemCode,
        itemName: item.itemName,
        category: item.category,
        currentMonthDemand,
        lastMonthDemand,
        avgMonthlyDemand: Math.round(avgMonthlyDemand),
        predictedNextMonthDemand: Math.max(0, predictedNextMonthDemand),
        demandTrend,
        growthRate: Math.round(growthRate * 10) / 10,
        seasonalityFactor: Math.round(seasonalityFactor * 100) / 100,
        confidence: Math.round(confidence * 100) / 100,
      });
    });

    // Sort by growth rate (highest growth first)
    return forecasts.sort((a, b) => b.growthRate - a.growthRate);
  }

  /**
   * Calculate pricing trends and forecasts
   */
  private calculatePricingForecasts(
    items: Item[],
    purchases: Purchase[],
    vendorItems: VendorItem[],
    vendors: Vendor[]
  ): PricingForecast[] {
    const forecasts: PricingForecast[] = [];
    const now = new Date();

    items.forEach((item) => {
      // Get price history from purchases
      const itemPurchases = purchases.filter((p) =>
        p.items?.some(
          (pi) =>
            pi.description
              ?.toLowerCase()
              .includes(item.itemName?.toLowerCase()) ||
            pi.description?.toLowerCase().includes(item.itemCode?.toLowerCase())
        )
      );

      // Group prices by month
      const monthlyPrices: { [key: string]: number[] } = {};

      itemPurchases.forEach((p) => {
        const date = new Date(p.orderDate);
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, '0')}`;
        const priceItem = p.items?.find((pi) =>
          pi.description?.toLowerCase().includes(item.itemName?.toLowerCase())
        );
        if (priceItem?.unitPrice) {
          if (!monthlyPrices[monthKey]) monthlyPrices[monthKey] = [];
          monthlyPrices[monthKey].push(priceItem.unitPrice);
        }
      });

      const months = Object.keys(monthlyPrices).sort();

      // Calculate average prices
      const currentMonth = `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, '0')}`;
      const lastMonthDate = new Date(now);
      lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
      const lastMonth = `${lastMonthDate.getFullYear()}-${String(
        lastMonthDate.getMonth() + 1
      ).padStart(2, '0')}`;

      const currentPrices = monthlyPrices[currentMonth] || [
        item.defaultPrice || 100,
      ];
      const lastMonthPrices = monthlyPrices[lastMonth] || [
        item.defaultPrice || 100,
      ];

      const currentAvgPrice =
        currentPrices.reduce((a, b) => a + b, 0) / currentPrices.length;
      const lastMonthAvgPrice =
        lastMonthPrices.reduce((a, b) => a + b, 0) / lastMonthPrices.length;

      const priceChange = currentAvgPrice - lastMonthAvgPrice;
      const priceChangePercent =
        lastMonthAvgPrice > 0 ? (priceChange / lastMonthAvgPrice) * 100 : 0;

      // Determine trend
      let priceTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
      if (priceChangePercent > 5) priceTrend = 'increasing';
      else if (priceChangePercent < -5) priceTrend = 'decreasing';

      // Predict next price (simple linear projection)
      const predictedNextPrice =
        currentAvgPrice * (1 + priceChangePercent / 100);

      // Calculate volatility
      const allPrices = Object.values(monthlyPrices).flat();
      let volatility: 'high' | 'medium' | 'low' = 'low';
      if (allPrices.length > 1) {
        const avgPrice =
          allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
        const variance =
          allPrices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) /
          allPrices.length;
        const stdDev = Math.sqrt(variance);
        const coeffOfVar = (stdDev / avgPrice) * 100;
        if (coeffOfVar > 20) volatility = 'high';
        else if (coeffOfVar > 10) volatility = 'medium';
      }

      // Find best vendor price
      const itemVendorPrices = vendorItems.filter(
        (vi) => vi.itemId === item.id
      );
      let bestVendorPrice = currentAvgPrice;
      let bestVendor = 'N/A';

      if (itemVendorPrices.length > 0) {
        const bestVendorItem = itemVendorPrices.reduce((best, current) =>
          current.unitPrice < best.unitPrice ? current : best
        );
        bestVendorPrice = bestVendorItem.unitPrice;
        const vendor = vendors.find((v) => v.id === bestVendorItem.vendorId);
        bestVendor = vendor?.vendorName || 'Unknown';
      }

      // Calculate savings opportunity
      const savingsOpportunity = Math.max(
        0,
        (currentAvgPrice - bestVendorPrice) * 100
      ); // Assume 100 units

      forecasts.push({
        itemId: item.id || '',
        itemCode: item.itemCode,
        itemName: item.itemName,
        category: item.category,
        currentAvgPrice: Math.round(currentAvgPrice * 100) / 100,
        lastMonthAvgPrice: Math.round(lastMonthAvgPrice * 100) / 100,
        priceChange: Math.round(priceChange * 100) / 100,
        priceChangePercent: Math.round(priceChangePercent * 10) / 10,
        priceTrend,
        predictedNextPrice: Math.round(predictedNextPrice * 100) / 100,
        volatility,
        bestVendorPrice: Math.round(bestVendorPrice * 100) / 100,
        bestVendor,
        savingsOpportunity: Math.round(savingsOpportunity * 100) / 100,
      });
    });

    // Sort by price change (highest increase first)
    return forecasts.sort(
      (a, b) => b.priceChangePercent - a.priceChangePercent
    );
  }

  /**
   * Calculate vendor risk forecasts
   */
  private calculateVendorRiskForecasts(
    vendors: Vendor[],
    purchases: Purchase[],
    riskAnalysis: RiskAnalysis[]
  ): VendorRiskForecast[] {
    const forecasts: VendorRiskForecast[] = [];

    vendors.forEach((vendor) => {
      // Get vendor's risk analysis
      const vendorRisk = riskAnalysis.find((r) => r.vendorId === vendor.id);

      // Get vendor's purchase history
      const vendorPurchases = purchases.filter(
        (p) =>
          p.vendorId === vendor.id ||
          p.vendorName?.toLowerCase() === vendor.vendorName?.toLowerCase()
      );

      // Calculate on-time delivery rate
      const deliveredOrders = vendorPurchases.filter(
        (p) => p.status === 'delivered'
      );
      const onTimeDeliveries = deliveredOrders.filter(
        (p) => p.onTimeDelivery === true
      );
      const onTimeDeliveryRate =
        deliveredOrders.length > 0
          ? (onTimeDeliveries.length / deliveredOrders.length) * 100
          : 95; // Default

      // Calculate quality score from purchases
      const qualityRatings = vendorPurchases
        .filter((p) => p.qualityRating !== undefined)
        .map((p) => p.qualityRating || 0);
      const qualityScore =
        qualityRatings.length > 0
          ? (qualityRatings.reduce((a, b) => a + b, 0) /
              qualityRatings.length) *
            20
          : vendor.rating
          ? vendor.rating * 20
          : 80;

      // Current risk score
      const currentRiskScore =
        vendorRisk?.overallScore || Math.floor(Math.random() * 40) + 10;

      // Analyze recent vs older performance for trends
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const recentOrders = vendorPurchases.filter(
        (p) => new Date(p.orderDate) >= threeMonthsAgo
      );
      const olderOrders = vendorPurchases.filter(
        (p) => new Date(p.orderDate) < threeMonthsAgo
      );

      // Calculate delivery trend
      const recentOnTime = recentOrders.filter(
        (p) => p.onTimeDelivery === true
      ).length;
      const recentTotal = recentOrders.filter(
        (p) => p.status === 'delivered'
      ).length;
      const recentDeliveryRate =
        recentTotal > 0
          ? (recentOnTime / recentTotal) * 100
          : onTimeDeliveryRate;

      const olderOnTime = olderOrders.filter(
        (p) => p.onTimeDelivery === true
      ).length;
      const olderTotal = olderOrders.filter(
        (p) => p.status === 'delivered'
      ).length;
      const olderDeliveryRate =
        olderTotal > 0 ? (olderOnTime / olderTotal) * 100 : onTimeDeliveryRate;

      let deliveryTrend: 'improving' | 'stable' | 'worsening' = 'stable';
      if (recentDeliveryRate > olderDeliveryRate + 5)
        deliveryTrend = 'improving';
      else if (recentDeliveryRate < olderDeliveryRate - 5)
        deliveryTrend = 'worsening';

      // Quality trend
      const recentQuality = recentOrders
        .filter((p) => p.qualityRating)
        .map((p) => p.qualityRating || 0);
      const olderQuality = olderOrders
        .filter((p) => p.qualityRating)
        .map((p) => p.qualityRating || 0);

      const recentAvgQuality =
        recentQuality.length > 0
          ? recentQuality.reduce((a, b) => a + b, 0) / recentQuality.length
          : qualityScore / 20;
      const olderAvgQuality =
        olderQuality.length > 0
          ? olderQuality.reduce((a, b) => a + b, 0) / olderQuality.length
          : qualityScore / 20;

      let qualityTrend: 'improving' | 'stable' | 'worsening' = 'stable';
      if (recentAvgQuality > olderAvgQuality + 0.3) qualityTrend = 'improving';
      else if (recentAvgQuality < olderAvgQuality - 0.3)
        qualityTrend = 'worsening';

      // Predict future risk score
      let predictedRiskScore = currentRiskScore;
      if (deliveryTrend === 'worsening' || qualityTrend === 'worsening') {
        predictedRiskScore = Math.min(100, currentRiskScore + 10);
      } else if (
        deliveryTrend === 'improving' &&
        qualityTrend === 'improving'
      ) {
        predictedRiskScore = Math.max(0, currentRiskScore - 5);
      }

      // Overall risk trend
      let riskTrend: 'improving' | 'stable' | 'worsening' = 'stable';
      if (predictedRiskScore < currentRiskScore - 3) riskTrend = 'improving';
      else if (predictedRiskScore > currentRiskScore + 3)
        riskTrend = 'worsening';

      // Payment health
      const overduePayments = vendorPurchases.filter(
        (p) => p.paymentStatus === 'overdue'
      ).length;
      const pendingPayments = vendorPurchases.filter(
        (p) => p.paymentStatus === 'pending'
      ).length;
      let paymentHealth: 'good' | 'warning' | 'critical' = 'good';
      if (overduePayments > 2) paymentHealth = 'critical';
      else if (overduePayments > 0 || pendingPayments > 3)
        paymentHealth = 'warning';

      // Alert level
      let alertLevel: 'none' | 'watch' | 'warning' | 'critical' = 'none';
      if (currentRiskScore >= 70 || paymentHealth === 'critical')
        alertLevel = 'critical';
      else if (
        currentRiskScore >= 50 ||
        paymentHealth === 'warning' ||
        riskTrend === 'worsening'
      )
        alertLevel = 'warning';
      else if (currentRiskScore >= 30 || deliveryTrend === 'worsening')
        alertLevel = 'watch';

      // Generate recommendations
      const recommendations: string[] = [];
      if (deliveryTrend === 'worsening') {
        recommendations.push(
          'Review delivery SLAs and discuss improvement plans'
        );
      }
      if (qualityTrend === 'worsening') {
        recommendations.push('Schedule quality audit and inspection');
      }
      if (paymentHealth !== 'good') {
        recommendations.push('Review payment terms and outstanding invoices');
      }
      if (currentRiskScore > 50) {
        recommendations.push('Consider diversifying supplier base');
      }
      if (onTimeDeliveryRate < 85) {
        recommendations.push('Negotiate better delivery commitments');
      }
      if (recommendations.length === 0) {
        recommendations.push(
          'Continue monitoring - vendor performance is stable'
        );
      }

      forecasts.push({
        vendorId: vendor.id || '',
        vendorName: vendor.vendorName,
        category: vendor.category,
        currentRiskScore: Math.round(currentRiskScore),
        predictedRiskScore: Math.round(predictedRiskScore),
        riskTrend,
        onTimeDeliveryRate: Math.round(onTimeDeliveryRate),
        deliveryTrend,
        qualityScore: Math.round(qualityScore),
        qualityTrend,
        paymentHealth,
        recommendations,
        alertLevel,
      });
    });

    // Sort by risk score (highest risk first)
    return forecasts.sort((a, b) => b.currentRiskScore - a.currentRiskScore);
  }

  /**
   * Get stock-out alerts (critical and high risk items)
   */
  getStockOutAlerts(): Observable<StockOutForecast[]> {
    return this.getAllForecasts().pipe(
      map((data) =>
        data.stockOutForecasts.filter(
          (s) => s.riskLevel === 'critical' || s.riskLevel === 'high'
        )
      )
    );
  }

  /**
   * Get rising demand items
   */
  getRisingDemandItems(): Observable<DemandForecast[]> {
    return this.getAllForecasts().pipe(
      map((data) =>
        data.demandForecasts.filter((d) => d.demandTrend === 'rising')
      )
    );
  }

  /**
   * Get price increase alerts
   */
  getPriceIncreaseAlerts(): Observable<PricingForecast[]> {
    return this.getAllForecasts().pipe(
      map((data) =>
        data.pricingForecasts.filter((p) => p.priceTrend === 'increasing')
      )
    );
  }

  /**
   * Get at-risk vendors
   */
  getAtRiskVendors(): Observable<VendorRiskForecast[]> {
    return this.getAllForecasts().pipe(
      map((data) =>
        data.vendorRiskForecasts.filter(
          (v) => v.alertLevel === 'warning' || v.alertLevel === 'critical'
        )
      )
    );
  }
}
