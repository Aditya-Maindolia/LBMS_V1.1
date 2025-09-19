import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { StorageService } from '../../services/storage.service';
import { AuthUser } from '../../models/auth.model';
import { NavbarComponent } from "../navbar/navbar.component";

export interface Donation {
  id: string;
  memberId: string;
  memberName: string;
  title: string;
  author: string;
  condition: 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor';
  quantity: number;
  photo?: string | ArrayBuffer | null;
  photoName?: string;
  submissionDate: Date;
  status: 'Pending' | 'Accepted' | 'Rejected';
  adminNotes?: string;
  statusUpdatedDate?: Date;
}

@Component({
  selector: 'app-donate-books',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule, NavbarComponent],
  templateUrl: './donate-books.component.html',
  styleUrls: ['./donate-books.component.css']
})
export class DonateBooksComponent implements OnInit, OnDestroy {
  donationForm!: FormGroup;
  currentUser: AuthUser | null = null;
  donations: Donation[] = [];
  filteredDonations: Donation[] = [];
  
  // States
  isSubmitting = false;
  isLoading = false;
  showConfirmation = false;
  
  // Messages
  successMessage = '';
  errorMessage = '';
  
  // Filter
  statusFilter = 'all';
  
  // Statistics
  totalDonations = 0;
  pendingDonations = 0;
  acceptedDonations = 0;
  rejectedDonations = 0;

  private subscriptions = new Subscription();

  // Condition options
  conditionOptions = [
    { value: 'New', label: 'New', description: 'Brand new, never used' },
    { value: 'Like New', label: 'Like New', description: 'Excellent condition, minimal wear' },
    { value: 'Good', label: 'Good', description: 'Good condition, some wear' },
    { value: 'Fair', label: 'Fair', description: 'Readable condition, noticeable wear' },
    { value: 'Poor', label: 'Poor', description: 'Heavily worn but still usable' }
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private storageService: StorageService,
    private router: Router
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initializeForm(): void {
    this.donationForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      author: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      condition: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1), Validators.max(50)]],
      photo: [''],
      notes: ['', Validators.maxLength(500)]
    });
  }

  private loadCurrentUser(): void {
    this.subscriptions.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
        if (user) {
          this.loadUserDonations(user.memberId);
        } else {
          this.router.navigate(['/login']);
        }
      })
    );
  }

  private loadUserDonations(memberId: string): void {
    this.isLoading = true;
    
    try {
      const allDonations = this.storageService.getItem('donations');
      const parsedDonations = allDonations ? JSON.parse(allDonations) : [];
      
      // Filter donations for current user
      this.donations = parsedDonations
        .filter((donation: any) => donation.memberId === memberId)
        .map((donation: any) => ({
          ...donation,
          submissionDate: new Date(donation.submissionDate),
          statusUpdatedDate: donation.statusUpdatedDate ? new Date(donation.statusUpdatedDate) : undefined
        }));
      
      // If no donations exist, create some mock data for demonstration
      if (this.donations.length === 0 && this.shouldCreateMockData()) {
        this.createMockDonations(memberId);
      }
      
      this.filteredDonations = [...this.donations];
      this.calculateStatistics();
      this.sortDonationsByDate();
      
      console.log('✅ User donations loaded:', this.donations);
    } catch (error) {
      console.error('Error loading donations:', error);
      this.donations = [];
      this.filteredDonations = [];
    }
    
    this.isLoading = false;
  }

  private shouldCreateMockData(): boolean {
    // Only create mock data if no donations exist at all (for demonstration)
    const allDonations = this.storageService.getItem('donations');
    return !allDonations;
  }

  private createMockDonations(memberId: string): void {
    const mockDonations: Donation[] = [
      {
        id: 'DON001',
        memberId: memberId,
        memberName: this.currentUser?.memberName || 'Unknown User',
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        condition: 'Good',
        quantity: 1,
        submissionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        status: 'Accepted',
        adminNotes: 'Great addition to our classic literature collection!',
        statusUpdatedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'DON002',
        memberId: memberId,
        memberName: this.currentUser?.memberName || 'Unknown User',
        title: 'Angular Complete Guide',
        author: 'Maximilian Schwarzmüller',
        condition: 'Like New',
        quantity: 2,
        submissionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        status: 'Pending',
        adminNotes: undefined
      },
      {
        id: 'DON003',
        memberId: memberId,
        memberName: this.currentUser?.memberName || 'Unknown User',
        title: 'Old Programming Manual',
        author: 'Various Authors',
        condition: 'Poor',
        quantity: 1,
        submissionDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        status: 'Rejected',
        adminNotes: 'Book is too outdated and in poor condition for library collection.',
        statusUpdatedDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
      }
    ];

    // Save mock donations
    const allDonations = JSON.stringify(mockDonations);
    this.storageService.setItem('donations', allDonations);
    this.donations = mockDonations;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        this.showError('Please select a valid image file (JPEG, PNG, or GIF)');
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        this.showError('Image file size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        this.donationForm.patchValue({
          photo: reader.result
        });
      };
      reader.onerror = () => {
        this.showError('Error reading file. Please try again.');
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto(): void {
    this.donationForm.patchValue({ photo: '' });
    
    // Reset file input
    const fileInput = document.getElementById('photoInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  onSubmitDonation(): void {
    if (this.donationForm.invalid) {
      this.markFormGroupTouched();
      this.showError('Please fill in all required fields correctly.');
      return;
    }

    if (!this.currentUser) {
      this.showError('User session not found. Please log in again.');
      return;
    }

    this.showConfirmation = true;
  }

  confirmSubmission(): void {
    this.isSubmitting = true;
    this.clearMessages();

    try {
      const formValue = this.donationForm.value;
      
      const newDonation: Donation = {
        id: 'DON' + Date.now(),
        memberId: this.currentUser!.memberId,
        memberName: this.currentUser!.memberName,
        title: formValue.title.trim(),
        author: formValue.author.trim(),
        condition: formValue.condition,
        quantity: formValue.quantity,
        photo: formValue.photo || null,
        submissionDate: new Date(),
        status: 'Pending'
      };

      // Save to storage
      this.saveDonation(newDonation);
      
      // Update local state
      this.donations.unshift(newDonation);
      this.applyStatusFilter();
      this.calculateStatistics();
      
      // Reset form
      this.donationForm.reset();
      this.donationForm.patchValue({ quantity: 1 });
      this.showConfirmation = false;
      
      this.showSuccess(
        `✅ Donation submitted successfully! Your donation of "${newDonation.title}" is now pending review. You'll be notified when the status changes.`
      );
      
      console.log('✅ Donation submitted:', newDonation);
    } catch (error) {
      this.showError('Failed to submit donation. Please try again.');
      console.error('Donation submission error:', error);
    }
    
    this.isSubmitting = false;
  }

  cancelSubmission(): void {
    this.showConfirmation = false;
  }

  private saveDonation(donation: Donation): void {
    try {
      const existingDonations = this.storageService.getItem('donations');
      const allDonations = existingDonations ? JSON.parse(existingDonations) : [];
      
      allDonations.unshift(donation);
      
      this.storageService.setItem('donations', JSON.stringify(allDonations));
    } catch (error) {
      console.error('Error saving donation:', error);
      throw error;
    }
  }

  onStatusFilterChange(): void {
    this.applyStatusFilter();
  }

  private applyStatusFilter(): void {
    if (this.statusFilter === 'all') {
      this.filteredDonations = [...this.donations];
    } else {
      this.filteredDonations = this.donations.filter(
        donation => donation.status.toLowerCase() === this.statusFilter.toLowerCase()
      );
    }
    this.sortDonationsByDate();
  }

  private sortDonationsByDate(): void {
    this.filteredDonations.sort((a, b) => 
      b.submissionDate.getTime() - a.submissionDate.getTime()
    );
  }

  private calculateStatistics(): void {
    this.totalDonations = this.donations.length;
    this.pendingDonations = this.donations.filter(d => d.status === 'Pending').length;
    this.acceptedDonations = this.donations.filter(d => d.status === 'Accepted').length;
    this.rejectedDonations = this.donations.filter(d => d.status === 'Rejected').length;
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending': return 'status-pending';
      case 'accepted': return 'status-accepted';
      case 'rejected': return 'status-rejected';
      default: return '';
    }
  }

  getFieldError(fieldName: string): string {
    const field = this.donationForm.get(fieldName);
    if (field && field.errors && field.touched) {
      const errors = field.errors;
      
      if (errors['required']) return `${this.getFieldDisplayName(fieldName)} is required.`;
      if (errors['minlength']) return `${this.getFieldDisplayName(fieldName)} must be at least ${errors['minlength'].requiredLength} characters.`;
      if (errors['maxlength']) return `${this.getFieldDisplayName(fieldName)} cannot exceed ${errors['maxlength'].requiredLength} characters.`;
      if (errors['min']) return `${this.getFieldDisplayName(fieldName)} must be at least ${errors['min'].min}.`;
      if (errors['max']) return `${this.getFieldDisplayName(fieldName)} cannot exceed ${errors['max'].max}.`;
    }
    return '';
  }

  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      title: 'Book Title',
      author: 'Author',
      condition: 'Condition',
      quantity: 'Quantity',
      notes: 'Additional Notes'
    };
    return displayNames[fieldName] || fieldName;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.donationForm.controls).forEach(key => {
      const control = this.donationForm.get(key);
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

  hasPhoto(): boolean {
    return !!this.donationForm.get('photo')?.value;
  }

  getPhotoPreview(): string {
    return this.donationForm.get('photo')?.value;
  }

  trackByDonationId(index: number, donation: Donation): string {
    return donation.id;
  }

  navigateToProfile(): void {
    this.router.navigate(['/profile']);
  }

  navigateToMyBooks(): void {
    this.router.navigate(['/my-books']);
  }

  navigateToBorrowBooks(): void {
    this.router.navigate(['/borrow']);
  }
}
