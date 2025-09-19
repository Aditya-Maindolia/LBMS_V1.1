import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import {
  Book,
  SearchCriteria,
  SearchResult,
  BookCategory,
} from '../models/book.model';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class BookService {
  private apiUrl = 'http://localhost:8080/api/books';
  
  // ✅ Add BehaviorSubject for real-time sync
  private booksSubject = new BehaviorSubject<Book[]>([]);
  public books$ = this.booksSubject.asObservable();

  constructor(private storageService: StorageService) {
    this.initializeBooks();
  }

  // ✅ Initialize books from storage or create mock data
  private initializeBooks(): void {
    let books = this.getStoredBooks();
    if (books.length === 0) {
      books = this.createMockBooks();
      this.saveBooks(books);
    }
    this.booksSubject.next(books);
  }

  // ✅ Get books from storage
  private getStoredBooks(): Book[] {
    try {
      const stored = this.storageService.getItem('books');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // ✅ Save books to storage and update subject
  private saveBooks(books: Book[]): void {
    this.storageService.setItem('books', JSON.stringify(books));
    this.booksSubject.next(books);
  }

  // ✅ Create comprehensive mock book database
  private createMockBooks(): Book[] {
    return [
      {
        id: 'BK001',
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        category: 'Classic Literature',
        isbn: '978-0-7432-7356-5',
        description: 'A classic American novel set in the Jazz Age',
        imageUrl:
          'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=400&fit=crop',
        availableCopies: 8,
        totalCopies: 10,
        rating: 4.5,
        publishYear: 1925,
        isAvailable: true,
        borrowedBy: ['user1', 'user2'],
        returnDate: '2025-09-20',
      },
      {
        id: 'BK002',
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        category: 'Classic Literature',
        isbn: '978-0-06-112008-4',
        description:
          'A gripping tale of racial injustice and childhood innocence',
        imageUrl:
          'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=400&fit=crop',
        availableCopies: 5,
        totalCopies: 8,
        rating: 4.8,
        publishYear: 1960,
        isAvailable: true,
        borrowedBy: ['user3', 'user4', 'user5'],
        dueDate: '2025-09-13',
      },
      {
        id: 'BK003',
        title: '1984',
        author: 'George Orwell',
        category: 'Dystopian Fiction',
        isbn: '978-0-452-28423-4',
        description: 'A dystopian social science fiction novel',
        imageUrl:
          'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=300&h=400&fit=crop',
        availableCopies: 12,
        totalCopies: 15,
        rating: 4.6,
        publishYear: 1949,
        isAvailable: true,
      },
      {
        id: 'BK004',
        title: 'Angular Complete Guide',
        author: 'John Smith',
        category: 'Programming',
        isbn: '978-1-234-56789-0',
        description: 'Complete guide to Angular development',
        imageUrl:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop',
        availableCopies: 6,
        totalCopies: 10,
        rating: 4.7,
        publishYear: 2023,
        isAvailable: true,
      },
      {
        id: 'BK005',
        title: 'JavaScript: The Good Parts',
        author: 'Douglas Crockford',
        category: 'Programming',
        isbn: '978-0-596-51774-8',
        description: 'Essential JavaScript programming concepts',
        imageUrl:
          'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=300&h=400&fit=crop',
        availableCopies: 3,
        totalCopies: 6,
        rating: 4.4,
        publishYear: 2008,
        isAvailable: true,
      },
      {
        id: 'BK006',
        title: 'Out of Stock Book',
        author: 'Test Author',
        category: 'Fiction',
        isbn: '978-0-000-00000-0',
        description: 'This book is currently unavailable',
        imageUrl:
          'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&h=400&fit=crop',
        availableCopies: 0,
        totalCopies: 5,
        rating: 3.8,
        publishYear: 2020,
        isAvailable: false,
      },
      // ✅ Add more books for better testing
      {
        id: 'BK007',
        title: 'Pride and Prejudice',
        author: 'Jane Austen',
        category: 'Romance',
        isbn: '978-0-14-143951-8',
        description: 'A romantic novel of manners',
        imageUrl:
          'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=400&fit=crop',
        availableCopies: 4,
        totalCopies: 7,
        rating: 4.4,
        publishYear: 1813,
        isAvailable: true,
      },
      {
        id: 'BK008',
        title: 'The Catcher in the Rye',
        author: 'J.D. Salinger',
        category: 'Classic Literature',
        isbn: '978-0-316-76948-0',
        description: 'A controversial coming-of-age story',
        imageUrl:
          'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=400&fit=crop',
        availableCopies: 2,
        totalCopies: 6,
        rating: 3.9,
        publishYear: 1951,
        isAvailable: true,
      },
      {
        id: 'BK009',
        title: 'React Handbook',
        author: 'Sarah Johnson',
        category: 'Programming',
        isbn: '978-1-987-65432-1',
        description: 'Modern React development techniques',
        imageUrl:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop',
        availableCopies: 7,
        totalCopies: 9,
        rating: 4.6,
        publishYear: 2024,
        isAvailable: true,
      },
      {
        id: 'BK010',
        title: 'The Hobbit',
        author: 'J.R.R. Tolkien',
        category: 'Fantasy',
        isbn: '978-0-547-92822-7',
        description: 'An unexpected journey of adventure',
        imageUrl:
          'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=400&fit=crop',
        availableCopies: 9,
        totalCopies: 12,
        rating: 4.8,
        publishYear: 1937,
        isAvailable: true,
      }
    ];
  }

  // ✅ Get all books (returns observable for real-time updates)
  getAllBooks(): Observable<Book[]> {
    return this.books$;
  }

  // ✅ Search books with existing logic
  searchBooks(criteria: SearchCriteria): Observable<SearchResult> {
    console.log('Searching books with criteria:', criteria);

    return this.books$.pipe(
      map(books => {
        let filteredBooks = [...books]; // Use current books from BehaviorSubject

        // Filter by author
        if (criteria.author && criteria.author.trim()) {
          const authorQuery = criteria.author.toLowerCase().trim();
          filteredBooks = filteredBooks.filter((book) =>
            book.author.toLowerCase().includes(authorQuery)
          );
        }

        // Filter by title
        if (criteria.title && criteria.title.trim()) {
          const titleQuery = criteria.title.toLowerCase().trim();
          filteredBooks = filteredBooks.filter((book) =>
            book.title.toLowerCase().includes(titleQuery)
          );
        }

        // Filter by category
        if (criteria.category && criteria.category.trim()) {
          const categoryQuery = criteria.category.toLowerCase().trim();
          filteredBooks = filteredBooks.filter((book) =>
            book.category.toLowerCase().includes(categoryQuery)
          );
        }

        // Filter by book ID
        if (criteria.bookId && criteria.bookId.trim()) {
          const idQuery = criteria.bookId.toUpperCase().trim();
          filteredBooks = filteredBooks.filter((book) =>
            book.id.toUpperCase().includes(idQuery)
          );
        }

        const result: SearchResult = {
          books: filteredBooks,
          totalCount: filteredBooks.length,
          searchTerm: this.generateSearchTerm(criteria),
        };

        console.log('Search results:', result);
        return result;
      }),
      delay(300) // Simulate network delay
    );
  }

  // ✅ Get book categories with real-time updates
  getBookCategories(): Observable<BookCategory[]> {
    return this.books$.pipe(
      map(books => {
        const categories = books.reduce((acc, book) => {
          const existing = acc.find((cat) => cat.name === book.category);
          if (existing) {
            existing.count++;
          } else {
            acc.push({
              id: book.category.toLowerCase().replace(/\s+/g, '-'),
              name: book.category,
              count: 1,
            });
          }
          return acc;
        }, [] as BookCategory[]);

        return categories;
      }),
      delay(100)
    );
  }

  // ✅ Get book by ID with real-time updates
  getBookById(id: string): Observable<Book | null> {
    return this.books$.pipe(
      map(books => {
        const book = books.find((b) => b.id === id);
        return book || null;
      }),
      delay(200)
    );
  }

  // ✅ Get popular books with real-time updates
  getPopularBooks(): Observable<Book[]> {
    return this.books$.pipe(
      map(books => 
        books.filter((book) => book.rating && book.rating > 4.0)
      ),
      delay(500)
    );
  }

  // ✅ Update single book availability and sync across all components
  updateBookAvailability(bookId: string, availableCopies: number): void {
    const books = this.booksSubject.value;
    const bookIndex = books.findIndex(book => book.id === bookId);
    
    if (bookIndex !== -1) {
      books[bookIndex].availableCopies = availableCopies;
      books[bookIndex].isAvailable = availableCopies > 0;
      
      // Update borrowed info if needed
      books[bookIndex].borrowedBy = books[bookIndex].borrowedBy || [];
      
      this.saveBooks(books);
      console.log(`📚 Book ${bookId} availability updated: ${availableCopies} copies`);
    }
  }

  // ✅ Bulk update for multiple books (used during borrowing)
  updateMultipleBooksAvailability(updates: { bookId: string, availableCopies: number }[]): void {
    const books = this.booksSubject.value;
    let hasChanges = false;
    
    updates.forEach(update => {
      const bookIndex = books.findIndex(book => book.id === update.bookId);
      if (bookIndex !== -1) {
        books[bookIndex].availableCopies = update.availableCopies;
        books[bookIndex].isAvailable = update.availableCopies > 0;
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      this.saveBooks(books);
      console.log('📚 Multiple books availability updated');
    }
  }

  // ✅ Legacy method for backward compatibility
  updateBookInventory(bookId: string, quantityBorrowed: number): Observable<boolean> {
    const books = this.booksSubject.value;
    const book = books.find(b => b.id === bookId);
    
    if (book) {
      const newAvailableCopies = Math.max(0, book.availableCopies - quantityBorrowed);
      this.updateBookAvailability(bookId, newAvailableCopies);
      
      console.log(`Updated inventory: Book ${bookId}, borrowed: ${quantityBorrowed}`);
      return of(true).pipe(delay(300));
    }
    
    return of(false).pipe(delay(300));
  }

  // ✅ Borrow books method with real-time sync
  borrowBooks(bookIds: string[], quantities: number[]): Observable<boolean> {
    try {
      const books = this.booksSubject.value;
      const updates: { bookId: string, availableCopies: number }[] = [];
      
      for (let i = 0; i < bookIds.length; i++) {
        const bookId = bookIds[i];
        const quantity = quantities[i] || 1;
        const book = books.find(b => b.id === bookId);
        
        if (book && book.availableCopies >= quantity) {
          updates.push({
            bookId,
            availableCopies: book.availableCopies - quantity
          });
        } else {
          console.error(`Not enough copies available for book ${bookId}`);
          return of(false).pipe(delay(300));
        }
      }
      
      // Apply all updates
      this.updateMultipleBooksAvailability(updates);
      
      console.log('✅ Books borrowed successfully:', bookIds);
      return of(true).pipe(delay(300));
      
    } catch (error) {
      console.error('Error borrowing books:', error);
      return of(false).pipe(delay(300));
    }
  }

  // ✅ Return books method with real-time sync
  returnBooks(bookIds: string[], quantities: number[]): Observable<boolean> {
    try {
      const books = this.booksSubject.value;
      const updates: { bookId: string, availableCopies: number }[] = [];
      
      for (let i = 0; i < bookIds.length; i++) {
        const bookId = bookIds[i];
        const quantity = quantities[i] || 1;
        const book = books.find(b => b.id === bookId);
        
        if (book) {
          const newAvailableCopies = Math.min(book.totalCopies, book.availableCopies + quantity);
          updates.push({
            bookId,
            availableCopies: newAvailableCopies
          });
        }
      }
      
      // Apply all updates
      this.updateMultipleBooksAvailability(updates);
      
      console.log('✅ Books returned successfully:', bookIds);
      return of(true).pipe(delay(300));
      
    } catch (error) {
      console.error('Error returning books:', error);
      return of(false).pipe(delay(300));
    }
  }

  // ✅ Force refresh books from storage (useful for manual sync)
  refreshBooks(): void {
    const books = this.getStoredBooks();
    if (books.length > 0) {
      this.booksSubject.next(books);
      console.log('📚 Books refreshed from storage');
    }
  }

  // ✅ Get books by category with real-time updates
  getBooksByCategory(category: string): Observable<Book[]> {
    return this.books$.pipe(
      map(books => 
        books.filter(book => 
          book.category.toLowerCase() === category.toLowerCase()
        )
      ),
      delay(200)
    );
  }

  // ✅ Get available books only
  getAvailableBooks(): Observable<Book[]> {
    return this.books$.pipe(
      map(books => 
        books.filter(book => book.isAvailable && book.availableCopies > 0)
      ),
      delay(200)
    );
  }

  // ✅ Search books by multiple criteria (enhanced search)
  searchBooksAdvanced(query: string, category?: string, availability?: 'all' | 'available' | 'unavailable'): Observable<SearchResult> {
    return this.books$.pipe(
      map(books => {
        let filteredBooks = [...books];

        // Text search across multiple fields
        if (query && query.trim()) {
          const searchQuery = query.toLowerCase().trim();
          filteredBooks = filteredBooks.filter(book =>
            book.title.toLowerCase().includes(searchQuery) ||
            book.author.toLowerCase().includes(searchQuery) ||
            book.category.toLowerCase().includes(searchQuery) ||
            book.id.toLowerCase().includes(searchQuery) ||
            (book.description && book.description.toLowerCase().includes(searchQuery))
          );
        }

        // Category filter
        if (category && category !== 'all') {
          filteredBooks = filteredBooks.filter(book =>
            book.category.toLowerCase() === category.toLowerCase()
          );
        }

        // Availability filter
        if (availability && availability !== 'all') {
          if (availability === 'available') {
            filteredBooks = filteredBooks.filter(book => book.isAvailable && book.availableCopies > 0);
          } else if (availability === 'unavailable') {
            filteredBooks = filteredBooks.filter(book => !book.isAvailable || book.availableCopies === 0);
          }
        }

        return {
          books: filteredBooks,
          totalCount: filteredBooks.length,
          searchTerm: query || 'Advanced Search'
        };
      }),
      delay(300)
    );
  }

  // ✅ Private helper method
  private generateSearchTerm(criteria: SearchCriteria): string {
    const terms: string[] = [];
    if (criteria.author) terms.push(`Author: ${criteria.author}`);
    if (criteria.title) terms.push(`Title: ${criteria.title}`);
    if (criteria.category) terms.push(`Category: ${criteria.category}`);
    if (criteria.bookId) terms.push(`ID: ${criteria.bookId}`);
    return terms.join(', ') || 'All Books';
  }

  // ✅ Statistics methods
  getTotalBooks(): Observable<number> {
    return this.books$.pipe(
      map(books => books.length)
    );
  }

  getAvailableBooksCount(): Observable<number> {
    return this.books$.pipe(
      map(books => books.filter(book => book.isAvailable && book.availableCopies > 0).length)
    );
  }

  getUnavailableBooksCount(): Observable<number> {
    return this.books$.pipe(
      map(books => books.filter(book => !book.isAvailable || book.availableCopies === 0).length)
    );
  }

  // ✅ Reset books to initial state (useful for testing)
  resetBooks(): void {
    const initialBooks = this.createMockBooks();
    this.saveBooks(initialBooks);
    console.log('📚 Books reset to initial state');
  }

  private calculateTotalFines(memberId: string): number {
  // Calculate total fines for user
  const borrowRecords = JSON.parse(localStorage.getItem('borrow_records') || '[]');
  let totalFines = 0;

  borrowRecords
    .filter((record: any) => record.memberId === memberId && !record.returnDate)
    .forEach((record: any) => {
      if (record.dueDate && new Date(record.dueDate) < new Date()) {
        const daysOverdue = Math.ceil(
          (new Date().getTime() - new Date(record.dueDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        totalFines += daysOverdue * 5; // ₹5 per day
      }
    });

  return totalFines;
}


}
