export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  isbn: string;
  description?: string;
  imageUrl: string;
  availableCopies: number;
  totalCopies: number;
  rating?: number;
  publishYear?: number;
  isAvailable: boolean;
  isPopular?: boolean;
  borrowedBy?: string[];
  returnDate?: string;
  dueDate?: string;
}

export interface PopularBook extends Book {
  borrowCount: number;
  averageRating: number;
}

export interface SearchCriteria {
  author?: string;
  title?: string;
  category?: string;
  bookId?: string;
}

export interface SearchResult {
  books: Book[];
  totalCount: number;
  searchTerm: string;
}

export interface BookCategory {
  id: string;
  name: string;
  count: number;
}

export interface BorrowItem {
  bookId: string;
  quantity: number;
  book?: Book;
}

export interface BorrowRequest {
  libraryId: string;
  borrowItems: BorrowItem[];
  borrowDate: Date;
  dueDate: Date;
}

export interface BorrowResponse {
  success: boolean;
  message: string;
  borrowId?: string;
  dueDate?: string;
  borrowedBooks?: BorrowItem[];
}

