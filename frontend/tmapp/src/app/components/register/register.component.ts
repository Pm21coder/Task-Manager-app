import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.minLength(4)],
    confirmPassword: ['', Validators.required]
  }, { validator: this.passwordMatchValidator });

  errorMessage = '';

  passwordMatchValidator(group: any) {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { mismatch: true };
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;
    const { username, password } = this.registerForm.value;
    this.authService.register(username!, password!).subscribe({
      next: () => {
        // auto-login after registration
        this.authService.login(username!, password!).subscribe(() => {
          this.router.navigate(['/tasks']);
        });
      },
      error: err => this.errorMessage = err.error?.message || 'Registration failed'
    });
  }
}