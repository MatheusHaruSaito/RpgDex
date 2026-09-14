import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { CookieService } from 'ngx-cookie-service';
import { RegisterUser } from '../../models/registerUser';
import { jwtDecode } from 'jwt-decode';
import { BehaviorSubject, Observable, tap, map, catchError } from 'rxjs';
import { LoginUser } from '../../models/loginUser';
import { JwtPayload } from '../../models/jwtPayload';
import { tokenModel } from '../../models/tokenMode';
import { ApiResponse } from '../../models/apiResponse';
import { UserResponse } from '../../models/userResponse';
import { ValidateEmailByTokenRequest } from '../../models/validateEmailByTokenRequest';
import { ResendEmailVerificationRequest } from '../../models/resendEmailVerificationRequest';
import { AuthOptionsResponse } from '../../models/authOptionsResponse';
import { ValidateTwoFactorRequest } from '../../models/validateTwoFactorRequest';
import { LoginResponse } from '../../models/loginResponse';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly controller = 'Auth';
  private readonly env = `${environment.RpxDexApi}/${this.controller}`;
  private readonly JWT_Token = 'JWTString';
  private readonly REFRESH_Token = 'REFRESHTOKEN';

  private currentUserSubject: BehaviorSubject<any>;
  public currentUser: Observable<any>;

  constructor(
    private http: HttpClient,
    private cookieService: CookieService,
  ) {
    const token = this.cookieService.get(this.JWT_Token);
    const refreshToken = this.cookieService.get(this.REFRESH_Token);

    const initialValue: tokenModel | null = token
      ? { accessToken: token, refreshToken: refreshToken }
      : null;

    this.currentUserSubject = new BehaviorSubject<any>(initialValue);
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue() {
    return this.currentUserSubject.value;
  }

  public GetLoggedUser(): Observable<ApiResponse<UserResponse>> {
    const jwtToken = this.cookieService.get(this.JWT_Token);
    const decodedToken = jwtDecode<JwtPayload>(jwtToken);
    return this.http
      .get<ApiResponse<UserResponse>>(`${environment.RpxDexApi}/User/${decodedToken.sub}`)
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            const currentData = this.currentUserValue || {};
            this.currentUserSubject.next({
              ...currentData,
              ...response.data,
            });
          }
        })
      );
  }

  public Register(authUser: RegisterUser): Observable<boolean> {
    return this.http.post<boolean>(this.env, authUser);
  }

  public Login(user: LoginUser): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.env}/Login`, user).pipe(
      tap((response: ApiResponse<LoginResponse>) => {
        if (response.success && response.data) {
          this.cookieService.set(this.JWT_Token, response.data.accessToken, { path: '/' });
          this.cookieService.set(this.REFRESH_Token, response.data.refreshToken, { path: '/' });
          this.currentUserSubject.next(response.data);
          this.GetLoggedUser().subscribe();
        }
        return response;
      })
    );
  }

  public RefreshToken(): Observable<ApiResponse<tokenModel>> {
    const tokenModel: tokenModel = {
      accessToken: this.cookieService.get(this.JWT_Token) || '',
      refreshToken: this.cookieService.get(this.REFRESH_Token) || '',
    };
    return this.http.post<ApiResponse<tokenModel>>(`${this.env}/RefreshToken`, tokenModel).pipe(
      map((response: ApiResponse<tokenModel>) => {
        if (response.success && response.data?.accessToken) {
          const currentUser = this.currentUserValue || {};
          currentUser.accessToken = response.data.accessToken;
          this.cookieService.set(this.JWT_Token, response.data.accessToken);
          this.currentUserSubject.next(currentUser);
        }
        return response;
      }),
      catchError((error) => {
        this.Logout();
        throw error;
      })
    );
  }

  public getLoggedUserId(): string | undefined {
    const jwtToken = this.cookieService.get(this.JWT_Token);
    if (!jwtToken) return undefined;
    return jwtDecode<JwtPayload>(jwtToken).sub;
  }

  public isLoggedIn(): boolean {
    return this.cookieService.check(this.JWT_Token);
  }

  public Logout(): void {
    this.cookieService.delete(this.JWT_Token, '/');
    this.cookieService.delete(this.REFRESH_Token, '/');
    this.currentUserSubject.next(null);
  }

  public ValidateEmailByToken(
    request: ValidateEmailByTokenRequest,
  ): Observable<ApiResponse<string>> {
    return this.http.put<ApiResponse<string>>(`${this.env}/ValidateEmail`, request);
  }

  public ResendEmailVerification(
    request: ResendEmailVerificationRequest,
  ): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.env}/ResendEmailVerification`, request);
  }

  public GoogleSingUp(Token: string): Observable<ApiResponse<tokenModel>> {
    return this.http.post<ApiResponse<tokenModel>>(`${this.env}/Google/SignUp`, { Token }).pipe(
      map((response: ApiResponse<tokenModel>) => {
        if (response.success && response.data) {
          this.cookieService.set(this.JWT_Token, response.data!.accessToken, { path: '/' });
          this.cookieService.set(this.REFRESH_Token, response.data!.refreshToken, { path: '/' });
          this.currentUserSubject.next(response.data);
          this.GetLoggedUser().subscribe();
        }
        return response;
      })
    );
  }

  public DiscordSingUp(redirectUri?: string): void {
    window.location.href = `${this.env}/discord?redirectUri=${redirectUri}`;
  }

  public StoreToken(accessToken: string, refreshToken: string): void {
    this.cookieService.set(this.JWT_Token, accessToken, { path: '/' });
    this.cookieService.set(this.REFRESH_Token, refreshToken, { path: '/' });
  }

  public GetUserAuthOptions(userId: string): Observable<ApiResponse<AuthOptionsResponse>> {
    return this.http.get<ApiResponse<AuthOptionsResponse>>(`${this.env}/AuthOptions`);
  }

  public ValidateTwoFactor(request: ValidateTwoFactorRequest): Observable<ApiResponse<tokenModel>> {
    return this.http.post<ApiResponse<tokenModel>>(
      `${this.env}/SendTwoFactorAuthEmailRequest/`,
      request,
    );
  }
  public SendTwoFactorAuthEmail(): Observable<ApiResponse<tokenModel>> {
    return this.http.post<ApiResponse<tokenModel>>(`${this.env}/SendTwoFactorAuthEmailRequest`, '');
  }

  public TwoFAActivation(request: ValidateTwoFactorRequest): Observable<ApiResponse<tokenModel>> {
    return this.http.post<ApiResponse<tokenModel>>(`${this.env}/ActiveTwoFactorAuth/`, request);
  }
  public get Token(){
    return this.cookieService.get(this.JWT_Token);
  }
}