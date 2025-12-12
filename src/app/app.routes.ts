import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { VenderListComponent } from './pages/vender-list/vender-list.component';
import { VendorProfileComponent } from './pages/vendor-profile/vendor-profile.component';
import { RiskAnalysisComponent } from './pages/risk-analysis/risk-analysis.component';
import { InsightsComponent } from './pages/insights/insights.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  { path: 'dashboard', component: DashboardComponent },

  { path: 'vendors', component: VenderListComponent },

  { path: 'vendor/:id', component: VendorProfileComponent },

  { path: 'risk-analysis', component: RiskAnalysisComponent },

  { path: 'insights', component: InsightsComponent },

  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: '**', redirectTo: 'login' },
];
