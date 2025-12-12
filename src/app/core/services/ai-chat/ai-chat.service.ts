import { Injectable } from '@angular/core';
import { Observable, of, forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ApiService, Vendor, Purchase, RiskAnalysis, Item } from '../api/api.service';

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: any; // For structured data responses
  suggestions?: string[]; // Follow-up suggestions
}

export interface QueryIntent {
  type: 'vendors' | 'purchases' | 'inventory' | 'risk' | 'analytics' | 'help' | 'unknown' | 'products' | 'accounts';
  action: 'list' | 'top' | 'pending' | 'overdue' | 'count' | 'search' | 'status' | 'summary' | 'help' | 'accepted' | 'received' | 'payable';
  filters?: {
    limit?: number;
    status?: string;
    period?: string;
    category?: string;
    riskLevel?: string;
    searchTerm?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AiChatService {
  private conversationHistory: ChatMessage[] = [];

  constructor(private apiService: ApiService) {}

  // Parse user query and determine intent
  parseQuery(query: string): QueryIntent {
    const lowerQuery = query.toLowerCase().trim();
    
    // Help queries
    if (lowerQuery.includes('help') || lowerQuery.includes('what can you do') || lowerQuery === '?') {
      return { type: 'help', action: 'help' };
    }

    // Vendor queries
    if (lowerQuery.includes('vendor') || lowerQuery.includes('supplier')) {
      if (lowerQuery.includes('top') || lowerQuery.includes('best')) {
        const limit = this.extractNumber(lowerQuery) || 5;
        return { type: 'vendors', action: 'top', filters: { limit } };
      }
      if (lowerQuery.includes('inactive') || lowerQuery.includes('suspended')) {
        return { type: 'vendors', action: 'list', filters: { status: 'inactive' } };
      }
      if (lowerQuery.includes('active')) {
        return { type: 'vendors', action: 'list', filters: { status: 'active' } };
      }
      if (lowerQuery.includes('new') || lowerQuery.includes('recent')) {
        return { type: 'vendors', action: 'list', filters: { period: 'month' } };
      }
      if (lowerQuery.includes('how many') || lowerQuery.includes('count') || lowerQuery.includes('total')) {
        return { type: 'vendors', action: 'count' };
      }
      if (lowerQuery.includes('rating') || lowerQuery.includes('rated')) {
        return { type: 'vendors', action: 'top', filters: { limit: 5 } };
      }
      return { type: 'vendors', action: 'summary' };
    }

    // Purchase/Order queries
    if (lowerQuery.includes('purchase') || lowerQuery.includes('order') || lowerQuery.includes('po')) {
      if (lowerQuery.includes('pending') || lowerQuery.includes('waiting')) {
        return { type: 'purchases', action: 'pending' };
      }
      if (lowerQuery.includes('overdue') || lowerQuery.includes('late') || lowerQuery.includes('delayed')) {
        return { type: 'purchases', action: 'overdue' };
      }
      if (lowerQuery.includes('recent') || lowerQuery.includes('latest') || lowerQuery.includes('new')) {
        const limit = this.extractNumber(lowerQuery) || 5;
        return { type: 'purchases', action: 'list', filters: { limit, period: 'recent' } };
      }
      if (lowerQuery.includes('delivered') || lowerQuery.includes('completed')) {
        return { type: 'purchases', action: 'list', filters: { status: 'delivered' } };
      }
      if (lowerQuery.includes('cancelled')) {
        return { type: 'purchases', action: 'list', filters: { status: 'cancelled' } };
      }
      if (lowerQuery.includes('how many') || lowerQuery.includes('count') || lowerQuery.includes('total')) {
        return { type: 'purchases', action: 'count' };
      }
      if (lowerQuery.includes('urgent') || lowerQuery.includes('priority')) {
        return { type: 'purchases', action: 'list', filters: { status: 'urgent' } };
      }
      return { type: 'purchases', action: 'summary' };
    }

    // Inventory/Stock queries
    if (lowerQuery.includes('stock') || lowerQuery.includes('inventory') || lowerQuery.includes('item')) {
      if (lowerQuery.includes('out of') || lowerQuery.includes('low') || lowerQuery.includes('running out')) {
        return { type: 'inventory', action: 'status', filters: { status: 'low' } };
      }
      if (lowerQuery.includes('how many') || lowerQuery.includes('count')) {
        return { type: 'inventory', action: 'count' };
      }
      return { type: 'inventory', action: 'summary' };
    }

    // Product queries (total products, product status)
    if (lowerQuery.includes('product')) {
      if (lowerQuery.includes('accepted')) {
        return { type: 'products', action: 'accepted' };
      }
      if (lowerQuery.includes('received')) {
        return { type: 'products', action: 'received' };
      }
      if (lowerQuery.includes('status')) {
        return { type: 'products', action: 'status' };
      }
      if (lowerQuery.includes('total') || lowerQuery.includes('how many') || lowerQuery.includes('count')) {
        return { type: 'products', action: 'count' };
      }
      return { type: 'products', action: 'summary' };
    }

    // Accounts Payable queries
    if (lowerQuery.includes('accounts payable') || lowerQuery.includes('payable') || lowerQuery.includes('payment') || 
        lowerQuery.includes('pay') || lowerQuery.includes('due') || lowerQuery.includes('owe') || lowerQuery.includes('outstanding')) {
      if (lowerQuery.includes('overdue') || lowerQuery.includes('late')) {
        return { type: 'accounts', action: 'overdue' };
      }
      if (lowerQuery.includes('pending')) {
        return { type: 'accounts', action: 'pending' };
      }
      return { type: 'accounts', action: 'payable' };
    }

    // Risk queries
    if (lowerQuery.includes('risk') || lowerQuery.includes('risky') || lowerQuery.includes('dangerous')) {
      if (lowerQuery.includes('high') || lowerQuery.includes('critical')) {
        return { type: 'risk', action: 'list', filters: { riskLevel: 'high' } };
      }
      if (lowerQuery.includes('low')) {
        return { type: 'risk', action: 'list', filters: { riskLevel: 'low' } };
      }
      return { type: 'risk', action: 'summary' };
    }

    // Analytics/Summary queries
    if (lowerQuery.includes('summary') || lowerQuery.includes('overview') || lowerQuery.includes('dashboard') || 
        lowerQuery.includes('analytics') || lowerQuery.includes('report')) {
      return { type: 'analytics', action: 'summary' };
    }

    // Spending queries
    if (lowerQuery.includes('spend') || lowerQuery.includes('expense') || lowerQuery.includes('cost') || lowerQuery.includes('money')) {
      return { type: 'analytics', action: 'summary' };
    }

    // Try to extract search terms
    const searchTerms = this.extractSearchTerms(lowerQuery);
    if (searchTerms) {
      return { type: 'vendors', action: 'search', filters: { searchTerm: searchTerms } };
    }

    return { type: 'unknown', action: 'help' };
  }

  // Process query and return response
  processQuery(query: string): Observable<ChatMessage> {
    const intent = this.parseQuery(query);
    
    return this.executeQuery(intent, query).pipe(
      map(response => ({
        id: this.generateId(),
        type: 'assistant' as const,
        content: response.content,
        timestamp: new Date(),
        data: response.data,
        suggestions: response.suggestions
      }))
    );
  }

  private executeQuery(intent: QueryIntent, originalQuery: string): Observable<{ content: string; data?: any; suggestions?: string[] }> {
    switch (intent.type) {
      case 'help':
        return of(this.getHelpResponse());
      
      case 'vendors':
        return this.handleVendorQuery(intent);
      
      case 'purchases':
        return this.handlePurchaseQuery(intent);
      
      case 'inventory':
        return this.handleInventoryQuery(intent);
      
      case 'risk':
        return this.handleRiskQuery(intent);
      
      case 'analytics':
        return this.handleAnalyticsQuery(intent);

      case 'products':
        return this.handleProductQuery(intent);

      case 'accounts':
        return this.handleAccountsPayableQuery(intent);
      
      default:
        return of({
          content: `I'm not sure I understood your question: "${originalQuery}". Here are some things you can ask me:`,
          suggestions: [
            'Show me top 5 vendors',
            'What are my pending orders?',
            'Show high risk vendors',
            'Give me a summary'
          ]
        });
    }
  }

  // Handle vendor queries
  private handleVendorQuery(intent: QueryIntent): Observable<{ content: string; data?: any; suggestions?: string[] }> {
    return this.apiService.getVendors().pipe(
      map(vendors => {
        let filteredVendors = vendors;
        let content = '';
        let suggestions: string[] = [];

        switch (intent.action) {
          case 'top':
            const limit = intent.filters?.limit || 5;
            filteredVendors = [...vendors]
              .sort((a, b) => (b.totalPurchases || 0) - (a.totalPurchases || 0))
              .slice(0, limit);
            content = `📊 **Top ${limit} Vendors by Purchase Volume:**\n\n`;
            filteredVendors.forEach((v, i) => {
              content += `${i + 1}. **${v.vendorName}** - $${(v.totalPurchases || 0).toLocaleString()} | Rating: ${'⭐'.repeat(Math.round(v.rating || 0))} (${v.rating?.toFixed(1) || 'N/A'})\n`;
            });
            suggestions = ['Show vendor details', 'Show high risk vendors', 'What are pending orders?'];
            break;

          case 'count':
            const activeCount = vendors.filter(v => v.status === 'active').length;
            const inactiveCount = vendors.filter(v => v.status !== 'active').length;
            content = `📈 **Vendor Statistics:**\n\n• Total Vendors: **${vendors.length}**\n• Active: **${activeCount}**\n• Inactive/Other: **${inactiveCount}**`;
            suggestions = ['Show top vendors', 'Show inactive vendors', 'Show risk analysis'];
            break;

          case 'list':
            if (intent.filters?.status) {
              filteredVendors = vendors.filter(v => v.status === intent.filters?.status);
              content = `📋 **${intent.filters.status.charAt(0).toUpperCase() + intent.filters.status.slice(1)} Vendors (${filteredVendors.length}):**\n\n`;
            } else if (intent.filters?.period === 'month') {
              const oneMonthAgo = new Date();
              oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
              filteredVendors = vendors.filter(v => v.createdAt && new Date(v.createdAt) > oneMonthAgo);
              content = `🆕 **New Vendors This Month (${filteredVendors.length}):**\n\n`;
            }
            filteredVendors.slice(0, 10).forEach((v, i) => {
              content += `${i + 1}. **${v.vendorName}** - ${v.category || 'N/A'} | Status: ${v.status}\n`;
            });
            if (filteredVendors.length > 10) {
              content += `\n_...and ${filteredVendors.length - 10} more_`;
            }
            suggestions = ['Show top vendors', 'Show vendor count', 'Show pending orders'];
            break;

          case 'search':
            const searchTerm = intent.filters?.searchTerm?.toLowerCase() || '';
            filteredVendors = vendors.filter(v => 
              v.vendorName.toLowerCase().includes(searchTerm) ||
              v.category?.toLowerCase().includes(searchTerm) ||
              v.contactPerson?.toLowerCase().includes(searchTerm)
            );
            if (filteredVendors.length > 0) {
              content = `🔍 **Search Results for "${intent.filters?.searchTerm}" (${filteredVendors.length}):**\n\n`;
              filteredVendors.slice(0, 5).forEach((v, i) => {
                content += `${i + 1}. **${v.vendorName}** - ${v.category || 'N/A'} | Rating: ${v.rating?.toFixed(1) || 'N/A'}\n`;
              });
            } else {
              content = `No vendors found matching "${intent.filters?.searchTerm}"`;
            }
            suggestions = ['Show all vendors', 'Show top vendors', 'Add new vendor'];
            break;

          case 'summary':
          default:
            const avgRating = vendors.reduce((acc, v) => acc + (v.rating || 0), 0) / vendors.length;
            const totalSpend = vendors.reduce((acc, v) => acc + (v.totalPurchases || 0), 0);
            content = `📊 **Vendor Summary:**\n\n• Total Vendors: **${vendors.length}**\n• Average Rating: **${avgRating.toFixed(1)}** ⭐\n• Total Purchases: **$${totalSpend.toLocaleString()}**\n• Active Vendors: **${vendors.filter(v => v.status === 'active').length}**`;
            suggestions = ['Show top 5 vendors', 'Show inactive vendors', 'Show new vendors this month'];
            break;
        }

        return { content, data: filteredVendors, suggestions };
      })
    );
  }

  // Handle purchase queries
  private handlePurchaseQuery(intent: QueryIntent): Observable<{ content: string; data?: any; suggestions?: string[] }> {
    return this.apiService.getPurchases().pipe(
      map(purchases => {
        let filteredPurchases = purchases;
        let content = '';
        let suggestions: string[] = [];

        switch (intent.action) {
          case 'pending':
            filteredPurchases = purchases.filter(p => p.status === 'pending' || p.status === 'approved');
            content = `⏳ **Pending Purchase Orders (${filteredPurchases.length}):**\n\n`;
            if (filteredPurchases.length === 0) {
              content = '✅ **Great news!** No pending purchase orders at the moment.';
            } else {
              filteredPurchases.slice(0, 8).forEach((p, i) => {
                content += `${i + 1}. **${p.purchaseOrderNumber}** - ${p.vendorName || 'Unknown'}\n   Amount: $${p.totalAmount?.toLocaleString() || 0} | Status: ${p.status}${p.urgent ? ' 🔴 URGENT' : ''}\n\n`;
              });
              if (filteredPurchases.length > 8) {
                content += `_...and ${filteredPurchases.length - 8} more pending orders_`;
              }
            }
            suggestions = ['Show overdue orders', 'Show delivered orders', 'Show order summary'];
            break;

          case 'overdue':
            const today = new Date();
            filteredPurchases = purchases.filter(p => {
              if (p.status === 'delivered' || p.status === 'cancelled') return false;
              if (!p.expectedDeliveryDate) return false;
              return new Date(p.expectedDeliveryDate) < today;
            });
            content = `⚠️ **Overdue Orders (${filteredPurchases.length}):**\n\n`;
            if (filteredPurchases.length === 0) {
              content = '✅ **Excellent!** No overdue orders at the moment.';
            } else {
              filteredPurchases.slice(0, 8).forEach((p, i) => {
                const daysOverdue = Math.floor((today.getTime() - new Date(p.expectedDeliveryDate!).getTime()) / (1000 * 60 * 60 * 24));
                content += `${i + 1}. **${p.purchaseOrderNumber}** - ${p.vendorName || 'Unknown'}\n   ${daysOverdue} days overdue | Amount: $${p.totalAmount?.toLocaleString() || 0}\n\n`;
              });
            }
            suggestions = ['Show pending orders', 'Show high risk vendors', 'Contact vendor'];
            break;

          case 'count':
            const statusCounts = {
              pending: purchases.filter(p => p.status === 'pending').length,
              approved: purchases.filter(p => p.status === 'approved').length,
              shipped: purchases.filter(p => p.status === 'shipped').length,
              delivered: purchases.filter(p => p.status === 'delivered').length,
              cancelled: purchases.filter(p => p.status === 'cancelled').length
            };
            content = `📊 **Purchase Order Statistics:**\n\n• Total Orders: **${purchases.length}**\n• Pending: **${statusCounts.pending}**\n• Approved: **${statusCounts.approved}**\n• Shipped: **${statusCounts.shipped}**\n• Delivered: **${statusCounts.delivered}**\n• Cancelled: **${statusCounts.cancelled}**`;
            suggestions = ['Show pending orders', 'Show overdue orders', 'Show recent orders'];
            break;

          case 'list':
            if (intent.filters?.status === 'delivered') {
              filteredPurchases = purchases.filter(p => p.status === 'delivered');
              content = `✅ **Delivered Orders (${filteredPurchases.length}):**\n\n`;
            } else if (intent.filters?.status === 'cancelled') {
              filteredPurchases = purchases.filter(p => p.status === 'cancelled');
              content = `❌ **Cancelled Orders (${filteredPurchases.length}):**\n\n`;
            } else if (intent.filters?.status === 'urgent') {
              filteredPurchases = purchases.filter(p => p.urgent);
              content = `🔴 **Urgent Orders (${filteredPurchases.length}):**\n\n`;
            } else if (intent.filters?.period === 'recent') {
              filteredPurchases = [...purchases]
                .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
                .slice(0, intent.filters.limit || 5);
              content = `📋 **Recent Orders (${filteredPurchases.length}):**\n\n`;
            }
            filteredPurchases.slice(0, 8).forEach((p, i) => {
              content += `${i + 1}. **${p.purchaseOrderNumber}** - ${p.vendorName || 'Unknown'}\n   Amount: $${p.totalAmount?.toLocaleString() || 0} | ${p.orderDate}\n\n`;
            });
            suggestions = ['Show pending orders', 'Show order count', 'Show vendor summary'];
            break;

          case 'summary':
          default:
            const totalValue = purchases.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
            const pendingCount = purchases.filter(p => p.status === 'pending' || p.status === 'approved').length;
            const urgentCount = purchases.filter(p => p.urgent).length;
            content = `📊 **Purchase Order Summary:**\n\n• Total Orders: **${purchases.length}**\n• Total Value: **$${totalValue.toLocaleString()}**\n• Pending Orders: **${pendingCount}**\n• Urgent Orders: **${urgentCount}** 🔴`;
            suggestions = ['Show pending orders', 'Show overdue orders', 'Show recent orders'];
            break;
        }

        return { content, data: filteredPurchases, suggestions };
      })
    );
  }

  // Handle inventory queries
  private handleInventoryQuery(intent: QueryIntent): Observable<{ content: string; data?: any; suggestions?: string[] }> {
    return this.apiService.getItems().pipe(
      map(items => {
        let content = '';
        let suggestions: string[] = [];

        switch (intent.action) {
          case 'status':
            // Simulate low stock items (in real app, would check actual inventory levels)
            const lowStockItems = items.slice(0, 3); // Simulated
            content = `⚠️ **Low Stock Alert:**\n\nThe following items may need reordering soon:\n\n`;
            lowStockItems.forEach((item, i) => {
              content += `${i + 1}. **${item.itemName}** (${item.itemCode})\n   Category: ${item.category} | Unit: ${item.unit}\n\n`;
            });
            content += `\n_💡 Tip: Set up automatic reorder points to avoid stockouts._`;
            suggestions = ['Show all items', 'Create purchase order', 'Show vendor for item'];
            break;

          case 'count':
            const activeItems = items.filter(i => i.status === 'active').length;
            content = `📦 **Inventory Statistics:**\n\n• Total Items: **${items.length}**\n• Active Items: **${activeItems}**\n• Categories: **${[...new Set(items.map(i => i.category))].length}**`;
            suggestions = ['Show low stock items', 'Show item categories', 'Add new item'];
            break;

          case 'summary':
          default:
            const categories = [...new Set(items.map(i => i.category))];
            content = `📦 **Inventory Summary:**\n\n• Total Items: **${items.length}**\n• Categories: **${categories.length}**\n• Active Items: **${items.filter(i => i.status === 'active').length}**\n\n**Categories:**\n`;
            categories.slice(0, 5).forEach(cat => {
              const count = items.filter(i => i.category === cat).length;
              content += `• ${cat}: ${count} items\n`;
            });
            suggestions = ['Show low stock items', 'Show item count', 'Add new item'];
            break;
        }

        return { content, data: items, suggestions };
      })
    );
  }

  // Handle risk queries
  private handleRiskQuery(intent: QueryIntent): Observable<{ content: string; data?: any; suggestions?: string[] }> {
    return this.apiService.getRiskAnalysisList().pipe(
      map((risks: RiskAnalysis[]) => {
        let filteredRisks: RiskAnalysis[] = risks;
        let content = '';
        let suggestions: string[] = [];

        switch (intent.action) {
          case 'list':
            if (intent.filters?.riskLevel === 'high') {
              filteredRisks = risks.filter((r: RiskAnalysis) => r.riskLevel === 'high' || r.riskLevel === 'critical');
              content = `🔴 **High Risk Vendors (${filteredRisks.length}):**\n\n`;
              if (filteredRisks.length === 0) {
                content = '✅ **Great!** No high-risk vendors at the moment.';
              } else {
                filteredRisks.forEach((r: RiskAnalysis, i: number) => {
                  content += `${i + 1}. **${r.vendorName || 'Unknown'}** - Risk Level: ${r.riskLevel?.toUpperCase()}\n   Score: ${r.overallScore}/100 | Financial: ${r.financialRisk}% | Operational: ${r.operationalRisk}%\n\n`;
                });
              }
            } else if (intent.filters?.riskLevel === 'low') {
              filteredRisks = risks.filter((r: RiskAnalysis) => r.riskLevel === 'low');
              content = `✅ **Low Risk Vendors (${filteredRisks.length}):**\n\n`;
              filteredRisks.slice(0, 5).forEach((r: RiskAnalysis, i: number) => {
                content += `${i + 1}. **${r.vendorName || 'Unknown'}** - Score: ${r.overallScore}/100\n`;
              });
            }
            suggestions = ['Show risk summary', 'Show vendor details', 'Show pending orders'];
            break;

          case 'summary':
          default:
            const highRisk = risks.filter((r: RiskAnalysis) => r.riskLevel === 'high' || r.riskLevel === 'critical').length;
            const mediumRisk = risks.filter((r: RiskAnalysis) => r.riskLevel === 'medium').length;
            const lowRisk = risks.filter((r: RiskAnalysis) => r.riskLevel === 'low').length;
            const avgScore = risks.reduce((acc: number, r: RiskAnalysis) => acc + (r.overallScore || 0), 0) / risks.length;
            
            content = `🛡️ **Risk Analysis Summary:**\n\n• Total Assessed: **${risks.length}**\n• Average Risk Score: **${avgScore.toFixed(1)}/100**\n\n**Risk Distribution:**\n• 🔴 High/Critical: **${highRisk}**\n• 🟡 Medium: **${mediumRisk}**\n• 🟢 Low: **${lowRisk}**`;
            
            if (highRisk > 0) {
              content += `\n\n⚠️ _${highRisk} vendor(s) require immediate attention!_`;
            }
            suggestions = ['Show high risk vendors', 'Show low risk vendors', 'View risk details'];
            break;
        }

        return { content, data: filteredRisks, suggestions };
      })
    );
  }

  // Handle analytics queries
  private handleAnalyticsQuery(intent: QueryIntent): Observable<{ content: string; data?: any; suggestions?: string[] }> {
    return forkJoin({
      vendors: this.apiService.getVendors(),
      purchases: this.apiService.getPurchases(),
      risks: this.apiService.getRiskAnalysisList(),
      items: this.apiService.getItems()
    }).pipe(
      map(({ vendors, purchases, risks, items }) => {
        const totalSpend = purchases.reduce((acc: number, p: Purchase) => acc + (p.totalAmount || 0), 0);
        const pendingOrders = purchases.filter((p: Purchase) => p.status === 'pending' || p.status === 'approved').length;
        const highRiskVendors = risks.filter((r: RiskAnalysis) => r.riskLevel === 'high' || r.riskLevel === 'critical').length;
        const avgVendorRating = vendors.reduce((acc: number, v: Vendor) => acc + (v.rating || 0), 0) / vendors.length;
        
        const content = `📊 **ERP Dashboard Summary:**

**Vendors:**
• Total: **${vendors.length}** | Active: **${vendors.filter(v => v.status === 'active').length}**
• Average Rating: **${avgVendorRating.toFixed(1)}** ⭐

**Purchase Orders:**
• Total Orders: **${purchases.length}**
• Total Spend: **$${totalSpend.toLocaleString()}**
• Pending: **${pendingOrders}**

**Risk Analysis:**
• High Risk Vendors: **${highRiskVendors}** ${highRiskVendors > 0 ? '⚠️' : '✅'}

**Inventory:**
• Total Items: **${items.length}**
• Categories: **${[...new Set(items.map(i => i.category))].length}**`;

        return {
          content,
          data: { vendors, purchases, risks, items },
          suggestions: ['Show top vendors', 'Show pending orders', 'Show high risk vendors', 'Show low stock items']
        };
      })
    );
  }

  // Handle product queries (total products, accepted, received status)
  private handleProductQuery(intent: QueryIntent): Observable<{ content: string; data?: any; suggestions?: string[] }> {
    return forkJoin({
      items: this.apiService.getItems(),
      purchases: this.apiService.getPurchases()
    }).pipe(
      map(({ items, purchases }) => {
        let content = '';
        let suggestions: string[] = [];

        // Calculate product metrics from purchases
        let totalQuantityReceived = 0;
        let totalQuantityAccepted = 0;
        let totalQuantityReturned = 0;
        let totalDefects = 0;

        purchases.forEach((p: Purchase) => {
          totalQuantityReceived += p.quantityReceived || 0;
          totalQuantityAccepted += p.quantityAccepted || 0;
          totalQuantityReturned += p.returnedItems || 0;
          totalDefects += p.defectCount || 0;
        });

        // Calculate totals from items
        const totalProducts = items.length;
        const activeProducts = items.filter((i: Item) => i.status === 'active').length;
        const inactiveProducts = items.filter((i: Item) => i.status === 'inactive').length;

        // Get categories
        const categories = [...new Set(items.map((i: Item) => i.category))];

        switch (intent.action) {
          case 'accepted':
            const acceptanceRate = totalQuantityReceived > 0 
              ? ((totalQuantityAccepted / totalQuantityReceived) * 100).toFixed(1) 
              : '100';
            content = `✅ **Product Acceptance Status:**

• Total Quantity Received: **${totalQuantityReceived.toLocaleString()}** units
• Total Quantity Accepted: **${totalQuantityAccepted.toLocaleString()}** units
• Acceptance Rate: **${acceptanceRate}%**
• Returned Items: **${totalQuantityReturned.toLocaleString()}** units
• Defective Items: **${totalDefects.toLocaleString()}** units

${parseFloat(acceptanceRate) >= 95 ? '🌟 Excellent acceptance rate!' : parseFloat(acceptanceRate) >= 90 ? '👍 Good acceptance rate' : '⚠️ Acceptance rate needs improvement'}`;
            suggestions = ['Show total products', 'Show received products', 'Show product summary'];
            break;

          case 'received':
            const deliveredOrders = purchases.filter((p: Purchase) => p.status === 'delivered').length;
            const shippedOrders = purchases.filter((p: Purchase) => p.status === 'shipped').length;
            content = `📦 **Products Received Status:**

• Total Products Received: **${totalQuantityReceived.toLocaleString()}** units
• From **${deliveredOrders}** delivered orders
• Currently Shipped (In Transit): **${shippedOrders}** orders

**Quality Metrics:**
• Accepted: **${totalQuantityAccepted.toLocaleString()}** units
• Returned: **${totalQuantityReturned.toLocaleString()}** units
• Defects Found: **${totalDefects.toLocaleString()}** units`;
            suggestions = ['Show accepted products', 'Show product summary', 'Show pending orders'];
            break;

          case 'count':
            content = `📊 **Total Products Count:**

• Total Products in Master Data: **${totalProducts}**
• Active Products: **${activeProducts}** ✅
• Inactive Products: **${inactiveProducts}** ⚫

**By Category:**
${categories.map(cat => `• ${cat}: **${items.filter((i: Item) => i.category === cat).length}** products`).join('\n')}`;
            suggestions = ['Show accepted products', 'Show received products', 'Show accounts payable'];
            break;

          case 'status':
          case 'summary':
          default:
            const avgPrice = items.reduce((acc: number, i: Item) => acc + (i.defaultPrice || 0), 0) / items.length;
            content = `📦 **Product Summary:**

**Master Data:**
• Total Products: **${totalProducts}**
• Active: **${activeProducts}** | Inactive: **${inactiveProducts}**
• Categories: **${categories.length}**
• Average Unit Price: **$${avgPrice.toFixed(2)}**

**Receiving Status:**
• Quantity Received: **${totalQuantityReceived.toLocaleString()}** units
• Quantity Accepted: **${totalQuantityAccepted.toLocaleString()}** units
• Returned: **${totalQuantityReturned.toLocaleString()}** units

**Categories:**
${categories.slice(0, 5).map(cat => `• ${cat}: ${items.filter((i: Item) => i.category === cat).length} items`).join('\n')}`;
            suggestions = ['Show total products', 'Show accepted products', 'Show accounts payable'];
            break;
        }

        return { content, data: { items, purchases }, suggestions };
      })
    );
  }

  // Handle accounts payable queries
  private handleAccountsPayableQuery(intent: QueryIntent): Observable<{ content: string; data?: any; suggestions?: string[] }> {
    return this.apiService.getPurchases().pipe(
      map((purchases: Purchase[]) => {
        let content = '';
        let suggestions: string[] = [];

        // Calculate accounts payable metrics
        const allPayments = purchases.filter((p: Purchase) => p.status !== 'cancelled');
        const pendingPayments = purchases.filter((p: Purchase) => p.paymentStatus === 'pending');
        const overduePayments = purchases.filter((p: Purchase) => p.paymentStatus === 'overdue');
        const partialPayments = purchases.filter((p: Purchase) => p.paymentStatus === 'partial');
        const paidOrders = purchases.filter((p: Purchase) => p.paymentStatus === 'paid');

        // Calculate amounts
        const totalPayable = allPayments.reduce((acc: number, p: Purchase) => {
          if (p.paymentStatus !== 'paid') {
            return acc + (p.totalAmount || 0);
          }
          return acc;
        }, 0);

        const totalPending = pendingPayments.reduce((acc: number, p: Purchase) => acc + (p.totalAmount || 0), 0);
        const totalOverdue = overduePayments.reduce((acc: number, p: Purchase) => acc + (p.totalAmount || 0), 0);
        const totalPartial = partialPayments.reduce((acc: number, p: Purchase) => acc + (p.totalAmount || 0), 0);
        const totalPaid = paidOrders.reduce((acc: number, p: Purchase) => acc + (p.totalAmount || 0), 0);

        // Calculate average payment delay
        const ordersWithDelay = purchases.filter((p: Purchase) => p.paymentDelayDays && p.paymentDelayDays > 0);
        const avgPaymentDelay = ordersWithDelay.length > 0
          ? ordersWithDelay.reduce((acc: number, p: Purchase) => acc + (p.paymentDelayDays || 0), 0) / ordersWithDelay.length
          : 0;

        switch (intent.action) {
          case 'overdue':
            content = `⚠️ **Overdue Payments:**

• Total Overdue: **$${totalOverdue.toLocaleString()}**
• Number of Overdue Invoices: **${overduePayments.length}**

${overduePayments.length > 0 ? `**Overdue Orders:**\n${overduePayments.slice(0, 5).map((p: Purchase, i: number) => 
  `${i + 1}. **${p.purchaseOrderNumber}** - $${(p.totalAmount || 0).toLocaleString()} (${p.vendorName || 'Unknown'})`
).join('\n')}` : '✅ No overdue payments!'}

${overduePayments.length > 5 ? `\n_...and ${overduePayments.length - 5} more_` : ''}`;
            suggestions = ['Show all accounts payable', 'Show pending payments', 'Show vendor list'];
            break;

          case 'pending':
            content = `⏳ **Pending Payments:**

• Total Pending: **$${totalPending.toLocaleString()}**
• Number of Pending Invoices: **${pendingPayments.length}**

${pendingPayments.length > 0 ? `**Pending Orders:**\n${pendingPayments.slice(0, 5).map((p: Purchase, i: number) => 
  `${i + 1}. **${p.purchaseOrderNumber}** - $${(p.totalAmount || 0).toLocaleString()} (${p.vendorName || 'Unknown'})`
).join('\n')}` : '✅ No pending payments!'}

${pendingPayments.length > 5 ? `\n_...and ${pendingPayments.length - 5} more_` : ''}`;
            suggestions = ['Show overdue payments', 'Show accounts payable summary', 'Show total products'];
            break;

          case 'payable':
          default:
            content = `💰 **Accounts Payable Summary:**

**Outstanding Balances:**
• Total Payable: **$${totalPayable.toLocaleString()}**
• Pending: **$${totalPending.toLocaleString()}** (${pendingPayments.length} invoices)
• Overdue: **$${totalOverdue.toLocaleString()}** (${overduePayments.length} invoices) ${overduePayments.length > 0 ? '⚠️' : ''}
• Partial Payments: **$${totalPartial.toLocaleString()}** (${partialPayments.length} invoices)

**Payment Statistics:**
• Total Paid This Period: **$${totalPaid.toLocaleString()}**
• Paid Invoices: **${paidOrders.length}**
• Avg Payment Delay: **${avgPaymentDelay.toFixed(1)} days**

${totalOverdue > 0 ? `\n🔴 **Action Required:** ${overduePayments.length} overdue invoice(s) totaling $${totalOverdue.toLocaleString()}` : '✅ All payments are on track!'}`;
            suggestions = ['Show overdue payments', 'Show pending payments', 'Show total suppliers'];
            break;
        }

        return { content, data: purchases, suggestions };
      })
    );
  }

  // Get help response
  private getHelpResponse(): { content: string; suggestions: string[] } {
    return {
      content: `👋 **Hi! I'm your ERP Assistant.**

I can help you with:

**📊 Suppliers/Vendors:**
• "Show me top 5 vendors"
• "How many suppliers do I have?"
• "Show total suppliers"
• "Show inactive vendors"

**📦 Purchase Orders:**
• "What are my pending orders?"
• "Show overdue orders"
• "Show recent orders"

**📦 Products:**
• "Show total products"
• "Show product status"
• "Show accepted products"
• "Show received products"

**💰 Accounts Payable:**
• "Show accounts payable"
• "What are overdue payments?"
• "Show pending payments"

**📈 Inventory:**
• "Which items are low on stock?"
• "Show inventory summary"

**🛡️ Risk Analysis:**
• "Show high risk vendors"
• "Give me a risk summary"

**📋 General:**
• "Give me a summary"
• "Show dashboard overview"

Just type your question in plain English!`,
      suggestions: [
        'Show total suppliers',
        'Show total products',
        'Show accounts payable',
        'Show product status'
      ]
    };
  }

  // Helper: Extract number from query
  private extractNumber(query: string): number | null {
    const match = query.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  }

  // Helper: Extract search terms
  private extractSearchTerms(query: string): string | null {
    const patterns = [
      /search for (.+)/i,
      /find (.+)/i,
      /look for (.+)/i,
      /show me (.+) vendor/i
    ];
    
    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  }

  // Helper: Generate unique ID
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get conversation history
  getConversationHistory(): ChatMessage[] {
    return this.conversationHistory;
  }

  // Add message to history
  addToHistory(message: ChatMessage): void {
    this.conversationHistory.push(message);
    // Keep last 50 messages
    if (this.conversationHistory.length > 50) {
      this.conversationHistory = this.conversationHistory.slice(-50);
    }
  }

  // Clear history
  clearHistory(): void {
    this.conversationHistory = [];
  }
}
