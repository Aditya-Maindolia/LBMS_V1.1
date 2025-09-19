import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { StorageService } from './storage.service';
import { 
  MemberRegistrationRequest, 
  MemberRegistrationResponse, 
  CountryCode 
} from '../models/member.model';

@Injectable({
  providedIn: 'root'
})
export class MemberService {
  private apiUrl = 'http://localhost:8080/api/members';
  private readonly REGISTERED_USERS_KEY = 'registered_users';
  
  constructor(
    private http: HttpClient,
    private storageService: StorageService
  ) {}

  registerMember(memberData: MemberRegistrationRequest): Observable<MemberRegistrationResponse> {
    const registeredUsers = this.getRegisteredUsers();

    const emailExists = registeredUsers.some(user => 
      user.email.toLowerCase() === memberData.email.toLowerCase()
    );
    
    if (emailExists) {
      return throwError(() => new Error('Email already registered.'));
    }

    const mobileExists = registeredUsers.some(user => 
      user.countryCode === memberData.countryCode && user.mobileNumber === memberData.mobileNumber
    );

    if (mobileExists) {
      return throwError(() => new Error('Mobile number already registered.'));
    }

    const memberId = 'LIB' + Date.now().toString().slice(-6);
    
    const newUser = {
      id: memberId,
      memberName: memberData.memberName,
      email: memberData.email.toLowerCase(),
      password: memberData.password,
      countryCode: memberData.countryCode,
      mobileNumber: memberData.mobileNumber,
      address: memberData.address,
      dateOfBirth: memberData.dateOfBirth,
      secretQuestion: memberData.secretQuestion,
      secretAnswer: memberData.secretAnswer,
      createdAt: new Date().toISOString()
    };
    
    registeredUsers.push(newUser);
    this.storageService.setItem(this.REGISTERED_USERS_KEY, JSON.stringify(registeredUsers));

    const response: MemberRegistrationResponse = {
      success: true,
      message: 'Registration successful!',
      memberId: memberId,
      memberName: memberData.memberName,
      email: memberData.email
    };

    return of(response).pipe(delay(100));
  }

  getRegisteredUsers(): any[] {
    const users = this.storageService.getItem(this.REGISTERED_USERS_KEY);
    return users ? JSON.parse(users) : [];
  }

  findUserByEmail(email: string): any | null {
    const users = this.getRegisteredUsers();
    const normalizedEmail = email.toLowerCase().trim();
    const user = users.find(user => user.email.toLowerCase().trim() === normalizedEmail);
    return user || null;
  }

  validateCredentials(email: string, password: string): boolean {
    const user = this.findUserByEmail(email);
    if (!user) {
      return false;
    }
    return user.password === password;
  }

  public updateUserPassword(email: string, newPassword: string): void {
    const users = this.getRegisteredUsers();
    const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    users[userIndex].password = newPassword;
    this.storageService.setItem(this.REGISTERED_USERS_KEY, JSON.stringify(users));
  }

  existsByEmail(email: string): boolean {
    const users = this.getRegisteredUsers();
    return users.some(user => user.email.toLowerCase() === email.toLowerCase());
  }

  existsByMobile(mobileNumber: string): boolean {
    const users = this.getRegisteredUsers();
    return users.some(user => user.mobileNumber === mobileNumber);
  }

  checkEmailExists(email: string): Observable<boolean> {
    const users = this.getRegisteredUsers();
    const exists = users.some(user => user.email.toLowerCase() === email.toLowerCase());
    return of(exists).pipe(delay(300));
  }

  checkMobileExists(countryCode: string, mobileNumber: string): Observable<boolean> {
    const users = this.getRegisteredUsers();
    const exists = users.some(user => 
      user.countryCode === countryCode && user.mobileNumber === mobileNumber
    );
    return of(exists).pipe(delay(300));
  }

  getCountryCodes(): CountryCode[] {
    return [
      { code: 'IN', name: 'India', dialCode: '+91' },
      { code: 'US', name: 'United States', dialCode: '+1' },
      { code: 'GB', name: 'United Kingdom', dialCode: '+44' },
      { code: 'CA', name: 'Canada', dialCode: '+1' },
      { code: 'AU', name: 'Australia', dialCode: '+61' },
    ];
  }

  clearAllUsers(): void {
    this.storageService.removeItem(this.REGISTERED_USERS_KEY);
  }
}
