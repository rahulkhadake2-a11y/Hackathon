import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  error = '';
  loading = false;
  showSplash = true;
  showContent = false;
  isLoggingIn = false;

  constructor(private router: Router) {}

  ngOnInit() {
    // Show splash screen animation
    setTimeout(() => {
      this.showSplash = false;
      setTimeout(() => {
        this.showContent = true;
      }, 300);
    }, 2500);
  }

  onLogin() {
    this.error = '';
    this.loading = true;
    this.isLoggingIn = true;

    setTimeout(() => {
      // Allow any credentials to login
      if (this.email && this.password) {
        // Check if the input is an email or username
        const isEmail = this.email.includes('@');

        if (isEmail) {
          // If email, extract username from email and store both
          const username = this.email.split('@')[0];
          localStorage.setItem('loggedInUser', username);
          localStorage.setItem('loggedInEmail', this.email);
        } else {
          // If username only, store username and create default email
          localStorage.setItem('loggedInUser', this.email);
          localStorage.setItem('loggedInEmail', this.email + '@gmail.com');
        }

        localStorage.setItem('isLoggedIn', 'true');

        // Success animation before redirect
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1000);
      } else {
        this.loading = false;
        this.isLoggingIn = false;
        this.error = 'Please enter email and password';
      }
    }, 1500);
  }
}
