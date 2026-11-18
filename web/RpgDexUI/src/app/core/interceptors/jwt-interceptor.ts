import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from '../../services/auth-service';
import { inject } from '@angular/core';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  let currentUser = authService.currentUserValue;
  if (currentUser && currentUser.accessToken) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${currentUser.accessToken}`,
      },
    });
    return next(authReq);
  }
  return next(req);
};
