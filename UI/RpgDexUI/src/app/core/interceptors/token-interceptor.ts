import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { AuthService } from '../../services/auth-service';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { inject } from '@angular/core';
import { ApiResponse } from '../../../models/apiResponse';
import { tokenModel } from '../../../models/tokenMode';
import { Console } from 'node:console';
import { Router } from '@angular/router';

let isRefreshing = false;
const refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const AUTH_ROUTES =
    /\/Auth\/(Login|RefreshToken|Google\/SignUp|discord|ValidateTwoFactor|SendTwoFactorAuthEmailRequest|ValidateEmail|ResendEmailVerification)(\/|\?|$)/i;

  if (AUTH_ROUTES.test(req.url)) {
    return next(req);
  }

  // let authReq = req;
  // if (currentUser?.accessToken) {
  //   authReq = addToken(req, currentUser.accessToken);
  // }
  const token = authService.Token;
  const authReq = token ? addToken(req, token) : req;

  return next(authReq).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return handle401Error(authReq, next, authService);
      }
      if (error instanceof HttpErrorResponse && error.status === 403) {
        return handle403Error(error, authService, router);
      }

      return throwError(() => error);
    }),
  );
};

function addToken(req: HttpRequest<any>, token: string) {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

function handle401Error(req: HttpRequest<any>, next: HttpHandlerFn, authService: AuthService) {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.RefreshToken().pipe(
      switchMap((response: ApiResponse<tokenModel>) => {
        const newAccessToken = response.data?.accessToken;

        if (!newAccessToken) {
          throw new Error('Refresh token does not have returned');
        }

        isRefreshing = false;

        refreshTokenSubject.next(newAccessToken);

        return next(addToken(req, newAccessToken));
      }),

      catchError((err) => {
        console.error('Error refreshing token:', err);
        isRefreshing = false;
        authService.Logout();
        return throwError(() => err);
      }),
    );
  }

  return refreshTokenSubject.pipe(
    filter((token): token is string => token !== null),
    take(1),
    switchMap((accessToken) => {
      return next(addToken(req, accessToken));
    }),
  );
}
function handle403Error(error: HttpErrorResponse, authService: AuthService, router: Router) {
  const status = authService.getLoggedUserAgeStatus();
  if (status === 'unverified' && !router.url.startsWith('/age-verification')) {
    router.navigate(['/age-verification']);
  } else if (status === 'pending' && !router.url.startsWith('/age-pending')) {
    router.navigate(['/age-pending']);
  }

  // sempre devolve um Observable, propagando o erro para quem chamou
  return throwError(() => error);
}
