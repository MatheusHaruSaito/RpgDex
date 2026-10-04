import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth-service';
import { ResendEmailVerificationRequest } from '../../../models/resendEmailVerificationRequest';

@Component({
  selector: 'app-email-pending',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './email-pending.html',
  styleUrl: './email-pending.css',
})
export class EmailPending implements OnInit, OnDestroy {
  email = '';
  resendCooldown = 0;
  isResending = false;
  resendSuccess = false;
  resendError = '';

  private cooldownTimer: any;
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  ngOnInit(): void {
    const navigation = this.router.getCurrentNavigation();
    const stateEmail = navigation?.extras?.state?.['email'] || history.state?.['email'];

    if (stateEmail) {
      this.email = stateEmail;
    }
  }

  resend(): void {
    if (this.resendCooldown > 0 || !this.email || this.isResending) return;

    this.isResending = true;
    this.resendSuccess = false;
    this.resendError = '';

    const request: ResendEmailVerificationRequest = { email: this.email };
    this.authService.ResendEmailVerification(request).subscribe({
      next: () => {
        this.isResending = false;
        this.resendSuccess = true;
        this.startCooldown(60);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isResending = false;
        this.resendError = err?.error?.message ?? 'Erro ao reenviar. Tente novamente.';
        this.cdr.detectChanges();
      },
    });
  }

  private startCooldown(seconds: number): void {
    this.resendCooldown = seconds;
    this.cooldownTimer = setInterval(() => {
      this.resendCooldown--;
      this.cdr.detectChanges();
      if (this.resendCooldown <= 0) {
        clearInterval(this.cooldownTimer);
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
    }
  }
}