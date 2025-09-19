export interface FineRecord {
  id: string;
  memberId: string;
  bookId: string;
  bookTitle: string;
  author: string;
  dueDate: string;
  returnDate?: string;
  daysOverdue: number;
  dailyFine: number;
  totalFine: number;
  status: 'pending' | 'paid';
  createdDate: string;
}

export interface PaymentRequest {
  memberId: string;
  fineIds: string[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  customerInfo: {
    name: string;
    email: string;
    phone?: string;
  };
}

export interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  transactionId?: string;
  message: string;
  receiptUrl?: string;
}

export interface PaymentRecord {
  id: string;
  paymentId: string;
  transactionId: string;
  memberId: string;
  memberName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  fineRecords: FineRecord[];
  receiptUrl: string;
  status: PaymentStatus;
}

export type PaymentMethod = 'card' | 'upi' | 'netbanking' | 'wallet';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface PaymentMethodInfo {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: string;
  processingTime: string;
}

export interface DummyPaymentForm {
  paymentMethod: PaymentMethod;
  // Card details
  cardNumber?: string;
  cardName?: string;
  expiryMonth?: string;
  expiryYear?: string;
  cvv?: string;
  // UPI details
  upiId?: string;
  // Net banking
  bankName?: string;
  // Wallet
  walletProvider?: string;
  walletNumber?: string;
}
