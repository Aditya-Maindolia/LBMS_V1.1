export interface UserBorrowInfo {
  libraryId: string;
  name: string;
  email: string;
  currentBorrowedCount: number;
  maxBooksAllowed: number;
  fines: number;
  overdueBooks: number;
  isEligible: boolean;
  borrowHistory?: BorrowedBook[];
}

export interface BorrowedBook {
  bookId: string;
  bookTitle: string;
  borrowDate: Date;
  dueDate: Date;
  isOverdue: boolean;
  fineAmount?: number;
}

// ========================================
// USER PROFILE INTERFACES
// ========================================

/**
 * Complete user profile interface for registered users
 */
export interface UserProfile {
  id: string; // Member ID (auto-generated during registration)
  memberName: string;
  email: string;
  countryCode: string;
  mobileNumber: string;
  address: string;
  dateOfBirth: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * User profile update request interface
 */
export interface UserProfileUpdateRequest {
  memberName: string;
  email: string;
  countryCode: string;
  mobileNumber: string;
  address: string;
}

/**
 * User profile validation errors
 */
export interface UserProfileValidationErrors {
  memberName?: string;
  email?: string;
  mobileNumber?: string;
  address?: string;
  general?: string;
}

// ========================================
// BORROW FUNCTIONALITY INTERFACES
// ========================================

/**
 * User borrowing information for validation and display
 */
export interface UserBorrowInfo {
  libraryId: string; // Same as member ID
  name: string;
  email: string;
  currentBorrowedCount: number;
  maxBooksAllowed: number;
  fines: number;
  overdueBooks: number;
  isEligible: boolean;
  memberSince?: string;
  lastBorrowDate?: string;
  lastPaymentDate?: string;
}

/**
 * Individual borrow history entry
 */
export interface BorrowHistoryEntry {
  id: string; // Unique borrow record ID
  bookId: string;
  title: string;
  author: string;
  category?: string;
  isbn?: string;
  borrowDate: string;
  dueDate: string;
  returnedDate?: string;
  fineAmount: number;
  finePaid: boolean;
  status: BorrowStatus;
  notes?: string;
}

/**
 * Borrow status enumeration
 */
export type BorrowStatus = 'Borrowed' | 'Returned' | 'Overdue' | 'Lost';

/**
 * Complete user borrow history
 */
export interface UserBorrowHistory {
  memberId: string;
  memberName: string;
  email: string;
  history: BorrowHistoryEntry[];
  statistics: BorrowStatistics;
}

/**
 * Borrow statistics for dashboard
 */
export interface BorrowStatistics {
  totalBorrowedBooks: number;
  currentlyBorrowedBooks: number;
  overdueBooks: number;
  returnedBooks: number;
  totalFines: number;
  totalFinesPaid: number;
  averageBorrowDuration: number; // in days
  favoriteCategory?: string;
  mostBorrowedAuthor?: string;
}

/**
 * Borrow request interface
 */
export interface BorrowRequest {
  memberId: string;
  books: BorrowBookItem[];
  borrowDate: string;
  notes?: string;
}

/**
 * Individual book item in a borrow request
 */
export interface BorrowBookItem {
  bookId: string;
  quantity: number;
  dueDate: string;
}

/**
 * Borrow response from server
 */
export interface BorrowResponse {
  success: boolean;
  message: string;
  borrowId?: string;
  dueDate?: string;
  borrowedBooks?: BorrowedBookDetail[];
  totalFine?: number;
}

/**
 * Borrowed book details in response
 */
export interface BorrowedBookDetail {
  bookId: string;
  title: string;
  author: string;
  quantity: number;
  borrowDate: string;
  dueDate: string;
}

// ========================================
// FINE MANAGEMENT INTERFACES
// ========================================

/**
 * Fine details interface
 */
export interface FineDetail {
  id: string;
  memberId: string;
  bookId: string;
  bookTitle: string;
  fineAmount: number;
  daysOverdue: number;
  finePerDay: number;
  dateCreated: string;
  datePaid?: string;
  isPaid: boolean;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
}

/**
 * Payment method enumeration
 */
export type PaymentMethod = 'Cash' | 'Card' | 'UPI' | 'Net Banking' | 'Wallet';

/**
 * Fine payment request
 */
export interface FinePaymentRequest {
  fineIds: string[];
  paymentMethod: PaymentMethod;
  totalAmount: number;
  paymentReference?: string;
}

/**
 * Fine payment response
 */
export interface FinePaymentResponse {
  success: boolean;
  message: string;
  paymentId?: string;
  paidAmount: number;
  remainingFines: number;
}

// ========================================
// USER PREFERENCES INTERFACES
// ========================================

/**
 * User preferences for personalization
 */
export interface UserPreferences {
  memberId: string;
  favoriteCategories: string[];
  preferredAuthors: string[];
  notificationSettings: NotificationSettings;
  privacySettings: PrivacySettings;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
}

/**
 * Notification preferences
 */
export interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  dueDateReminders: boolean;
  newBookAlerts: boolean;
  finePendingAlerts: boolean;
  borrowConfirmations: boolean;
  returnConfirmations: boolean;
}

/**
 * Privacy preferences
 */
export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'friends';
  showBorrowHistory: boolean;
  showReadingStats: boolean;
  allowRecommendations: boolean;
  shareDataForAnalytics: boolean;
}

// ========================================
// SEARCH AND FILTER INTERFACES
// ========================================

/**
 * User search criteria for borrow history
 */
export interface BorrowHistorySearchCriteria {
  startDate?: string;
  endDate?: string;
  status?: BorrowStatus | 'all';
  bookTitle?: string;
  author?: string;
  category?: string;
  sortBy?: 'borrowDate' | 'dueDate' | 'returnDate' | 'title' | 'author';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Search results for borrow history
 */
export interface BorrowHistorySearchResult {
  entries: BorrowHistoryEntry[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
}

// ========================================
// READING ANALYTICS INTERFACES
// ========================================

/**
 * Reading analytics and insights
 */
export interface ReadingAnalytics {
  memberId: string;
  totalBooksRead: number;
  averageReadingTime: number; // in days
  readingStreak: number; // consecutive days with active borrows
  favoriteGenres: GenreStatistic[];
  monthlyReadingStats: MonthlyReadingStat[];
  yearlyReadingGoal?: ReadingGoal;
  achievements: Achievement[];
}

/**
 * Genre statistics
 */
export interface GenreStatistic {
  genre: string;
  booksRead: number;
  percentage: number;
  averageRating?: number;
}

/**
 * Monthly reading statistics
 */
export interface MonthlyReadingStat {
  month: string; // YYYY-MM format
  booksRead: number;
  averageDuration: number;
  finesIncurred: number;
  onTimeReturns: number;
}

/**
 * Reading goal interface
 */
export interface ReadingGoal {
  year: number;
  targetBooks: number;
  currentProgress: number;
  isCompleted: boolean;
  completedDate?: string;
}

/**
 * Achievement interface
 */
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedDate: string;
  category: 'reading' | 'borrowing' | 'returning' | 'community';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// ========================================
// UTILITY INTERFACES
// ========================================

/**
 * API response wrapper
 */
export interface UserApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  errors?: string[];
  metadata?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

/**
 * Pagination interface
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Sort configuration
 */
export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Filter configuration
 */
export interface FilterConfig {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'between' | 'in';
  value: any;
}

// ========================================
// COUNTRY AND LOCATION INTERFACES
// ========================================

/**
 * Country code interface for phone validation
 */
export interface CountryCode {
  code: string; // ISO country code (e.g., 'IN', 'US')
  name: string; // Country name
  dialCode: string; // Phone dial code (e.g., '+91')
  flag?: string; // Flag emoji or URL
  minPhoneLength?: number;
  maxPhoneLength?: number;
  phoneFormat?: string; // Regex pattern for phone format
}

/**
 * Address interface for detailed location
 */
export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  landmark?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// ========================================
// VALIDATION INTERFACES
// ========================================

/**
 * Field validation result
 */
export interface FieldValidation {
  field: string;
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Form validation result
 */
export interface FormValidationResult {
  isValid: boolean;
  fieldValidations: FieldValidation[];
  globalErrors?: string[];
}

/**
 * Validation rule interface
 */
export interface ValidationRule {
  type: 'required' | 'email' | 'phone' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
  customValidator?: (value: any) => boolean;
}

// ========================================
// CONSTANTS AND ENUMS
// ========================================

/**
 * User status enumeration
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
  BLOCKED = 'blocked'
}

/**
 * Member type enumeration
 */
export enum MemberType {
  STANDARD = 'standard',
  PREMIUM = 'premium',
  STUDENT = 'student',
  FACULTY = 'faculty',
  SENIOR = 'senior'
}

/**
 * Default constants
 */
export const USER_CONSTANTS = {
  MAX_BOOKS_PER_USER: 5,
  BORROW_PERIOD_DAYS: 14,
  FINE_PER_DAY: 5,
  MAX_FINE_AMOUNT: 500,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 50,
  MAX_ADDRESS_LENGTH: 100,
  PHONE_NUMBER_LENGTH: 10,
  PASSWORD_MIN_LENGTH: 8,
  EMAIL_MAX_LENGTH: 254
} as const;

// ========================================
// TYPE GUARDS
// ========================================

/**
 * Type guard to check if object is a UserProfile
 */
export function isUserProfile(obj: any): obj is UserProfile {
  return obj && 
         typeof obj.id === 'string' &&
         typeof obj.memberName === 'string' &&
         typeof obj.email === 'string' &&
         typeof obj.mobileNumber === 'string';
}

/**
 * Type guard to check if object is a BorrowHistoryEntry
 */
export function isBorrowHistoryEntry(obj: any): obj is BorrowHistoryEntry {
  return obj &&
         typeof obj.id === 'string' &&
         typeof obj.bookId === 'string' &&
         typeof obj.borrowDate === 'string' &&
         typeof obj.dueDate === 'string';
}

// ========================================
// UTILITY TYPES
// ========================================

/**
 * Partial user profile for updates (all fields optional except id)
 */
export type PartialUserProfile = Partial<Omit<UserProfile, 'id'>> & Pick<UserProfile, 'id'>;

/**
 * User profile for display (without sensitive information)
 */
export type UserProfileDisplay = Omit<UserProfile, 'mobileNumber' | 'address'>;

/**
 * Borrow history entry for display (with computed fields)
 */
export type BorrowHistoryEntryDisplay = BorrowHistoryEntry & {
  isOverdue: boolean;
  daysUntilDue: number;
  borrowDuration: number;
  statusClass: string;
};

/**
 * User dashboard data
 */
export type UserDashboardData = {
  profile: UserProfileDisplay;
  borrowInfo: UserBorrowInfo;
  recentHistory: BorrowHistoryEntry[];
  analytics: ReadingAnalytics;
  notifications: Notification[];
};

/**
 * Notification interface
 */
export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  createdAt: string;
  readAt?: string;
  actionUrl?: string;
  actionText?: string;
}


// Password change interfaces (ADD TO END OF FILE)
export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordChangeResponse {
  success: boolean;
  message: string;
}
