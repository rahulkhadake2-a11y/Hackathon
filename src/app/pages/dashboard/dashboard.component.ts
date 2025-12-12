import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  // Dashboard data
  grossProfitMargin = 75;
  netProfitMargin = 68;

  accountBalance = 780560.0;
  accountNumber = '5637';
  accountHolder = 'Alicia Christensen';
  accountType = 'Savings';

  quickRatio = '0.9:8';
  quickRatioGoal = '1.0 or higher';
  quickRatioProgress = 90;

  currentRatio = '2.8';
  currentRatioGoal = '2.0 or higher';
  currentRatioProgress = 100;

  totalIncome = 83320.5;
  incomeChange = 18.2;
  incomeChangePositive = true;

  totalExpenses = 32370.0;
  expenseChange = 0.7;
  expenseChangePositive = true;

  accountsReceivable = 9112.0;
  receivableChange = 0.7;
  receivableChangePositive = true;

  accountsPayable = 8216.0;
  payableChange = 0.7;
  payableChangePositive = true;

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  }
}
