// ✅ Updated Fine Service with real data integration
import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { 
  FineRecord, 
  PaymentRequest, 
  PaymentResponse, 
  PaymentRecord,
  PaymentMethodInfo,
  DummyPaymentForm,
  PaymentMethod
} from '../models/fine.model';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class FineService {
  private finesSubject = new BehaviorSubject<FineRecord[]>([]);
  public fines$ = this.finesSubject.asObservable();

  private paymentsSubject = new BehaviorSubject<PaymentRecord[]>([]);
  public payments$ = this.paymentsSubject.asObservable();

  readonly DAILY_FINE_RATE = 5;

  constructor(
    private storageService: StorageService,
    private authService: AuthService
  ) {
    this.initializeData();
  }

  private initializeData(): void {
    const fines = this.getStoredFines();
    const payments = this.getStoredPayments();
    
    this.finesSubject.next(fines);
    this.paymentsSubject.next(payments);
  }

  private getStoredFines(): FineRecord[] {
    try {
      const stored = this.storageService.getItem('fine_records');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private getStoredPayments(): PaymentRecord[] {
    try {
      const stored = this.storageService.getItem('payment_records');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveFines(fines: FineRecord[]): void {
    this.storageService.setItem('fine_records', JSON.stringify(fines));
    this.finesSubject.next(fines);
  }

  private savePayments(payments: PaymentRecord[]): void {
    this.storageService.setItem('payment_records', JSON.stringify(payments));
    this.paymentsSubject.next(payments);
  }

  // ✅ Get real user's unpaid fines based on actual borrow records
  getUserFines(memberId: string): Observable<FineRecord[]> {
    // First generate/update fine records from current borrow data
    this.generateFineRecordsFromBorrowData(memberId);

    return this.fines$.pipe(
      map(fines => 
        fines.filter(fine => 
          fine.memberId === memberId && fine.status === 'pending'
        ).sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())
      ),
      delay(300)
    );
  }

  // ✅ Generate fine records from actual borrow data
  generateFineRecordsFromBorrowData(memberId: string): void {
    try {
      // Get actual borrow records from storage
      const borrowRecords = JSON.parse(this.storageService.getItem('borrow_records') || '[]');
      const existingFines = this.finesSubject.value;
      
      // Filter user's unreturned borrows
      const userBorrows = borrowRecords.filter((record: any) => 
        record.memberId === memberId && 
        !record.returnDate && // Not yet returned
        record.dueDate // Has a due date
      );

      const newFines: FineRecord[] = [];
      const today = new Date();

      userBorrows.forEach((borrow: any) => {
        const dueDate = new Date(borrow.dueDate);
        
        // Check if book is overdue
        if (today > dueDate) {
          // Check if fine already exists for this borrow
          const existingFine = existingFines.find(fine => 
            fine.bookId === borrow.bookId && 
            fine.memberId === memberId &&
            fine.status === 'pending' &&
            fine.dueDate === borrow.dueDate // Match exact due date
          );

          if (!existingFine) {
            // Calculate days overdue
            const daysOverdue = Math.ceil(
              (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysOverdue > 0) {
              const fine: FineRecord = {
                id: `FINE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                memberId: memberId,
                bookId: borrow.bookId,
                bookTitle: borrow.title || borrow.bookTitle || 'Unknown Book',
                author: borrow.author || 'Unknown Author',
                dueDate: borrow.dueDate,
                daysOverdue,
                dailyFine: this.DAILY_FINE_RATE,
                totalFine: daysOverdue * this.DAILY_FINE_RATE,
                status: 'pending',
                createdDate: new Date().toISOString()
              };

              newFines.push(fine);
            }
          } else {
            // Update existing fine with current overdue days
            const daysOverdue = Math.ceil(
              (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            
            if (daysOverdue !== existingFine.daysOverdue) {
              existingFine.daysOverdue = daysOverdue;
              existingFine.totalFine = daysOverdue * this.DAILY_FINE_RATE;
            }
          }
        }
      });

      // Save new fines if any
      if (newFines.length > 0) {
        const allFines = [...existingFines, ...newFines];
        this.saveFines(allFines);
        console.log(`✅ Generated ${newFines.length} new fine records for user ${memberId}`);
      } else {
        // Even if no new fines, save existing fines (in case of updates)
        this.saveFines(existingFines);
      }
    } catch (error) {
      console.error('❌ Error generating fine records:', error);
    }
  }

  // ✅ Get user's total pending fines
  getUserTotalFines(memberId: string): Observable<number> {
    return this.getUserFines(memberId).pipe(
      map(fines => fines.reduce((total, fine) => total + fine.totalFine, 0))
    );
  }

  // ✅ Calculate fine for specific book/due date
  calculateFineForBook(dueDate: string, currentDate?: Date): { daysOverdue: number; totalFine: number } {
    const due = new Date(dueDate);
    const current = currentDate || new Date();
    
    if (current <= due) {
      return { daysOverdue: 0, totalFine: 0 };
    }
    
    const daysOverdue = Math.ceil((current.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    const totalFine = daysOverdue * this.DAILY_FINE_RATE;
    
    return { daysOverdue, totalFine };
  }

  // ✅ Get detailed fine information for user dashboard
  getUserFinesSummary(memberId: string): Observable<{
    totalFines: number;
    overdueBooks: number;
    fines: FineRecord[];
  }> {
    return this.getUserFines(memberId).pipe(
      map(fines => ({
        totalFines: fines.reduce((total, fine) => total + fine.totalFine, 0),
        overdueBooks: fines.length,
        fines: fines
      }))
    );
  }

  // ... Keep all existing payment processing methods unchanged
  processPayment(paymentRequest: PaymentRequest, paymentForm: DummyPaymentForm): Observable<PaymentResponse> {
    console.log('Processing payment:', paymentRequest);

    return of(null).pipe(
      delay(2000),
      map(() => {
        const isSuccess = Math.random() > 0.1; // 90% success rate

        if (isSuccess) {
          const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

          // Get the fine records being paid
          const fines = this.finesSubject.value;
          const paidFines = fines.filter(fine => 
            paymentRequest.fineIds.includes(fine.id)
          );

          // Create payment record
          const paymentRecord: PaymentRecord = {
            id: paymentId,
            paymentId,
            transactionId,
            memberId: paymentRequest.memberId,
            memberName: paymentRequest.customerInfo.name,
            amount: paymentRequest.totalAmount,
            paymentMethod: paymentRequest.paymentMethod,
            paymentDate: new Date().toISOString(),
            fineRecords: paidFines,
            receiptUrl: this.generateReceiptUrl(paymentId),
            status: 'completed'
          };

          // Save payment record
          const payments = this.paymentsSubject.value;
          payments.unshift(paymentRecord);
          this.savePayments(payments);

          // Mark fines as paid
          const updatedFines = fines.map(fine => 
            paymentRequest.fineIds.includes(fine.id) 
              ? { ...fine, status: 'paid' as const }
              : fine
          );
          this.saveFines(updatedFines);

          return {
            success: true,
            paymentId,
            transactionId,
            message: `Payment of ₹${paymentRequest.totalAmount} processed successfully!`,
            receiptUrl: paymentRecord.receiptUrl
          };
        } else {
          const failureReasons = [
            'Insufficient funds in account',
            'Card expired or invalid',
            'Transaction declined by bank',
            'Network timeout occurred',
            'Invalid payment details'
          ];
          
          const randomReason = failureReasons[Math.floor(Math.random() * failureReasons.length)];

          return {
            success: false,
            message: `Payment failed: ${randomReason}. Please try again.`
          };
        }
      })
    );
  }

  // ... Keep all other existing methods (getUserPayments, getPaymentMethods, etc.)
  getUserPayments(memberId: string): Observable<PaymentRecord[]> {
    return this.payments$.pipe(
      map(payments => 
        payments.filter(payment => payment.memberId === memberId)
          .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
      ),
      delay(200)
    );
  }

  getPaymentMethods(): PaymentMethodInfo[] {
    return [
      {
        id: 'card',
        name: 'Credit/Debit Card',
        description: 'Pay using your credit or debit card',
        icon: '💳',
        processingTime: 'Instant'
      },
      {
        id: 'upi',
        name: 'UPI',
        description: 'Pay using UPI ID or QR code',
        icon: '📱',
        processingTime: 'Instant'
      },
      {
        id: 'netbanking',
        name: 'Net Banking',
        description: 'Pay through your bank account',
        icon: '🏦',
        processingTime: '2-5 minutes'
      },
      {
        id: 'wallet',
        name: 'Digital Wallet',
        description: 'Pay using digital wallet',
        icon: '👛',
        processingTime: 'Instant'
      }
    ];
  }

  private generateReceiptUrl(paymentId: string): string {
    return `data:text/plain;base64,${btoa(`Receipt-${paymentId}-${Date.now()}`)}`;
  }

  downloadReceipt(paymentRecord: PaymentRecord): void {
    const receiptContent = this.generateReceiptContent(paymentRecord);
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `Fine-Payment-Receipt-${paymentRecord.transactionId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  private generateReceiptContent(payment: PaymentRecord): string {
    return `
===============================================
         LIBRARY FINE PAYMENT RECEIPT
===============================================

Payment ID: ${payment.paymentId}
Transaction ID: ${payment.transactionId}
Date: ${new Date(payment.paymentDate).toLocaleString()}

Member Details:
---------------
Name: ${payment.memberName}
Member ID: ${payment.memberId}

Payment Details:
----------------
Amount Paid: ₹${payment.amount}
Payment Method: ${payment.paymentMethod.toUpperCase()}
Status: ${payment.status.toUpperCase()}

Books & Fines:
--------------
${payment.fineRecords.map(fine => 
  `Book: ${fine.bookTitle}
  Author: ${fine.author}
  Days Overdue: ${fine.daysOverdue}
  Fine Amount: ₹${fine.totalFine}`
).join('\n\n')}

Total Fine Paid: ₹${payment.amount}

===============================================
          Thank you for your payment!
===============================================

For any queries, please contact library support.
    `;
  }

  // ✅ Remove the createMockFines method since we're using real data now
  // createMockFines() method removed - not needed anymore
}
