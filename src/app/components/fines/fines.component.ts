import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { FineService } from '../../services/fine.service';
import { AuthService } from '../../services/auth.service';
import { UserDataService } from '../../services/user-data.service';
import { 
  FineRecord, 
  PaymentRecord, 
  PaymentMethodInfo,
  PaymentRequest,
  DummyPaymentForm,
  PaymentMethod
} from '../../models/fine.model';
import { AuthUser } from '../../models/auth.model';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-fines',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NavbarComponent],
  templateUrl: './fines.component.html',
  styleUrls: ['./fines.component.css']
})
export class FinesComponent implements OnInit, OnDestroy {
  // Data
  fines: FineRecord[] = [];
  selectedFines: Set<string> = new Set();
  paymentHistory: PaymentRecord[] = [];
  paymentMethods: PaymentMethodInfo[] = [];
  currentUser: AuthUser | null = null;

  // Forms
  paymentForm!: FormGroup;

  // UI States
  showPaymentModal = false;
  showPaymentForm = false;
  showReceiptModal = false;
  isLoading = false;
  isProcessingPayment = false;
  
  // Selected data
  selectedPaymentMethod: PaymentMethodInfo | null = null;
  selectedReceipt: PaymentRecord | null = null;

  // Messages
  errorMessage = '';
  successMessage = '';

  // Statistics
  totalPendingFines = 0;
  totalBooksOverdue = 0;

  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private fineService: FineService,
    private authService: AuthService,
    private userDataService: UserDataService,
    public router: Router
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadPaymentMethods();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initializeForms(): void {
    this.paymentForm = this.fb.group({
      paymentMethod: ['', Validators.required],
      // Card fields
      cardNumber: [''],
      cardName: [''],
      expiryMonth: [''],
      expiryYear: [''],
      cvv: [''],
      // UPI field
      upiId: [''],
      // Net banking
      bankName: [''],
      // Wallet
      walletProvider: [''],
      walletNumber: ['']
    });
  }

  private loadCurrentUser(): void {
    this.subscriptions.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
        if (user) {
          this.loadUserData(user.memberId);
        } else {
          this.router.navigate(['/login']);
        }
      })
    );
  }

  private loadUserData(memberId: string): void {
  this.isLoading = true;
  
  // ✅ Load real user fines (this will automatically generate fines from borrow records)
  this.subscriptions.add(
    this.fineService.getUserFines(memberId).subscribe({
      next: (fines) => {
        this.fines = fines;
        this.calculateStatistics();
        this.isLoading = false;
        
        // ✅ Log for debugging
        console.log(`📋 Loaded ${fines.length} fine records for user ${memberId}:`, fines);
      },
      error: (error) => {
        console.error('❌ Failed to load fine information:', error);
        this.showError('Failed to load fine information.');
        this.isLoading = false;
      }
    })
  );

  // Load payment history
  this.subscriptions.add(
    this.fineService.getUserPayments(memberId).subscribe({
      next: (payments) => {
        this.paymentHistory = payments;
      },
      error: () => {
        console.error('Failed to load payment history');
      }
    })
  );

  
}


  private loadPaymentMethods(): void {
    this.paymentMethods = this.fineService.getPaymentMethods();
  }

  private calculateStatistics(): void {
    this.totalPendingFines = this.fines.reduce((total, fine) => total + fine.totalFine, 0);
    this.totalBooksOverdue = this.fines.length;
  }

  // ✅ Fine selection
  onFineSelectionChange(fineId: string, event: Event): void {
  const target = event.target as HTMLInputElement;
  const isSelected = target.checked;
  
  if (isSelected) {
    this.selectedFines.add(fineId);
  } else {
    this.selectedFines.delete(fineId);
  }
}

  onSelectAllFines(): void {
    this.fines.forEach(fine => this.selectedFines.add(fine.id));
  }

  onDeselectAllFines(): void {
    this.selectedFines.clear();
  }

  getSelectedFines(): FineRecord[] {
    return this.fines.filter(fine => this.selectedFines.has(fine.id));
  }

  getSelectedTotal(): number {
    return this.getSelectedFines().reduce((total, fine) => total + fine.totalFine, 0);
  }

  // ✅ Payment flow
  onPaySelected(): void {
    if (this.selectedFines.size === 0) {
      this.showError('Please select at least one fine to pay.');
      return;
    }
    this.showPaymentModal = true;
  }

  onPaymentMethodSelect(method: PaymentMethodInfo): void {
    this.selectedPaymentMethod = method;
    this.paymentForm.patchValue({ paymentMethod: method.id });
    this.showPaymentForm = true;
  }

  onSubmitPayment(): void {
    if (!this.currentUser || !this.selectedPaymentMethod) return;

    // Validate form based on payment method
    if (!this.validatePaymentForm()) {
      return;
    }

    this.isProcessingPayment = true;
    this.clearMessages();

    const paymentRequest: PaymentRequest = {
      memberId: this.currentUser.memberId,
      fineIds: Array.from(this.selectedFines),
      totalAmount: this.getSelectedTotal(),
      paymentMethod: this.selectedPaymentMethod.id,
      customerInfo: {
        name: this.currentUser.memberName,
        email: this.currentUser.email
      }
    };

    const paymentFormData: DummyPaymentForm = {
      paymentMethod: this.selectedPaymentMethod.id,
      ...this.paymentForm.value
    };

    this.subscriptions.add(
      this.fineService.processPayment(paymentRequest, paymentFormData).subscribe({
        next: (response) => {
          this.isProcessingPayment = false;
          
          if (response.success) {
            this.showSuccess(response.message);
            this.closePaymentModal();
            this.selectedFines.clear();
            this.loadUserData(this.currentUser!.memberId);
            
            // Update user data service to reflect paid fines
            this.userDataService.refreshUserData();
            
            // Show receipt option
            if (response.paymentId) {
              setTimeout(() => {
                this.showSuccess('Payment successful! Receipt has been generated.');
              }, 1000);
            }
          } else {
            this.showError(response.message);
          }
        },
        error: () => {
          this.isProcessingPayment = false;
          this.showError('Payment processing failed. Please try again.');
        }
      })
    );
  }

  private validatePaymentForm(): boolean {
    const method = this.selectedPaymentMethod?.id;
    const formValue = this.paymentForm.value;

    switch (method) {
      case 'card':
        if (!formValue.cardNumber || !formValue.cardName || !formValue.expiryMonth || !formValue.expiryYear || !formValue.cvv) {
          this.showError('Please fill in all card details.');
          return false;
        }
        break;
      case 'upi':
        if (!formValue.upiId) {
          this.showError('Please enter your UPI ID.');
          return false;
        }
        break;
      case 'netbanking':
        if (!formValue.bankName) {
          this.showError('Please select your bank.');
          return false;
        }
        break;
      case 'wallet':
        if (!formValue.walletProvider) {
          this.showError('Please select your wallet provider.');
          return false;
        }
        break;
    }
    return true;
  }

  // ✅ Modal controls
  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.showPaymentForm = false;
    this.selectedPaymentMethod = null;
    this.paymentForm.reset();
  }

  onViewReceipt(payment: PaymentRecord): void {
    this.selectedReceipt = payment;
    this.showReceiptModal = true;
  }

  onDownloadReceipt(payment: PaymentRecord): void {
    this.fineService.downloadReceipt(payment);
  }

  closeReceiptModal(): void {
    this.showReceiptModal = false;
    this.selectedReceipt = null;
  }

  // ✅ Helper methods
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

  getDaysOverdueText(days: number): string {
    return days === 1 ? '1 day' : `${days} days`;
  }

  getPaymentMethodIcon(method: string): string {
    switch (method) {
      case 'card': return '💳';
      case 'upi': return '📱';
      case 'netbanking': return '🏦';
      case 'wallet': return '👛';
      default: return '💰';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'pending': return 'status-pending';
      case 'failed': return 'status-failed';
      default: return '';
    }
  }

  // ✅ Navigation
  navigateToBooks(): void {
    this.router.navigate(['/view']);
  }

  navigateToMyBooks(): void {
    this.router.navigate(['/borrowed-returned']);
  }

  trackByFineId(index: number, fine: FineRecord): string {
    return fine.id;
  }

  trackByPaymentId(index: number, payment: PaymentRecord): string {
    return payment.id;
  }
}
