import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { CookieService } from 'ngx-cookie-service';
import { AuthService } from '../services/auth-service';

export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  if (authService.isUserAdmin()) {
    return true;
  }

  if (!authService.isLoggedIn()) {
      router.navigate(['/login']);
  return false;
  }
  
  router.navigate(['/home']);
  return false;
};
