import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-guardian-consent',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="consent-wrapper">
      <div class="consent-card">
        @if (status() === 'loading') {
          <i class="fa-solid fa-spinner fa-spin status-icon"></i>
          <h1>Validando autorização...</h1>
          <p>Aguarde enquanto confirmamos o consentimento do responsável.</p>
        } @else if (status() === 'success') {
          <i class="fa-solid fa-circle-check status-icon success"></i>
          <h1>Consentimento Confirmado!</h1>
          <p>A conta do menor foi autorizada com sucesso no RPGDex.</p>
          <a routerLink="/login" class="btn-consent">Ir para o RPGDex</a>
        } @else {
          <i class="fa-solid fa-circle-xmark status-icon error"></i>
          <h1>Link Inválido ou Expirado</h1>
          <p>{{ errorMessage() }}</p>
          <a routerLink="/home" class="btn-consent">Voltar ao Início</a>
        }
      </div>
    </div>
  `,
})
export class GuardianConsentComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  status = signal<'loading' | 'success' | 'error'>('loading');
  errorMessage = signal<string>('Não foi possível validar a autorização.');

  ngOnInit(): void {
    const userId = this.route.snapshot.queryParamMap.get('userId') || '';
    const token = this.route.snapshot.queryParamMap.get('token') || '';

    if (!userId || !token) {
      this.status.set('error');
      this.errorMessage.set('Parâmetros de autorização ausentes na URL.');
      return;
    }

    this.authService.GuardianConsent({ userId, token }).subscribe({
      next: (res) => {
        if (res.success) {
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