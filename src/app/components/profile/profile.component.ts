import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { StorageService } from '../../services/storage.service';
import { AuthUser } from '../../models/auth.model';
import { UserProfile } from '../../models/user.model';
import { PasswordChangeRequest } from '../../models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {
  profileForm!: FormGroup;
  currentUser: AuthUser | null = null;
  userProfile: UserProfile | null = null;

  passwordForm!: FormGroup;
  isChangingPassword = false;
  passwordChangeSuccess = '';
  passwordChangeError = '';

  isLoading = false;
  isEditing = false;
  isSaving = false;

  errorMessage = '';
  successMessage = '';

  countryCodes = [
    { code: 'IN', name: 'India', dialCode: '+91' },
    { code: 'US', name: 'United States', dialCode: '+1' },
    { code: 'GB', name: 'United Kingdom', dialCode: '+44' },
    { code: 'CA', name: 'Canada', dialCode: '+1' },
  ];

  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
    private storageService: StorageService,
    public router: Router
  ) {
    this.initializeForm();
    this.initializePasswordForm();
  }

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initializeForm(): void {
    this.profileForm = this.fb.group({
      memberName: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
        Validators.pattern(/^[a-zA-Z\s]+$/)
      ]],
      email: ['', [
        Validators.required,
        Validators.email
      ]],
      countryCode: ['+91', [Validators.required]],
      mobileNumber: ['', [
        Validators.required,
        Validators.pattern(/^\d{10}$/)
      ]],
      address: ['', [
        Validators.maxLength(100)
      ]]
    });
  }

  private loadCurrentUser(): void {
    this.subscriptions.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
        if (user) {
          this.loadUserProfile(user.memberId);
        }
      })
    );
  }

  private loadUserProfile(memberId: string): void {
    this.isLoading = true;
    const registeredUsers = JSON.parse(this.storageService.getItem('registered_users') || '[]');
    const userProfile = registeredUsers.find((u: any) => u.id === memberId);

    if (userProfile) {
      this.userProfile = {
        id: userProfile.id,
        memberName: userProfile.memberName,
        email: userProfile.email,
        countryCode: userProfile.countryCode,
        mobileNumber: userProfile.mobileNumber,
        address: userProfile.address,
        dateOfBirth: userProfile.dateOfBirth,
        createdAt: userProfile.createdAt
      };

      this.profileForm.patchValue({
        memberName: this.userProfile.memberName,
        email: this.userProfile.email,
        countryCode: this.userProfile.countryCode,
        mobileNumber: this.userProfile.mobileNumber,
        address: this.userProfile.address
      });
    } else {
      this.errorMessage = 'User profile not found.';
    }
    this.isLoading = false;
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    this.clearMessages();
    
    if (!this.isEditing) {
      this.profileForm.patchValue({
        memberName: this.userProfile?.memberName,
        email: this.userProfile?.email,
        countryCode: this.userProfile?.countryCode,
        mobileNumber: this.userProfile?.mobileNumber,
        address: this.userProfile?.address
      });
    }
  }

  onSaveChanges(): void {
    if (this.profileForm.invalid) {
      this.showError('Please fill in all required fields correctly.');
      this.markFormGroupTouched();
      return;
    }

    if (!this.userProfile) {
      this.showError('User profile not found.');
      return;
    }

    this.isSaving = true;
    this.clearMessages();

    try {
      const updatedProfile = {
        ...this.userProfile,
        memberName: this.profileForm.value.memberName.trim(),
        email: this.profileForm.value.email.trim().toLowerCase(),
        countryCode: this.profileForm.value.countryCode,
        mobileNumber: this.profileForm.value.mobileNumber.trim(),
        address: this.profileForm.value.address?.trim() || '',
        updatedAt: new Date().toISOString()
      };

      const registeredUsers = JSON.parse(this.storageService.getItem('registered_users') || '[]');
      const userIndex = registeredUsers.findIndex((u: any) => u.id === this.userProfile?.id);
      
      if (userIndex !== -1) {
        registeredUsers[userIndex] = {
          ...registeredUsers[userIndex],
          memberName: updatedProfile.memberName,
          email: updatedProfile.email,
          countryCode: updatedProfile.countryCode,
          mobileNumber: updatedProfile.mobileNumber,
          address: updatedProfile.address,
          updatedAt: updatedProfile.updatedAt
        };
        this.storageService.setItem('registered_users', JSON.stringify(registeredUsers));

        this.authService.updateUserProfile({
          memberName: updatedProfile.memberName,
          email: updatedProfile.email
        });

        this.userProfile = updatedProfile;
        this.isEditing = false;
        this.showSuccess('Your profile has been updated successfully.');
      } else {
        this.showError('Failed to update profile. User not found.');
      }
    } catch {
      this.showError('Failed to update profile. Please try again.');
    }
    
    this.isSaving = false;
  }

  getFieldError(fieldName: string): string {
    const field = this.profileForm.get(fieldName);
    if (field && field.errors && field.touched) {
      const errors = field.errors;
      
      if (errors['required']) {
        return `${this.getFieldDisplayName(fieldName)} is required.`;
      }
      if (errors['email']) {
        return 'Please enter a valid email address.';
      }
      if (errors['minlength']) {
        return `${this.getFieldDisplayName(fieldName)} must be at least ${errors['minlength'].requiredLength} characters.`;
      }
      if (errors['maxlength']) {
        return `${this.getFieldDisplayName(fieldName)} cannot exceed ${errors['maxlength'].requiredLength} characters.`;
      }
      if (errors['pattern']) {
        if (fieldName === 'memberName') {
          return 'Name should contain only letters and spaces.';
        }
        if (fieldName === 'mobileNumber') {
          return 'Please enter a valid 10-digit mobile number.';
        }
      }
    }
    return '';
  }

  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      memberName: 'Full Name',
      email: 'Email',
      mobileNumber: 'Mobile Number',
      address: 'Address'
    };
    return displayNames[fieldName] || fieldName;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.profileForm.controls).forEach(key => {
      const control = this.profileForm.get(key);
      control?.markAsTouched();
    });
  }

  private showError(message: string): void {
    this.errorMessage = message;
    this.successMessage = '';
    setTimeout(() => this.clearMessages(), 5000);
  }

  private showSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = '';
    setTimeout(() => this.clearMessages(), 8000);
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  getCountryName(dialCode: string): string {
    const country = this.countryCodes.find(c => c.dialCode === dialCode);
    return country ? country.name : dialCode;
  }

  getMemberSince(): string {
    if (this.userProfile?.createdAt) {
      const date = new Date(this.userProfile.createdAt);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
    }
    return 'Unknown';
  }

  navigateToMyBooks(): void {
    this.router.navigate(['/borrwed-returned']);
  }

  navigateToBorrowBooks(): void {
    this.router.navigate(['/borrow']);
  }

  logout(): void {
    this.authService.logout();
  }

  private initializePasswordForm(): void {
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/)
      ]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(group: FormGroup): { [key: string]: any } | null {
    const newPassword = group.get('newPassword');
    const confirmPassword = group.get('confirmPassword');
    
    if (!newPassword || !confirmPassword) {
      return null;
    }
    
    return newPassword.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  onChangePassword(): void {
    if (this.passwordForm.invalid) {
      this.showPasswordError('Please fill in all password fields correctly.');
      this.markPasswordFormTouched();
      return;
    }
    
    if (!this.currentUser) {
      this.showPasswordError('User not found.');
      return;
    }
    
    this.isChangingPassword = true;
    this.clearPasswordMessages();
    
    const passwordData: PasswordChangeRequest = {
      currentPassword: this.passwordForm.value.currentPassword,
      newPassword: this.passwordForm.value.newPassword,
      confirmPassword: this.passwordForm.value.confirmPassword
    };
    
    this.userService.changePassword(this.currentUser.memberId, passwordData).subscribe({
      next: (response) => {
        if (response.success) {
          this.showPasswordSuccess(response.message);
          this.passwordForm.reset();
        } else {
          this.showPasswordError(response.message);
        }
        this.isChangingPassword = false;
      },
      error: () => {
        this.showPasswordError('Failed to change password. Please try again.');
        this.isChangingPassword = false;
      }
    });
  }

  getPasswordFieldError(fieldName: string): string {
    const field = this.passwordForm.get(fieldName);
    if (field && field.errors && field.touched) {
      const errors = field.errors;
      
      if (errors['required']) {
        return `${this.getPasswordFieldDisplayName(fieldName)} is required.`;
      }
      
      if (errors['minlength']) {
        return `${this.getPasswordFieldDisplayName(fieldName)} must be at least ${errors['minlength'].requiredLength} characters.`;
      }
      
      if (errors['pattern']) {
        return 'New password must contain at least one uppercase letter, one lowercase letter, and one number.';
      }
    }
    
    if (fieldName === 'confirmPassword' && this.passwordForm.errors?.['passwordMismatch']) {
      return 'Passwords do not match.';
    }
    
    return '';
  }

  private getPasswordFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm Password'
    };
    return displayNames[fieldName] || fieldName;
  }

  private markPasswordFormTouched(): void {
    Object.keys(this.passwordForm.controls).forEach(key => {
      const control = this.passwordForm.get(key);
      control?.markAsTouched();
    });
  }

  private showPasswordError(message: string): void {
    this.passwordChangeError = message;
    this.passwordChangeSuccess = '';
    setTimeout(() => this.clearPasswordMessages(), 5000);
  }

  private showPasswordSuccess(message: string): void {
    this.passwordChangeSuccess = message;
    this.passwordChangeError = '';
    setTimeout(() => this.clearPasswordMessages(), 8000);
  }

  private clearPasswordMessages(): void {
    this.passwordChangeError = '';
    this.passwordChangeSuccess = '';
  }
}
