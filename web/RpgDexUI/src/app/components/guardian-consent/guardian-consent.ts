import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-guardian-consent',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './guardian-consent.html',
  styleUrl: './guardian-consent.css',
})
export class GuardianConsentComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  status = signal<'loading' | 'success' | 'error'>('loading');
  errorMessage = signal<string>('Não foi possível validar a autorização.');
  private alreadyRequested = false;

  ngOnInit(): void {
    if (this.alreadyRequested) return;
    this.alreadyRequested = true;

    const queryMap = this.route.snapshot.queryParamMap;
    const userId = queryMap.get('userId') || queryMap.get('userid') || '';
    const rawToken = queryMap.get('token') || '';
    const token = rawToken.replace(/ /g, '+');

    if (!userId || !token) {
      this.status.set('error');
      this.errorMessage.set('Parâmetros de autorização ausentes na URL.');
      return;
    }

    this.authService.GuardianConsent({ userId, token }).subscribe({
      next: (res) => {
        if (res.success) {
          this.authService.Logout()
          this.status.set('success');
        } else {
          this.status.set('error');
          this.errorMessage.set(res.message || 'Falha ao confirmar consentimento.');
        }
      },
      error: (err) => {
        this.status.set('error');
        this.errorMessage.set(err?.error?.message || 'Token inválido ou expirado.');
      },
    });
  }
}