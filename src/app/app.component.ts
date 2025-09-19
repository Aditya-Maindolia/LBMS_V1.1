import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule } from '@angular/router';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'library-management-system';
  showNavBar = true;
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Listen to route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: NavigationEnd) => {
      this.updateNavBarVisibility(event.urlAfterRedirects);
    });

    // Also listen to auth state changes
    this.authService.currentUser$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      this.updateNavBarVisibility(this.router.url);
    });
    
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateNavBarVisibility(url: string): void {
    const isLoggedIn = this.authService.isLoggedIn();
    
    // Show navbar only on login and register pages when user is not logged in
    // Hide navbar on all other pages (especially when logged in)
    if (isLoggedIn) {
      this.showNavBar = false; // Hide navbar for logged-in users
    } else {
      // Show navbar only on login/register pages for non-logged-in users
      this.showNavBar = url === '/login' || url === '/register' || url === '/';
    }
    
    console.log(`URL: ${url}, Logged in: ${isLoggedIn}, Show navbar: ${this.showNavBar}`);
  }
}
