import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { PaymentInitiateResult } from '../../models/paymentInitiateResult';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private readonly controller = 'Payment';
  private readonly env = `${environment.RpxDexApi}/${this.controller}`;
  private http = inject(HttpClient);

  public InitiatePayment(request: { planId: string }): Observable<PaymentInitiateResult> {
    return this.http.post<ApiResponse<PaymentInitiateResult>>(this.env, request).pipe(
      map((res: ApiResponse<PaymentInitiateResult>): PaymentInitiateResult => {
        if (!res?.data) {
          throw new Error('Resposta de pagamento inválida ou sem dados.');
        }
        return res.data;
      })
    );
  }
}