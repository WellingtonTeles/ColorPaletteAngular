import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { FirebaseAuthService } from '../services/firebase-auth.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private firebaseAuth: FirebaseAuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    // Dev bypass: allow route access in non-production to validate UI without Firebase login
    if (!environment.production) {
      return true;
    }
    if (this.firebaseAuth.isLoggedIn()) {
      return true;
    } else {
      this.router.navigate(['/login']);
      return false;
    }
  }
}