import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { VenderListComponent } from './pages/vender-list/vender-list.component';
import { VendorProfileComponent } from './pages/vendor-profile/vendor-profile.component';
import { RiskAnalysisComponent } from './pages/risk-analysis/risk-analysis.component';
import { InsightsComponent } from './pages/insights/insights.component';
import { LayoutComponent } from './shared/components/layout/layout.component';
import { UploadComponent } from './pages/upload/upload.component';
import { InsightsComponent } from './pages/insights/insights.component';
import { PurchaseComponent } from './pages/purchase/purchase.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'vendors', component: VenderListComponent },
      { path: 'vendor/:id', component: VendorProfileComponent },
      { path: 'upload', component: UploadComponent },
      { path: 'insights', component: InsightsComponent },
      { path: 'purchase', component: PurchaseComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  { path: '**', redirectTo: 'login' },
];
