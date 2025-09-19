import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MemberService } from '../../services/member.service';
import { LoginRequest } from '../../models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = ''; // Add success message
  showForgotPassword = false;
  forgotPasswordEmail = '';

  // Forgot password flow properties
  forgotStage: 'email' | 'answer' | 'reset' = 'email';
  forgotForm!: FormGroup;
  forgotErrorMessage = '';
  forgotSuccessMessage = '';
  secretQuestionText = '';
  private tempUser: any = null; // to hold user data during forgot password flow

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private memberService: MemberService,
    private router: Router
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/homepage']);
    }
  }

  private initForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  private initForgotForm() {
    switch (this.forgotStage) {
      case 'email':
        this.forgotForm = this.fb.group({
          email: ['', [Validators.required, Validators.email]]
        });
        break;
      case 'answer':
        this.forgotForm = this.fb.group({
          answer: ['', [Validators.required]]
        });
        break;
      case 'reset':
        this.forgotForm = this.fb.group({
          newPassword: ['', [Validators.required, Validators.minLength(6)]]
        });
        break;
    }
  }

  // Updated onSubmit method
  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.clearMessages();
      
      // Add a small delay to show loading state
      setTimeout(() => {
        this.processLogin();
      }, 500);
    } else {
      this.markFormGroupTouched();
      this.showError('Please fill in all required fields correctly.');
    }
  }

  // Main login processing method
  private processLogin(): void {
    const credentials: LoginRequest = {
      email: this.loginForm.value.email.trim().toLowerCase(),
      password: this.loginForm.value.password
    };

    try {
      // Check if user exists
      const user = this.memberService.findUserByEmail(credentials.email);
      
      if (!user) {
        this.isLoading = false;
        this.showError('No account found with this email address. Please register first.');
        return;
      }

      // Validate credentials
      const isValid = this.memberService.validateCredentials(credentials.email, credentials.password);
      
      if (!isValid) {
        this.isLoading = false;
        this.showError('Invalid password. Please check your credentials and try again.');
        return;
      }

      // Successful login
      this.proceedWithLogin(user);

    } catch (error) {
      this.isLoading = false;
      this.showError('An error occurred during login. Please try again.');
    }
  }

  // Updated proceedWithLogin method
  private proceedWithLogin(user: any): void {
    try {
      const authUser = {
        memberId: user.id,
        memberName: user.memberName,
        email: user.email,
        token: 'demo-token-' + Date.now(),
        loginTime: new Date()
      };

      // Save to localStorage
      localStorage.setItem('currentUser', JSON.stringify(authUser));
      
      // Update AuthService currentUser subject
      this.authService.setCurrentUser(authUser);
      
      // Show success message briefly
      this.showSuccess(`Welcome back, ${user.memberName}! Redirecting to dashboard...`);
      
      // Navigate after short delay
      setTimeout(() => {
        this.isLoading = false;
        this.router.navigate(['/homepage']);
      }, 1500);

    } catch (error) {
      this.isLoading = false;
      this.showError('Failed to complete login process. Please try again.');
    }
  }

  // Helper methods for message handling
  private showError(message: string): void {
    this.errorMessage = message;
    this.successMessage = '';
    
    // Auto-clear error message after 5 seconds
    setTimeout(() => {
      this.errorMessage = '';
    }, 5000);
  }

  private showSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = '';
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  // Debug methods
  clearAllData(): void {
    localStorage.clear();
    this.showError('All data cleared. Please register again.');
  }

  showAllUsers(): void {
    const users = this.memberService.getRegisteredUsers();
    
    if (users.length === 0) {
      this.showError('No users registered. Please register first.');
    } else {
      this.showSuccess(`Found ${users.length} registered user(s). Check console for details.`);
    }
  }

  testLogin(): void {
    const email = this.loginForm.value.email;
    const password = this.loginForm.value.password;
    
    if (!email || !password) {
      this.showError('Please enter both email and password to test.');
      return;
    }
    
    const user = this.memberService.findUserByEmail(email.trim().toLowerCase());
    
    if (user) {
      const isValid = this.memberService.validateCredentials(email.trim().toLowerCase(), password);
      
      if (isValid) {
        this.showSuccess('Credentials are valid! You can now click Login button.');
      } else {
        this.showError('Password does not match. Please check your password.');
      }
    } else {
      this.showError('User not found. Please check email or register first.');
    }
  }

  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldDisplayName(fieldName)} is required.`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address.';
      }
    }
    return '';
  }

  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      email: 'Email',
      password: 'Password',
      answer: 'Answer',
      newPassword: 'New Password'
    };
    return displayNames[fieldName] || fieldName;
  }

  // Forgot Password Flow

  onForgotPassword(): void {
    this.showForgotPassword = true;
    this.forgotStage = 'email';
    this.forgotErrorMessage = '';
    this.forgotSuccessMessage = '';
    this.secretQuestionText = '';
    this.tempUser = null;
    this.initForgotForm();
  }

  submitForgotEmail(): void {
    if (this.forgotForm.valid) {
      const email = this.forgotForm.value.email.trim().toLowerCase();
      const user = this.memberService.findUserByEmail(email);

      if (!user) {
        this.forgotErrorMessage = 'No account found with this email.';
      } else {
        this.tempUser = user;
        this.secretQuestionText = user.secretQuestion || 'No secret question set.';
        this.forgotStage = 'answer';
        this.forgotErrorMessage = '';
        this.initForgotForm();
      }
    } else {
      this.forgotErrorMessage = 'Please enter a valid email.';
    }
  }

  submitForgotAnswer(): void {
    if (this.forgotForm.valid && this.tempUser) {
      const answer = this.forgotForm.value.answer.trim().toLowerCase();
      const correctAnswer = this.tempUser.secretAnswer.trim().toLowerCase();

      if (answer === correctAnswer) {
        this.forgotStage = 'reset';
        this.forgotErrorMessage = '';
        this.forgotSuccessMessage = '';
        this.initForgotForm();
      } else {
        this.forgotErrorMessage = 'Incorrect answer. Please try again.';
      }
    } else {
      this.forgotErrorMessage = 'Please enter the answer.';
    }
  }

  submitResetPassword(): void {
    if (this.forgotForm.valid && this.tempUser) {
      const newPassword = this.forgotForm.value.newPassword;

      try {
        this.memberService.updateUserPassword(this.tempUser.email, newPassword);
        this.forgotSuccessMessage = 'Password successfully reset. You may now log in.';
        this.forgotErrorMessage = '';
        
        // Reset form and close modal after a delay
        setTimeout(() => {
          this.closeForgotPassword();
        }, 3000);
      } catch (error) {
        this.forgotErrorMessage = 'Failed to reset password. Please try again.';
      }
    } else {
      this.forgotErrorMessage = 'Please enter a valid new password.';
    }
  }

  getForgotFieldError(fieldName: string): string {
    const field = this.forgotForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldDisplayName(fieldName)} is required.`;
      }
      if (fieldName === 'email' && field.errors['email']) {
        return 'Please enter a valid email address.';
      }
      if (fieldName === 'newPassword' && field.errors['minlength']) {
        return 'Password must be at least 6 characters long.';
      }
    }
    return '';
  }

  closeForgotPassword(): void {
    this.showForgotPassword = false;
    this.forgotStage = 'email';
    this.forgotForm = this.fb.group({});
    this.forgotErrorMessage = '';
    this.forgotSuccessMessage = '';
    this.secretQuestionText = '';
    this.tempUser = null;
  }

  navigateToRegister(): void {
    this.router.navigate(['/register']);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  get isFormValid(): boolean {
    return this.loginForm.valid;
  }
}
