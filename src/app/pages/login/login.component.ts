import { NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [NgIf,FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(private router: Router) {}


  onLogin() {
    this.error = '';
    this.loading = true;

    setTimeout(() => {
      this.loading = false;

      const validEmail = 'admin';
      const validPassword = 'admin';

      if (this.email === validEmail && this.password === validPassword) {
        this.router.navigate(['/dashboard']);
      } else {
        this.error = '❌ Invalid credentials — try admin / admin';
      }
    }, 600);
  }
}
