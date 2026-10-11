import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth-service';
import { ErrorHandlerUtil } from '../../utils/error-handler.util';

@Component({
  selector: 'app-email-confirmation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './email-confirmation.html',
  styleUrl: './email-confirmation.css',
})
export class EmailConfirmation implements OnInit {
  userid: string | null = null;
  token: string | null = null;
  message: string | undefined = 'Aguardando Verificação de Email...';

  /** Controla qual estado visual exibir: waiting | success | error */
  state: 'waiting' | 'success' | 'error' = 'waiting';

  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private translateService = inject(TranslateService);

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      this.userid = params.get('userid');
      this.token = params.get('token');

      if (this.userid && this.token) {
        const request: { userId: string; token: string } = {
          userId: this.userid,
          token: this.token,
        };

        this.authService.ValidateEmailByToken(request).subscribe({
          next: (response) => {
            this.message = response.data || 'E-mail verificado com sucesso!';
            this.state = 'success';
            this.cdr.detectChanges();
          },
          error: (error) => {
            ErrorHandlerUtil.parseApiError(error, this.translateService, (msg) => {
              this.message = msg;
              this.state = 'error';
              this.cdr.detectChanges();
            });
          },
        });
      } else {
        this.message = 'Link de confirmação inválido ou incompleto.';
        this.state = 'error';
        this.cdr.detectChanges();
      }
    });
  }

  backToLogin() {
    this.router.navigate(['/login']);
  }
}