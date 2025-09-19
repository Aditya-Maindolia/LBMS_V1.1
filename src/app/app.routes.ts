import { Routes } from '@angular/router';
import { MemberRegistrationComponent } from './components/member-registration/member-registration.component';
import { LoginComponent } from './components/login/login.component';
import { HomepageComponent } from './components/homepage/homepage.component';


import { DonateBooksComponent } from './components/donate-books/donate-books.component';
import { ComplaintsComponent } from './components/complaints/complaints.component';
import { ProfileComponent } from './components/profile/profile.component';
import { MyBooksComponent } from './components/my-books/my-books.component';
import { BooksComponent } from './components/books/books.component';
import { FinesComponent } from './components/fines/fines.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: MemberRegistrationComponent },
  { path: 'homepage', component: HomepageComponent },
  
  { path: 'borrow', component: BooksComponent }, 
  { path: 'view', component: BooksComponent }, 
  
  { path: 'donate', component: DonateBooksComponent },
  { path: 'complaints', component: ComplaintsComponent },
  { path: 'profile', component: ProfileComponent},
  { path: 'borrowed-returned', component: MyBooksComponent},
  { path: 'fines', component: FinesComponent},
  { path: 'payments', redirectTo: '/fines', pathMatch: 'full' },

];
