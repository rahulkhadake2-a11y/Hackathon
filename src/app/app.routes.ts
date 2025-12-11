import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { VenderListComponent } from './pages/vender-list/vender-list.component';
import { VendorProfileComponent } from './pages/vendor-profile/vendor-profile.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  { path: 'dashboard', component: DashboardComponent },

  { path: 'vendors', component: VenderListComponent },

  { path: 'vendor/:id', component: VendorProfileComponent },

  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: '**', redirectTo: 'login' },
];
