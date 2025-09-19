import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

import { BookService } from '../../services/book.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { StorageService } from '../../services/storage.service';
import { UserDataService } from '../../services/user-data.service';
import { Book, SearchCriteria, SearchResult, BookCategory } from '../../models/book.model';
import { UserBorrowInfo } from '../../models/user.model';
import { AuthUser } from '../../models/auth.model';
import { NavbarComponent } from '../navbar/navbar.component';

interface ExtendedSearchCriteria extends SearchCriteria {
  availabilityFilter?: 'all' | 'available' | 'unavailable';
  sortBy?: 'title' | 'author' | 'category' | 'rating' | 'publishYear';
  sortOrder?: 'asc' | 'desc';
}

interface AvailabilityInfo {
  status: 'Available' | 'Limited' | 'Unavailable';
  message: string;
  nextAvailableDate?: string;
}

@Component({
  selector: 'app-books',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NavbarComponent],
  templateUrl: './books.component.html',
  styleUrls: ['./books.component.css']
})
export class BooksComponent implements OnInit, OnDestroy {
  // Forms
  searchForm!: FormGroup;
  
  // Data
  books: Book[] = [];
  searchResults: SearchResult | null = null;
  categories: BookCategory[] = [];
  selectedBooks: Map<string, number> = new Map();
  
  // User Data
  currentUser: AuthUser | null = null;
  userBorrowInfo: UserBorrowInfo | null = null;
  
  // Modal States
  selectedBook: Book | null = null;
  showBookModal = false;
  showAvailabilityModal = false;
  showBorrowConfirmModal = false;
  availabilityInfo: AvailabilityInfo | null = null;
  
  // Component States
  isSearching = false;
  isLoadingUser = false;
  hasSearched = false;
  isBorrowing = false;
  
  // Messages
  errorMessage = '';
  successMessage = '';
  
  // Constants
  readonly MAX_BOOKS_PER_USER = 5;
  readonly BORROW_PERIOD_DAYS = 14;
  readonly FINE_PER_DAY = 5;
  
  // Configuration
  searchTypes = [
    { value: 'all', label: 'All Fields' },
    { value: 'title', label: 'Title' },
    { value: 'author', label: 'Author' },
    { value: 'category', label: 'Category' },
    { value: 'bookId', label: 'Book ID' }
  ];

  sortOptions = [
    { value: 'title', label: 'Title' },
    { value: 'author', label: 'Author' },
    { value: 'category', label: 'Category' },
    { value: 'rating', label: 'Rating' },
    { value: 'publishYear', label: 'Publication Year' }
  ];

  private searchSubject = new Subject<ExtendedSearchCriteria>();
  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private bookService: BookService,
    private userService: UserService,
    private authService: AuthService,
    private storageService: StorageService,
    private userDataService: UserDataService,
    public router: Router,
    private route: ActivatedRoute
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadUserData();
    this.loadBooks();
    this.loadCategories();
    this.setupSearch();
    this.handleRouteParams();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initializeForm(): void {
    this.searchForm = this.fb.group({
      query: [''],
      searchType: ['all'],
      category: [''],
      availabilityFilter: ['all'],
      sortBy: ['title'],
      sortOrder: ['asc']
    });
  }

  // ✅ Unified User Data Loading
  private loadUserData(): void {
    this.subscriptions.add(
      this.userDataService.userData$.subscribe(userData => {
        this.currentUser = userData.user;
        this.userBorrowInfo = userData.borrowInfo;
        this.isLoadingUser = userData.isLoading;
        
        if (userData.error) {
          this.showError(userData.error);
        }
        
        if (userData.borrowInfo) {
          this.validateUserEligibility(userData.borrowInfo);
        }
      })
    );
  }

  // ✅ Load Books with Real-time Sync
  private loadBooks(): void {
    this.subscriptions.add(
      this.bookService.getAllBooks().subscribe({
        next: (books: Book[]) => {
          this.books = books;
          this.performSearch(); // Refresh search results with updated data
          console.log('📚 Books loaded and synced:', books.length);
        },
        error: () => {
          this.showError('Failed to load books. Please refresh the page.');
        }
      })
    );
  }

  private loadCategories(): void {
    this.subscriptions.add(
      this.bookService.getBookCategories().subscribe(categories => {
        this.categories = categories;
      })
    );
  }

  private setupSearch(): void {
    // Real-time search
    this.subscriptions.add(
      this.searchForm.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
      ).subscribe(() => {
        this.performSearch();
      })
    );

    // Search subject handler
    this.subscriptions.add(
      this.searchSubject.pipe(
        debounceTime(300),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
      ).subscribe(criteria => {
        this.executeSearch(criteria);
      })
    );
  }

  private handleRouteParams(): void {
    this.subscriptions.add(
      this.route.queryParams.subscribe(params => {
        if (params['q']) {
          this.searchForm.patchValue({
            query: params['q'],
            searchType: params['searchType'] || 'all'
          });
        }
        this.performSearch();
      })
    );
  }

  // ✅ Unified Search Logic
  performSearch(): void {
    const formValue = this.searchForm.value;
    const criteria: ExtendedSearchCriteria = this.buildSearchCriteria(formValue);
    this.searchSubject.next(criteria);
  }

  private buildSearchCriteria(formValue: any): ExtendedSearchCriteria {
    const criteria: ExtendedSearchCriteria = {};
    const query = formValue.query?.trim() || '';
    
    if (query) {
      switch (formValue.searchType) {
        case 'title':
          criteria.title = query;
          break;
        case 'author':
          criteria.author = query;
          break;
        case 'category':
          criteria.category = query;
          break;
        case 'bookId':
          criteria.bookId = query;
          break;
        case 'all':
        default:
          // Search across all fields
          criteria.title = query;
          criteria.author = query;
          criteria.category = query;
          criteria.bookId = query;
          break;
      }
    }

    if (formValue.category?.trim()) {
      criteria.category = formValue.category;
    }

    criteria.availabilityFilter = formValue.availabilityFilter;
    criteria.sortBy = formValue.sortBy;
    criteria.sortOrder = formValue.sortOrder;

    return criteria;
  }

  private executeSearch(criteria: ExtendedSearchCriteria): void {
    this.isSearching = true;
    
    // Apply search and filters directly to local books array for real-time sync
    let filteredBooks = [...this.books];

    // Apply search query
    if (criteria.title && criteria.author && criteria.category && criteria.bookId) {
      // "All fields" search
      const query = criteria.title.toLowerCase();
      filteredBooks = filteredBooks.filter(book =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.category.toLowerCase().includes(query) ||
        book.id.toLowerCase().includes(query)
      );
    } else {
      // Specific field search
      if (criteria.title && criteria.title !== criteria.author) {
        filteredBooks = filteredBooks.filter(book =>
          book.title.toLowerCase().includes(criteria.title!.toLowerCase())
        );
      }
      if (criteria.author && criteria.author !== criteria.title) {
        filteredBooks = filteredBooks.filter(book =>
          book.author.toLowerCase().includes(criteria.author!.toLowerCase())
        );
      }
      if (criteria.category) {
        filteredBooks = filteredBooks.filter(book =>
          book.category.toLowerCase().includes(criteria.category!.toLowerCase())
        );
      }
      if (criteria.bookId) {
        filteredBooks = filteredBooks.filter(book =>
          book.id.toLowerCase().includes(criteria.bookId!.toLowerCase())
        );
      }
    }

    // Apply availability filter
    if (criteria.availabilityFilter && criteria.availabilityFilter !== 'all') {
      if (criteria.availabilityFilter === 'available') {
        filteredBooks = filteredBooks.filter(book => book.isAvailable && book.availableCopies > 0);
      } else if (criteria.availabilityFilter === 'unavailable') {
        filteredBooks = filteredBooks.filter(book => !book.isAvailable || book.availableCopies === 0);
      }
    }

    // Apply sorting
    if (criteria.sortBy) {
      filteredBooks = this.sortBooks(filteredBooks, criteria.sortBy, criteria.sortOrder || 'asc');
    }

    this.searchResults = {
      books: filteredBooks,
      totalCount: filteredBooks.length,
      searchTerm: this.buildSearchTerm(criteria)
    };

    this.hasSearched = true;
    this.isSearching = false;
  }

  private buildSearchTerm(criteria: ExtendedSearchCriteria): string {
    const terms: string[] = [];
    if (criteria.title && !criteria.author) terms.push(`Title: ${criteria.title}`);
    if (criteria.author && !criteria.title) terms.push(`Author: ${criteria.author}`);
    if (criteria.category) terms.push(`Category: ${criteria.category}`);
    if (criteria.bookId) terms.push(`ID: ${criteria.bookId}`);
    return terms.join(', ') || 'All Books';
  }

  private sortBooks(books: Book[], sortBy: string, sortOrder: string): Book[] {
    return books.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'author':
          aValue = a.author.toLowerCase();
          bValue = b.author.toLowerCase();
          break;
        case 'category':
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        case 'rating':
          aValue = a.rating || 0;
          bValue = b.rating || 0;
          break;
        case 'publishYear':
          aValue = a.publishYear || 0;
          bValue = b.publishYear || 0;
          break;
        default:
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'desc' ? 
          bValue.localeCompare(aValue) : 
          aValue.localeCompare(bValue);
      } else {
        return sortOrder === 'desc' ? 
          bValue - aValue : 
          aValue - bValue;
      }
    });
  }

  // ✅ Borrowing Logic
  onQuantityChange(bookId: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    const quantity = parseInt(target.value, 10) || 0;
    
    if (quantity <= 0) {
      this.selectedBooks.delete(bookId);
    } else {
      const book = this.books.find(b => b.id === bookId);
      if (book && quantity > book.availableCopies) {
        this.showError(`Only ${book.availableCopies} copies of "${book.title}" are available.`);
        target.value = book.availableCopies.toString();
        this.selectedBooks.set(bookId, book.availableCopies);
      } else {
        this.selectedBooks.set(bookId, quantity);
      }
    }
    this.validateSelection();
  }

  private validateSelection(): void {
    if (!this.userBorrowInfo) return;
    
    const totalSelected = this.getTotalSelectedCopies();
    const totalAfterBorrow = this.userBorrowInfo.currentBorrowedCount + totalSelected;
    
    if (totalAfterBorrow > this.MAX_BOOKS_PER_USER) {
      this.showError(`You cannot borrow more than ${this.MAX_BOOKS_PER_USER} books in total.`);
    } else {
      this.clearError();
    }
  }

  private validateUserEligibility(userInfo: UserBorrowInfo): void {
    if (userInfo.fines > 0 && userInfo.fines) {
      this.showError(`You have pending fines of ₹${userInfo.fines}. Please clear them before borrowing.`);
      return;
    }

    if (userInfo.overdueBooks > 0) {
      this.showError(`You have ${userInfo.overdueBooks} overdue book(s). Please return them first.`);
      return;
    }

    if (userInfo.currentBorrowedCount >= this.MAX_BOOKS_PER_USER) {
      this.showError(`You have already borrowed the maximum allowed ${this.MAX_BOOKS_PER_USER} books.`);
      return;
    }

    this.clearError();
  }

  onBorrowBook(book: Book): void {
    if (!this.currentUser) {
      this.showError('Please log in to borrow books.');
      return;
    }

    if (!book.isAvailable || book.availableCopies === 0) {
      this.onCheckAvailability(book);
      return;
    }

    // Set quantity to 1 and show confirmation
    this.selectedBooks.clear();
    this.selectedBooks.set(book.id, 1);
    this.showBorrowConfirmModal = true;
  }

  onBorrowSelected(): void {
    if (this.selectedBooks.size === 0) {
      this.showError('Please select at least one book to borrow.');
      return;
    }
    this.showBorrowConfirmModal = true;
  }

  confirmBorrow(): void {
    if (!this.userBorrowInfo || !this.currentUser) return;

    this.isBorrowing = true;
    
    try {
      // ✅ Update book inventory in real-time
      for (const [bookId, quantity] of this.selectedBooks) {
        const bookIndex = this.books.findIndex(b => b.id === bookId);
        if (bookIndex !== -1) {
          this.books[bookIndex].availableCopies -= quantity;
          
          // Update availability status
          if (this.books[bookIndex].availableCopies === 0) {
            this.books[bookIndex].isAvailable = false;
          }
        }
      }

      // Create borrow records
      const borrowBooks = [];
      for (const [bookId, quantity] of this.selectedBooks) {
        for (let i = 0; i < quantity; i++) {
          borrowBooks.push({
            bookId,
            quantity: 1,
            borrowDate: new Date().toISOString(),
            dueDate: new Date(Date.now() + this.BORROW_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString()
          });
        }
      }

      const borrowRecord = {
        memberId: this.currentUser.memberId,
        books: borrowBooks,
        totalBooks: this.getTotalSelectedCopies(),
        borrowDate: new Date().toISOString()
      };

      this.saveBorrowRecord(borrowRecord);

      // Update user borrow info
      const newBorrowCount = this.userBorrowInfo.currentBorrowedCount + this.getTotalSelectedCopies();
      this.userDataService.updateBorrowInfo({
        currentBorrowedCount: newBorrowCount
      });

      // Show success message
      const borrowedBooksList = Array.from(this.selectedBooks.entries())
        .map(([bookId, quantity]) => {
          const book = this.books.find(b => b.id === bookId);
          return `${quantity}x ${book?.title}`;
        })
        .join(', ');

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + this.BORROW_PERIOD_DAYS);

      this.showSuccess(
        `✅ Successfully borrowed: ${borrowedBooksList}. Due date: ${dueDate.toLocaleDateString()}`
      );

      // Reset
      this.selectedBooks.clear();
      this.showBorrowConfirmModal = false;
      
      // ✅ Trigger immediate refresh of search results
      this.performSearch();
      
      // Refresh user data
      setTimeout(() => {
        this.userDataService.refreshUserData();
      }, 500);

    } catch (error) {
      this.showError('Failed to process borrow request. Please try again.');
      console.error('Borrow processing error:', error);
    }
    
    this.isBorrowing = false;
  }

  private saveBorrowRecord(borrowRecord: any): void {
    try {
      const existingRecords = JSON.parse(this.storageService.getItem('borrow_records') || '[]');
      
      const newRecords = borrowRecord.books.map((book: any, index: number) => {
        const bookDetails = this.books.find(b => b.id === book.bookId);
        return {
          id: `BR${Date.now()}_${index}`,
          memberId: borrowRecord.memberId,
          bookId: book.bookId,
          title: bookDetails?.title || 'Unknown Title',
          author: bookDetails?.author || 'Unknown Author',
          borrowDate: book.borrowDate,
          dueDate: book.dueDate,
          notes: `Borrowed ${book.quantity} copy`,
          quantity: book.quantity
        };
      });

      existingRecords.push(...newRecords);
      this.storageService.setItem('borrow_records', JSON.stringify(existingRecords));
      
      // ✅ Also update the books in storage to maintain sync
      this.storageService.setItem('books', JSON.stringify(this.books));
      
      console.log('📝 Borrow records and book inventory updated');
    } catch (error) {
      console.error('Error saving borrow records:', error);
      throw error;
    }
  }

  // ✅ Modal and Utility Methods
  onBookClick(book: Book): void {
    this.selectedBook = book;
    this.showBookModal = true;
  }

  onCheckAvailability(book: Book): void {
    this.availabilityInfo = this.getAvailabilityInfo(book);
    this.showAvailabilityModal = true;
  }

  private getAvailabilityInfo(book: Book): AvailabilityInfo {
    if (!book.isAvailable || book.availableCopies === 0) {
      const nextAvailable = new Date();
      const daysUntilAvailable = book.dueDate ? 
        Math.ceil((new Date(book.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 7;
      nextAvailable.setDate(nextAvailable.getDate() + Math.max(daysUntilAvailable, 7));

      return {
        status: 'Unavailable',
        message: `This book is currently borrowed and will be available after ${Math.max(daysUntilAvailable, 7)} days.`,
        nextAvailableDate: nextAvailable.toISOString()
      };
    } else if (book.availableCopies === 1) {
      return {
        status: 'Limited',
        message: `Only 1 copy remaining out of ${book.totalCopies} total copies.`
      };
    } else {
      return {
        status: 'Available',
        message: `${book.availableCopies} of ${book.totalCopies} copies available.`
      };
    }
  }

  closeModal(): void {
    this.showBookModal = false;
    this.showAvailabilityModal = false;
    this.showBorrowConfirmModal = false;
    this.selectedBook = null;
    this.availabilityInfo = null;
  }

  clearSearch(): void {
    this.searchForm.reset({
      query: '',
      searchType: 'all',
      category: '',
      availabilityFilter: 'all',
      sortBy: 'title',
      sortOrder: 'asc'
    });
  }

  // ✅ Helper Methods
  getTotalSelectedCopies(): number {
    return Array.from(this.selectedBooks.values()).reduce((sum, quantity) => sum + quantity, 0);
  }

  getSelectedBookDetails(): Array<{book: Book, quantity: number}> {
    return Array.from(this.selectedBooks.entries()).map(([bookId, quantity]) => ({
      book: this.books.find(b => b.id === bookId)!,
      quantity
    }));
  }

  get calculatedDueDate(): string {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + this.BORROW_PERIOD_DAYS);
    return dueDate.toLocaleDateString();
  }

  getAvailabilityClass(book: Book): string {
    if (!book.isAvailable || book.availableCopies === 0) {
      return 'availability-unavailable';
    } else if (book.availableCopies === 1) {
      return 'availability-limited';
    } else {
      return 'availability-available';
    }
  }

  getAvailabilityText(book: Book): string {
    if (!book.isAvailable || book.availableCopies === 0) {
      return 'Unavailable';
    } else if (book.availableCopies === 1) {
      return 'Limited';
    } else {
      return 'Available';
    }
  }

  private showError(message: string): void {
    this.errorMessage = message;
    this.successMessage = '';
    setTimeout(() => this.clearError(), 5000);
  }

  private showSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = '';
    setTimeout(() => this.clearSuccess(), 8000);
  }

  private clearError(): void {
    this.errorMessage = '';
  }

  private clearSuccess(): void {
    this.successMessage = '';
  }

  // ✅ Navigation
  navigateToMyBooks(): void {
    this.router.navigate(['/my-books']);
  }

  trackByBookId(index: number, book: Book): string {
    return book.id;
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=400&fit=crop';
    }
  }
}
