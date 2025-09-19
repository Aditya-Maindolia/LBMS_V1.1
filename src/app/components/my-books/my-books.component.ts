import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';

// Import jsPDF and related types
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { StorageService } from '../../services/storage.service';
import { UserDataService } from '../../services/user-data.service'; // ✅ Add shared service
import { BorrowHistoryEntry, BorrowStatus } from '../../models/user.model';
import { AuthUser } from '../../models/auth.model';
import { NavbarComponent } from '../navbar/navbar.component';

interface BorrowRecord {
  id: string;
  memberId: string;
  bookId: string;
  title: string;
  author: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  fineAmount: number;
  status: BorrowStatus;
}

@Component({
  selector: 'app-my-books',
  standalone: true,
  imports: [NavbarComponent, CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './my-books.component.html',
  styleUrls: ['./my-books.component.css']
})
export class MyBooksComponent implements OnInit, OnDestroy {
  filterForm!: FormGroup;
  borrowHistory: BorrowRecord[] = [];
  filteredHistory: BorrowRecord[] = [];
  currentUser: AuthUser | null = null;

  // States
  isLoading = false;
  errorMessage = '';
  
  // Statistics (will be synchronized with borrow books component)
  totalBorrowedBooks = 0;
  currentlyBorrowedBooks = 0;
  returnedBooks = 0;
  overdueBooks = 0;
  totalFines = 0;

  readonly FINE_PER_DAY = 5;
  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private storageService: StorageService,
    private userDataService: UserDataService, // ✅ Add shared service
    private router: Router
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadUserData(); // ✅ Use shared data loading
    this.setupDateFilter();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initializeForm(): void {
    this.filterForm = this.fb.group({
      startDate: [''],
      endDate: [''],
      status: ['all']
    });
  }

  // ✅ Use shared user data service
  private loadUserData(): void {
  this.subscriptions.add(
    this.userDataService.userData$.subscribe(userData => {
      console.log('👤 Received user data:', userData);
      
      this.currentUser = userData.user;
      this.isLoading = userData.isLoading;
      
      if (userData.error) {
        this.errorMessage = userData.error;
      }
      
      if (userData.user && userData.borrowInfo) {
        console.log('🔄 Loading history for user:', userData.user.memberId);
        this.loadBorrowHistory(userData.user.memberId);
        
        // Update statistics from shared borrow info
        this.updateStatisticsFromBorrowInfo(userData.borrowInfo);
      }
    })
  );

  // ✅ Also listen for storage events to refresh data when borrow books component updates it
  window.addEventListener('storage', () => {
    console.log('🔄 Storage changed, refreshing data');
    if (this.currentUser?.memberId) {
      this.loadBorrowHistory(this.currentUser.memberId);
    }
  });

  // ✅ Custom event listener for manual refresh
  window.addEventListener('refresh-my-books', () => {
    console.log('🔄 Manual refresh triggered');
    if (this.currentUser?.memberId) {
      this.loadBorrowHistory(this.currentUser.memberId);
    }
  });
}

  // ✅ Update statistics to match borrow books component
  private updateStatisticsFromBorrowInfo(borrowInfo: any): void {
    this.currentlyBorrowedBooks = borrowInfo.currentBorrowedCount || 0;
    this.totalFines = borrowInfo.fines || 0;
    this.overdueBooks = borrowInfo.overdueBooks || 0;
  }

  private setupDateFilter(): void {
    this.subscriptions.add(
      this.filterForm.valueChanges.subscribe(() => {
        this.applyFilters();
      })
    );
  }

  private loadBorrowHistory(memberId: string): void {
  if (this.isLoading) return; // Prevent double loading

  this.isLoading = true; // Set loading state
  this.errorMessage = '';

  try {
    console.log('🔍 Loading borrow history for member:', memberId);
    
    const allRecords = this.getBorrowRecords();
    console.log('📚 All borrow records:', allRecords);
    
    const userRecords = allRecords.filter((record: any) => record.memberId === memberId);
    console.log('👤 User specific records:', userRecords);
    
    this.borrowHistory = this.processBorrowRecords(userRecords);
    this.filteredHistory = [...this.borrowHistory];
    this.calculateStatistics();
    this.sortHistoryByDate();
    
    console.log('✅ Processed borrow history:', this.borrowHistory);
    console.log('📊 Statistics - Total:', this.totalBorrowedBooks, 'Currently:', this.currentlyBorrowedBooks);
    
  } catch (error) {
    this.errorMessage = 'Failed to load borrow history. Please try again.';
    console.error('❌ Error loading borrow history:', error);
  } finally {
    this.isLoading = false;
  }
}

  // ✅ Refresh data method that can be called from other components
  public refreshData(): void {
    this.userDataService.refreshUserData();
  }

  // Rest of your existing methods remain the same...
  private getBorrowRecords(): any[] {
  try {
    const records = this.storageService.getItem('borrow_records');
    let parsedRecords = records ? JSON.parse(records) : [];
    
    console.log('🗃️ Retrieved records from storage:', parsedRecords);
    
    // Only create mock data if NO records exist at all
    if (parsedRecords.length === 0) {
      console.log('⚠️ No existing records found, creating mock data');
      parsedRecords = this.createMockBorrowRecords();
      this.storageService.setItem('borrow_records', JSON.stringify(parsedRecords));
    }
    
    return parsedRecords;
  } catch (error) {
    console.error('Error getting borrow records:', error);
    return [];
  }
}

  private createMockBorrowRecords(): any[] {
    const currentDate = new Date();
    const mockRecords = [
      {
        id: 'BR001',
        memberId: this.currentUser?.memberId,
        bookId: 'BK001',
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        borrowDate: new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(currentDate.getTime() - 16 * 24 * 60 * 60 * 1000).toISOString(),
        returnDate: new Date(currentDate.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Returned in good condition'
      },
      {
        id: 'BR002',
        memberId: this.currentUser?.memberId,
        bookId: 'BK002',
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        borrowDate: new Date(currentDate.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(currentDate.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        returnDate: new Date(currentDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Returned with minor damage'
      },
      {
        id: 'BR003',
        memberId: this.currentUser?.memberId,
        bookId: 'BK003',
        title: '1984',
        author: 'George Orwell',
        borrowDate: new Date(currentDate.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(currentDate.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Currently reading'
      },
      {
        id: 'BR004',
        memberId: this.currentUser?.memberId,
        bookId: 'BK004',
        title: 'Angular Complete Guide',
        author: 'John Smith',
        borrowDate: new Date(currentDate.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(currentDate.getTime() - 11 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Technical book'
      },
      {
        id: 'BR005',
        memberId: this.currentUser?.memberId,
        bookId: 'BK005',
        title: 'JavaScript: The Good Parts',
        author: 'Douglas Crockford',
        borrowDate: new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(currentDate.getTime() + 9 * 24 * 60 * 60 * 1000).toISOString(),
        returnDate: new Date(currentDate.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Great technical reference'
      }
    ];

    return mockRecords;
  }

  // All your existing methods remain the same...
  private processBorrowRecords(records: any[]): BorrowRecord[] {
  return records.map(record => {
    console.log('🔄 Processing record:', record);
    
    const borrowRecord: BorrowRecord = {
      id: record.id || `BR${Date.now()}`,
      memberId: record.memberId,
      bookId: record.bookId || 'UNKNOWN',
      title: record.title || 'Unknown Book',
      author: record.author || 'Unknown Author',
      borrowDate: record.borrowDate,
      dueDate: record.dueDate,
      returnDate: record.returnDate,
      fineAmount: this.calculateFine(record.dueDate, record.returnDate),
      status: this.determineStatus(record.dueDate, record.returnDate)
    };

    console.log('✅ Processed record:', borrowRecord);
    return borrowRecord;
  });
}


  private calculateFine(dueDate: string, returnDate?: string): number {
    try {
      const due = new Date(dueDate);
      const returned = returnDate ? new Date(returnDate) : new Date();
      
      if (returned <= due) return 0;
      
      const daysLate = Math.ceil((returned.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      return daysLate * this.FINE_PER_DAY;
    } catch (error) {
      console.error('Error calculating fine:', error);
      return 0;
    }
  }

  private determineStatus(dueDate: string, returnDate?: string): BorrowStatus {
    try {
      if (returnDate) {
        return 'Returned';
      }
      
      const due = new Date(dueDate);
      const today = new Date();
      
      return today > due ? 'Overdue' : 'Borrowed';
    } catch (error) {
      console.error('Error determining status:', error);
      return 'Borrowed';
    }
  }

  private calculateStatistics(): void {
    this.totalBorrowedBooks = this.borrowHistory.length;
    this.currentlyBorrowedBooks = this.borrowHistory.filter(record => 
      record.status === 'Borrowed' || record.status === 'Overdue'
    ).length;
    this.returnedBooks = this.borrowHistory.filter(record => record.status === 'Returned').length;
    this.overdueBooks = this.borrowHistory.filter(record => record.status === 'Overdue').length;
    this.totalFines = this.borrowHistory.reduce((sum, record) => sum + record.fineAmount, 0);
  }

  private sortHistoryByDate(): void {
    this.filteredHistory.sort((a, b) => {
      const dateA = new Date(a.borrowDate);
      const dateB = new Date(b.borrowDate);
      return dateB.getTime() - dateA.getTime();
    });
  }

  applyFilters(): void {
    let filtered = [...this.borrowHistory];
    const { startDate, endDate, status } = this.filterForm.value;

    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(record => new Date(record.borrowDate) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(record => new Date(record.borrowDate) <= end);
    }

    if (status && status !== 'all') {
      filtered = filtered.filter(record => record.status.toLowerCase() === status.toLowerCase());
    }

    this.filteredHistory = filtered;
    this.sortHistoryByDate();
  }

  clearFilters(): void {
    this.filterForm.reset({ status: 'all' });
    this.filteredHistory = [...this.borrowHistory];
    this.sortHistoryByDate();
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'returned': return 'status-returned';
      case 'borrowed': return 'status-borrowed';
      case 'overdue': return 'status-overdue';
      default: return '';
    }
  }

  getDaysUntilDue(dueDate: string): number {
  try {
    if (!dueDate) return 0;
    
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    console.log('📅 Days calculation:', { dueDate, today: today.toISOString(), days });
    return days;
  } catch (error) {
    console.error('Error calculating days:', error);
    return 0;
  }
}

  // ✅ Navigation method that refreshes data in borrow books component
  navigateToBorrowBooks(): void {
    // Refresh shared data before navigating
    this.userDataService.refreshUserData();
    this.router.navigate(['/borrow']);
  }

  // Add all your existing utility methods...
  exportToPDF(): void {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.setTextColor(44, 62, 80);
    doc.text('My Books - Borrow & Return History', 20, 20);
    
    if (this.currentUser) {
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Member: ${this.currentUser.memberName}`, 20, 30);
      doc.text(`Member ID: ${this.currentUser.memberId}`, 20, 37);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 44);
    }

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Books Borrowed: ${this.totalBorrowedBooks}`, 20, 55);
    doc.text(`Currently Borrowed: ${this.currentlyBorrowedBooks}`, 90, 55);
    doc.text(`Overdue Books: ${this.overdueBooks}`, 160, 55);
    doc.text(`Total Fines: ₹${this.totalFines}`, 20, 62);

    const tableData = this.filteredHistory.map(record => [
      record.bookId,
      record.title,
      record.author,
      new Date(record.borrowDate).toLocaleDateString(),
      new Date(record.dueDate).toLocaleDateString(),
      record.returnDate ? new Date(record.returnDate).toLocaleDateString() : 'Not Returned',
      record.fineAmount > 0 ? `₹${record.fineAmount}` : '₹0',
      record.status
    ]);

    autoTable(doc, {
      startY: 70,
      head: [['Book ID', 'Title', 'Author', 'Borrow Date', 'Due Date', 'Return Date', 'Fine', 'Status']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { 
        fillColor: [52, 152, 219],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: { fillColor: [249, 249, 249] },
      margin: { left: 20, right: 20 }
    });

    const fileName = `My_Books_History_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }

  trackByRecordId(index: number, record: BorrowRecord): string {
    return record.id;
  }

  navigateToSearchBooks(): void {
    this.router.navigate(['/view-books']);
  }

  navigateToProfile(): void {
    this.router.navigate(['/profile']);
  }

  getMathAbs(value: number): number {
    return Math.abs(value);
  }

  getMathFloor(value: number): number {
    return Math.floor(value);
  }

  getMathCeil(value: number): number {
    return Math.ceil(value);
  }
}
