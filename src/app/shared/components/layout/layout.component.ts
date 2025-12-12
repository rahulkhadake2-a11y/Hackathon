import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Router,
  NavigationEnd,
  NavigationStart,
  NavigationCancel,
  NavigationError,
  RouterModule,
} from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-layout',
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css',
})
export class LayoutComponent implements OnInit {
  // Loading state - start with true to show loader on page refresh
  isLoading = true;
  // Main menu items (shown on dashboard/home)
  mainMenuItems = [
    {
      icon: 'bi-house-door',
      label: 'Dashboard',
      route: '/dashboard',
      active: true,
    },
    { icon: 'bi-upload', label: 'Upload', route: '/upload', active: false },
    { icon: 'bi-people', label: 'Vendors', route: '/vendors', active: false },
    { icon: 'bi-cart', label: 'Purchase', route: '/purchase', active: false },
    {
      icon: 'bi-lightbulb',
      label: 'Insights',
      route: '/insights',
      active: false,
    },
    {
      icon: 'bi-bar-chart',
      label: 'Analytics',
      route: '/analytics',
      active: false,
    },
    { icon: 'bi-gear', label: 'Settings', route: '/settings', active: false },
  ];

  // Vendor section menu items (shown when in vendor pages)
  vendorMenuItems = [
    {
      icon: 'bi-house-door',
      label: 'Dashboard',
      route: '/dashboard',
      active: false,
    },
    { icon: 'bi-people', label: 'Vendor', route: '/vendors', active: true },
    {
      icon: 'bi-lightbulb',
      label: 'Vendor Insights',
      route: '/insights',
      active: false,
    },
  ];

  // Current menu items to display
  menuItems: any[] = [];

  // Track if we're in vendor section
  isVendorSection = false;

  sidebarCollapsed = false;

  constructor(private router: Router) {
    this.menuItems = [...this.mainMenuItems];

    // Listen to route changes for menu updates
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.updateMenuBasedOnRoute(event.urlAfterRedirects || event.url);
      });

    // Listen to navigation events for loading indicator
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.isLoading = true;
      }
      if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        // Add a small delay for smoother UX
        setTimeout(() => {
          this.isLoading = false;
        }, 300);
      }
    });
  }

  updateMenuBasedOnRoute(url: string) {
    // Check if we're in vendor section (vendors, vendor/:id, or insights)
    const isVendor =
      url.includes('/vendors') ||
      url.includes('/vendor/') ||
      url.includes('/insights');

    if (isVendor) {
      this.isVendorSection = true;
      this.menuItems = this.vendorMenuItems.map((item) => ({
        ...item,
        active: url.includes(item.route),
      }));
    } else {
      this.isVendorSection = false;
      this.menuItems = this.mainMenuItems.map((item) => ({
        ...item,
        active: url.includes(item.route),
      }));
    }
  }

  ngOnInit() {
    // Hide loader after initial page load
    setTimeout(() => {
      this.isLoading = false;
    }, 500);
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  selectMenuItem(item: any) {
    this.menuItems.forEach((m) => (m.active = false));
    item.active = true;
  }

  showUserMenu = false;

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  logout() {
    // Clear any stored user data/tokens here if needed
    this.showUserMenu = false;
    this.router.navigate(['/login']);
  }
}
