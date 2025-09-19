import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { UserBorrowInfo } from '../models/user.model';
import { AuthUser } from '../models/auth.model';

interface UserData {
  user: AuthUser | null;
  borrowInfo: UserBorrowInfo | null;
  isLoading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class UserDataService {
  private userDataSubject = new BehaviorSubject<UserData>({
    user: null,
    borrowInfo: null,
    isLoading: false,
    error: null
  });
  public userData$ = this.userDataSubject.asObservable();

  constructor(
    private authService: AuthService,
    private userService: UserService
  ) {
    this.initializeUserData();
  }

  private initializeUserData(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadUserBorrowInfo(user.memberId);
      } else {
        this.updateUserData({
          user: null,
          borrowInfo: null,
          isLoading: false,
          error: null
        });
      }
    });
  }

  private loadUserBorrowInfo(memberId: string): void {
    this.updateUserData({ ...this.userDataSubject.value, isLoading: true, error: null });
    this.userService.getUserBorrowInfo(memberId).subscribe({
      next: (borrowInfo) => {
        const user = this.authService.getCurrentUser();
        this.updateUserData({
          user,
          borrowInfo,
          isLoading: false,
          error: null
        });
      },
      error: () => {
        this.updateUserData({
          ...this.userDataSubject.value,
          isLoading: false,
          error: 'Failed to load user borrowing information'
        });
      }
    });
  }

  private updateUserData(data: UserData): void {
    this.userDataSubject.next(data);
  }

  public refreshUserData(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.memberId) {
      this.loadUserBorrowInfo(currentUser.memberId);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refresh-my-books'));
      }, 500);
    }
  }

  updateBorrowInfo(updatedInfo: Partial<UserBorrowInfo>): void {
    const currentData = this.userDataSubject.value;
    if (currentData.borrowInfo) {
      const updated = { ...currentData.borrowInfo, ...updatedInfo };
      this.updateUserData({
        ...currentData,
        borrowInfo: updated
      });
    }
  }

  getCurrentUserData(): UserData {
    return this.userDataSubject.value;
  }

  public forceRefresh(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.memberId) {
      this.loadUserBorrowInfo(currentUser.memberId);
    }
  }
}
