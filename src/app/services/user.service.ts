import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { UserBorrowInfo, BorrowHistoryEntry, PasswordChangeRequest, PasswordChangeResponse } from '../models/user.model';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  // Mock users for testing
  private mockUsers: UserBorrowInfo[] = [
    {
      libraryId: 'LIB123456',
      name: 'Avadhi Jain',
      email: 'avadhi@example.com',
      currentBorrowedCount: 2,
      maxBooksAllowed: 5,
      fines: 0,
      overdueBooks: 0,
      isEligible: true,
    },
    {
      libraryId: 'LIB789012',
      name: 'John Doe',
      email: 'john@example.com',
      currentBorrowedCount: 4,
      maxBooksAllowed: 5,
      fines: 25,
      overdueBooks: 1,
      isEligible: false,
    },
  ];

  constructor(private storageService: StorageService) {}

  getUserBorrowInfo(memberId: string): Observable<UserBorrowInfo> {
    const registeredUsers = this.getRegisteredUsers();
    const registeredUser = registeredUsers.find((u) => u.id === memberId);

    if (registeredUser) {
      const userBorrowInfo: UserBorrowInfo = {
        libraryId: registeredUser.id,
        name: registeredUser.memberName,
        email: registeredUser.email,
        currentBorrowedCount: this.getCurrentBorrowCount(memberId),
        maxBooksAllowed: 5,
        fines: this.getCurrentFines(memberId),
        overdueBooks: this.getOverdueCount(memberId),
        isEligible: false,
      };

      // Calculate eligibility
      userBorrowInfo.isEligible =
        userBorrowInfo.fines === 0 &&
        userBorrowInfo.overdueBooks === 0 &&
        userBorrowInfo.currentBorrowedCount < userBorrowInfo.maxBooksAllowed;

      return of(userBorrowInfo).pipe(delay(500));
    }

    const mockUser = this.mockUsers.find((u) => u.libraryId === memberId);
    if (mockUser) {
      return of(mockUser).pipe(delay(500));
    }

    return throwError(() => new Error('User not found with this Member ID'));
  }

  private getRegisteredUsers(): any[] {
    const users = this.storageService.getItem('registered_users');
    return users ? JSON.parse(users) : [];
  }

  private getCurrentBorrowCount(memberId: string): number {
    const borrowRecords = this.getBorrowRecords();
    const userRecords = borrowRecords.filter(record => record.memberId === memberId);

    let currentCount = 0;
    userRecords.forEach(record => {
      if (!record.returnDate) {
        currentCount += record.totalBooks || record.books?.length || 0;
      }
    });

    return currentCount;
  }

  private getCurrentFines(memberId: string): number {
    const borrowRecords = this.getBorrowRecords();
    const userRecords = borrowRecords.filter(record => record.memberId === memberId && !record.returnDate);

    let totalFines = 0;
    const today = new Date();

    userRecords.forEach(record => {
      record.books?.forEach((book: any) => {
        const dueDate = new Date(book.dueDate);
        if (today > dueDate) {
          const daysLate = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          totalFines += daysLate * 5;
        }
      });
    });

    return totalFines;
  }

  private getOverdueCount(memberId: string): number {
    const borrowRecords = this.getBorrowRecords();
    const userRecords = borrowRecords.filter(record => record.memberId === memberId && !record.returnDate);

    let overdueCount = 0;
    const today = new Date();

    userRecords.forEach(record => {
      record.books?.forEach((book: any) => {
        const dueDate = new Date(book.dueDate);
        if (today > dueDate) {
          overdueCount++;
        }
      });
    });

    return overdueCount;
  }

  private getBorrowRecords(): any[] {
    const records = this.storageService.getItem('borrow_records');
    return records ? JSON.parse(records) : [];
  }

  getUserBorrowHistory(memberId: string): Observable<BorrowHistoryEntry[]> {
    const borrowRecords = this.getBorrowRecords();
    const userRecords = borrowRecords.filter(record => record.memberId === memberId);

    const history: BorrowHistoryEntry[] = [];

    userRecords.forEach(record => {
      if (record.books && Array.isArray(record.books)) {
        record.books.forEach((book: any, index: number) => {
          const bookData = this.getBookData(book.bookId);

          const historyEntry: BorrowHistoryEntry = {
            id: `${record.id}_${index}`,
            bookId: book.bookId || `BOOK_${index}`,
            title: bookData?.title || 'Unknown Book',
            author: bookData?.author || 'Unknown Author',
            category: bookData?.category || 'General',
            isbn: bookData?.isbn || '',
            borrowDate: book.borrowDate || record.borrowDate || new Date().toISOString(),
            dueDate: book.dueDate || new Date().toISOString(),
            returnedDate: record.returnDate || undefined,
            fineAmount: this.calculateBookFine(book.dueDate, record.returnDate),
            finePaid: false,
            status: this.getBookStatus(book.dueDate, record.returnDate),
            notes: record.notes || book.notes || ''
          };

          history.push(historyEntry);
        });
      }
    });

    history.sort((a, b) => new Date(b.borrowDate).getTime() - new Date(a.borrowDate).getTime());

    return of(history).pipe(delay(500));
  }

  private getBookData(bookId: string): any {
    const mockBooks: any = {
      BK001: { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald' },
      BK002: { title: 'To Kill a Mockingbird', author: 'Harper Lee' },
      BK003: { title: '1984', author: 'George Orwell' },
      BK004: { title: 'Angular Complete Guide', author: 'John Smith' },
    };

    return mockBooks[bookId];
  }

  private calculateBookFine(dueDate: string, returnDate?: string): number {
    const due = new Date(dueDate);
    const returned = returnDate ? new Date(returnDate) : new Date();

    if (returned <= due) return 0;

    const daysLate = Math.ceil((returned.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return daysLate * 5;
  }

  private getBookStatus(dueDate: string, returnDate?: string): 'Borrowed' | 'Returned' | 'Overdue' {
    if (returnDate) {
      return 'Returned';
    }

    const due = new Date(dueDate);
    const today = new Date();

    return today > due ? 'Overdue' : 'Borrowed';
  }

  updateUserBorrowCount(memberId: string, increment: number): Observable<boolean> {
    return of(true).pipe(delay(300));
  }

  changePassword(memberId: string, passwordData: PasswordChangeRequest): Observable<PasswordChangeResponse> {
    const registeredUsers = this.getRegisteredUsers();
    const userIndex = registeredUsers.findIndex((u: any) => u.id === memberId);

    if (userIndex === -1) {
      return of({
        success: false,
        message: 'User not found.'
      }).pipe(delay(500));
    }

    const user = registeredUsers[userIndex];

    if (user.password !== passwordData.currentPassword) {
      return of({
        success: false,
        message: 'Current password is incorrect.'
      }).pipe(delay(500));
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return of({
        success: false,
        message: 'New password and confirm password do not match.'
      }).pipe(delay(500));
    }

    registeredUsers[userIndex].password = passwordData.newPassword;
    registeredUsers[userIndex].updatedAt = new Date().toISOString();

    this.storageService.setItem('registered_users', JSON.stringify(registeredUsers));

    return of({
      success: true,
      message: 'Password changed successfully!'
    }).pipe(delay(500));
  }
}
