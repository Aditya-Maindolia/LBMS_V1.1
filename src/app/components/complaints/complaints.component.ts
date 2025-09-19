import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { ComplaintService } from '../../services/complaint.service';
import { AuthService } from '../../services/auth.service';
import { 
  Complaint, 
  ComplaintFormData, 
  ComplaintCategory, 
  ContactPreference,
  ComplaintStatus,
  ComplaintAction
} from '../../models/complaint.model';
import { AuthUser } from '../../models/auth.model';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-complaints',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NavbarComponent],
  templateUrl: './complaints.component.html',
  styleUrls: ['./complaints.component.css']
})
export class ComplaintsComponent implements OnInit, OnDestroy {
  // Forms
  complaintForm!: FormGroup;
  
  // Data
  complaints: Complaint[] = [];
  selectedComplaint: Complaint | null = null;
  currentUser: AuthUser | null = null;
  complaintStats: {[key in ComplaintStatus]: number} = {
    'Open': 0,
    'In Progress': 0,
    'Resolved': 0,
    'Closed': 0
  };

  // UI States
  showRegistrationForm = false;
  showComplaintDetails = false;
  isSubmitting = false;
  isLoading = false;
  isUpdating = false;
  editingComplaintId: string | null = null;

  // Messages
  successMessage = '';
  errorMessage = '';

  // Configuration
  complaintCategories: ComplaintCategory[] = [
    'Library Service',
    'Borrowing Process', 
    'Payment Issues',
    'Book Condition',
    'Staff Behavior',
    'System Technical',
    'Facility Issues',
    'Other'
  ];

  contactPreferences: ContactPreference[] = ['Email', 'Phone'];

  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private complaintService: ComplaintService,
    private authService: AuthService,
    public router: Router
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadComplaints();
    this.loadComplaintStats();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initializeForm(): void {
    this.complaintForm = this.fb.group({
      category: ['', [Validators.required]],
      title: ['', [
        Validators.required, 
        Validators.minLength(10), 
        Validators.maxLength(100)
      ]],
      description: ['', [
        Validators.required, 
        Validators.minLength(20), 
        Validators.maxLength(500)
      ]],
      contactPreference: ['', [Validators.required]]
    });
  }

  private loadCurrentUser(): void {
    this.subscriptions.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
        if (!user) {
          this.router.navigate(['/login']);
        }
      })
    );
  }

  private loadComplaints(): void {
    this.isLoading = true;
    this.subscriptions.add(
      this.complaintService.getUserComplaints().subscribe({
        next: (response) => {
          this.complaints = response.complaints;
          this.isLoading = false;
        },
        error: () => {
          this.showError('Unable to fetch complaint status. Please try again later.');
          this.isLoading = false;
        }
      })
    );
  }

  private loadComplaintStats(): void {
    this.subscriptions.add(
      this.complaintService.getComplaintStats().subscribe(stats => {
        this.complaintStats = stats;
      })
    );
  }

  // ✅ Form Actions
  onShowRegistrationForm(): void {
    this.showRegistrationForm = true;
    this.editingComplaintId = null;
    this.resetForm();
  }

  onEditComplaint(complaint: Complaint): void {
    if (complaint.status !== 'Open') {
      this.showError('Only open complaints can be edited.');
      return;
    }

    this.editingComplaintId = complaint.id;
    this.showRegistrationForm = true;
    
    // Populate form with existing data
    this.complaintForm.patchValue({
      category: complaint.category,
      title: complaint.title,
      description: complaint.description,
      contactPreference: complaint.contactPreference
    });
  }

  onSubmitComplaint(): void {
    if (this.complaintForm.invalid) {
      this.markFormGroupTouched();
      this.showError('Please fill in all required fields.');
      return;
    }

    this.isSubmitting = true;
    this.clearMessages();

    const formData: ComplaintFormData = this.complaintForm.value;

    if (this.editingComplaintId) {
      // Update existing complaint
      this.subscriptions.add(
        this.complaintService.updateComplaint(this.editingComplaintId, formData).subscribe({
          next: (response) => {
            if (response.success) {
              this.showSuccess(response.message);
              this.resetForm();
              this.showRegistrationForm = false;
              this.editingComplaintId = null;
              this.loadComplaints();
            } else {
              this.showError(response.message);
            }
            this.isSubmitting = false;
          },
          error: () => {
            this.showError('Failed to update complaint. Please try again.');
            this.isSubmitting = false;
          }
        })
      );
    } else {
      // Submit new complaint
      this.subscriptions.add(
        this.complaintService.submitComplaint(formData).subscribe({
          next: (response) => {
            if (response.success) {
              this.showSuccess(response.message);
              this.resetForm();
              this.showRegistrationForm = false;
              this.loadComplaints();
              this.loadComplaintStats();
              
              // Simulate admin response for demo
              if (response.complaintId) {
                this.complaintService.simulateAdminResponse(response.complaintId);
              }
            } else {
              this.showError(response.message);
            }
            this.isSubmitting = false;
          },
          error: () => {
            this.showError('Failed to submit complaint. Please try again.');
            this.isSubmitting = false;
          }
        })
      );
    }
  }

  onResetForm(): void {
    this.resetForm();
    this.showRegistrationForm = false;
    this.editingComplaintId = null;
  }

  onCancelForm(): void {
    this.showRegistrationForm = false;
    this.editingComplaintId = null;
    this.resetForm();
  }

  // ✅ Complaint Actions
  onViewComplaint(complaint: Complaint): void {
    this.selectedComplaint = complaint;
    this.showComplaintDetails = true;
  }

  onCloseComplaintDetails(): void {
    this.showComplaintDetails = false;
    this.selectedComplaint = null;
  }

  onConfirmResolution(complaintId: string): void {
    const action: ComplaintAction = {
      action: 'confirm_resolution',
      complaintId: complaintId
    };

    this.isUpdating = true;
    this.subscriptions.add(
      this.complaintService.handleComplaintAction(action).subscribe({
        next: (response) => {
          if (response.success) {
            this.showSuccess(response.message);
            this.loadComplaints();
            this.loadComplaintStats();
            this.onCloseComplaintDetails();
          } else {
            this.showError(response.message);
          }
          this.isUpdating = false;
        },
        error: () => {
          this.showError('Unable to process the request. Please try again later.');
          this.isUpdating = false;
        }
      })
    );
  }

  onReopenComplaint(complaintId: string): void {
    const reopenReason = prompt('Please provide a reason for reopening this complaint:');
    if (!reopenReason) return;

    const action: ComplaintAction = {
      action: 'reopen',
      complaintId: complaintId,
      notes: reopenReason
    };

    this.isUpdating = true;
    this.subscriptions.add(
      this.complaintService.handleComplaintAction(action).subscribe({
        next: (response) => {
          if (response.success) {
            this.showSuccess(response.message);
            this.loadComplaints();
            this.loadComplaintStats();
            this.onCloseComplaintDetails();
          } else {
            this.showError(response.message);
          }
          this.isUpdating = false;
        },
        error: () => {
          this.showError('Unable to process the request. Please try again later.');
          this.isUpdating = false;
        }
      })
    );
  }

  // ✅ Helper Methods
  private resetForm(): void {
    this.complaintForm.reset();
    this.clearMessages();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.complaintForm.controls).forEach(key => {
      const control = this.complaintForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.complaintForm.get(fieldName);
    if (field && field.errors && field.touched) {
      const errors = field.errors;
      
      if (errors['required']) {
        return `${this.getFieldDisplayName(fieldName)} is required.`;
      }
      
      if (errors['minlength']) {
        const requiredLength = errors['minlength'].requiredLength;
        if (fieldName === 'title' || fieldName === 'description') {
          return 'Please provide more details to help us resolve your issue.';
        }
        return `${this.getFieldDisplayName(fieldName)} must be at least ${requiredLength} characters.`;
      }
      
      if (errors['maxlength']) {
        const maxLength = errors['maxlength'].requiredLength;
        return `${this.getFieldDisplayName(fieldName)} cannot exceed ${maxLength} characters.`;
      }
    }
    
    return '';
  }

  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      category: 'Complaint Category',
      title: 'Complaint Title',
      description: 'Complaint Description',
      contactPreference: 'Contact Preference'
    };
    return displayNames[fieldName] || fieldName;
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

  // ✅ UI Helper Methods
  getStatusClass(status: ComplaintStatus): string {
    switch (status) {
      case 'Open': return 'status-open';
      case 'In Progress': return 'status-in-progress';
      case 'Resolved': return 'status-resolved';
      case 'Closed': return 'status-closed';
      default: return '';
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'Critical': return 'priority-critical';
      case 'High': return 'priority-high';
      case 'Medium': return 'priority-medium';
      case 'Low': return 'priority-low';
      default: return '';
    }
  }

  isFormValid(): boolean {
    return this.complaintForm.valid;
  }

  canEditComplaint(complaint: Complaint): boolean {
    return complaint.status === 'Open';
  }

  canConfirmResolution(complaint: Complaint): boolean {
    return complaint.status === 'Resolved';
  }

  canReopenComplaint(complaint: Complaint): boolean {
    return complaint.status === 'Resolved';
  }

  trackByComplaintId(index: number, complaint: Complaint): string {
    return complaint.id;
  }
}
