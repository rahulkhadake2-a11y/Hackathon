import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { VenderListComponent } from './pages/vender-list/vender-list.component';
import { VendorProfileComponent } from './pages/vendor-profile/vendor-profile.component';
import { AddVendorComponent } from './pages/add-vendor/add-vendor.component';
import { RiskAnalysisComponent } from './pages/risk-analysis/risk-analysis.component';
import { InsightsComponent } from './pages/insights/insights.component';
import { LayoutComponent } from './shared/components/layout/layout.component';
import { UploadComponent } from './pages/upload/upload.component';

import { PurchaseComponent } from './pages/purchase/purchase.component';
import { AddPurchaseComponent } from './pages/add-purchase/add-purchase.component';
import { AIRiskAnalysisService } from './core/services/ai-risk-analysis/ai-risk-analysis.service';
import { MasterDataComponent } from './shared/components/master-data/master-data.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'vendors', component: VenderListComponent },
      { path: 'vendor/new', component: AddVendorComponent },
      { path: 'vendor/:id', component: VendorProfileComponent },
      { path: 'vendor/:id/edit', component: AddVendorComponent },
      { path: 'upload', component: UploadComponent },
      { path: 'insights', component: InsightsComponent },
      { path: 'purchase', component: PurchaseComponent },
      { path: 'purchase/new', component: AddPurchaseComponent },
      { path: 'purchase/:id', component: AddPurchaseComponent },
      { path: 'purchase/:id/edit', component: AddPurchaseComponent },
      { path: 'aianalysis', component: RiskAnalysisComponent },
      { path: 'master-data', component: MasterDataComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  { path: '**', redirectTo: 'login' },
];
