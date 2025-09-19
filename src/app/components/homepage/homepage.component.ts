import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { BookService } from '../../services/book.service';
import { AuthUser } from '../../models/auth.model';
import { Book } from '../../models/book.model';
import { NavbarComponent } from "../navbar/navbar.component";

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent],
  templateUrl: './homepage.component.html',
  styleUrls: ['./homepage.component.css']
})
export class HomepageComponent implements OnInit, OnDestroy {
  currentUser: AuthUser | null = null;
  popularBooks: Book[] = [];
  searchType: string = 'title';  // ✅ Add this
  searchQuery: string = '';
  showProfileDropdown = false;
  showMobileMenu = false;
  isLoading = true;
  private userSubscription: Subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private bookService: BookService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check if user is logged in
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (!user) {
        this.router.navigate(['/login']);
      }
    });

    // Load popular books
    this.loadPopularBooks();
  }

  ngOnDestroy(): void {
    this.userSubscription.unsubscribe();
  }

  private loadPopularBooks(): void {
    this.isLoading = true;
    this.bookService.getPopularBooks().subscribe({
      next: (books) => {
        this.popularBooks = books;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading popular books:', error);
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
  if (this.searchQuery.trim()) {
    // Navigate to search page with the query as a parameter
    this.router.navigate(['/search'], { 
      queryParams: { 
        q: this.searchQuery,
        searchType: 'title'  // Default search type
      } 
    });
  } else {
    // If no query, just go to search page
    this.router.navigate(['/search']);
  }
}


  toggleProfileDropdown(): void {
    this.showProfileDropdown = !this.showProfileDropdown;
  }

  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
  }

  navigateToProfile(): void {
    this.showProfileDropdown = false;
    this.router.navigate(['/profile']);
  }

  navigateToViewBooks(): void {
    this.router.navigate(['/view']);
  }

  navigateToBorrowBooks(): void {
    this.router.navigate(['/borrow']);
  }

  navigateToBorrowedBooks(): void {
    this.router.navigate(['/borrowed-returned']);
  }

  navigateToDonateBooks(): void {
    this.router.navigate(['/donate']);
  }

  navigateToComplaints(): void {
    this.router.navigate(['/complaints']);
  }

  logout(): void {
    this.showProfileDropdown = false;
    this.authService.logout();
  }

  borrowBook(book: Book): void {
    if (book.isAvailable && book.availableCopies > 0) {
      this.router.navigate(['/borrow'], { queryParams: { bookId: book.id } });
    }
  }

  viewBookDetails(book: Book): void {
    this.router.navigate(['/view', book.id]);
  }

  closeDropdowns(): void {
    this.showProfileDropdown = false;
  }

  getStarArray(rating: number): number[] {
    return Array(Math.floor(rating)).fill(0);
  }

  getEmptyStarArray(rating: number): number[] {
    return Array(5 - Math.floor(rating)).fill(0);
  }

  hasHalfStar(rating: number): boolean {
    return rating % 1 !== 0;
  }

  // Fix for the image error event
  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'https://images.pexels.com/photos/256559/pexels-photo-256559.jpeg';
    }
  }
}
