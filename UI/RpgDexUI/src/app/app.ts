import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { NavbarComponent } from './shared/navbar/navbar';
import { FooterComponent } from './shared/footer/footer';
import { NavigationService } from './services/navigation-service';
import { AuthService } from './services/auth-service';
import { AgeVerificationModalComponent } from './modals/age-verification-modal/age-verification-modal';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    NavbarComponent,
    FooterComponent,
    AgeVerificationModalComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent implements OnInit {
  title = 'rpgdex';

  private router = inject(Router);
  private authService = inject(AuthService);
  public navigationService = inject(NavigationService);

  showBackButton = false;
  showAgeVerificationModal = signal<boolean>(false);
  isGuardianConsentPending = signal<boolean>(false);
  private ageModalDismissed = false;

  // Rotas onde o botão "Voltar" fica escondido
  private backButtonHiddenRoutes = [
    '/',
    '/home',
    '/login',
    '/cadastro',
    '/verificar-email',
    '/emailConfirmation',
    '/guardianConsent',
    '/esqueci-senha',
    '/resetPassword',
    '/auth/callback',
  ];

  // Rotas onde o modal de verificação de idade NÃO deve interromper o fluxo
  private modalExcludedRoutes = [
    '/login',
    '/cadastro',
    '/verificar-email',
    '/emailConfirmation',
    '/guardianConsent',
    '/esqueci-senha',
    '/resetPassword',
    '/auth/callback',
  ];

  constructor(private translate: TranslateService) {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const currentUrl = event.urlAfterRedirects.split('?')[0];
        this.showBackButton = !this.backButtonHiddenRoutes.includes(currentUrl);
        this.evaluateAgeModal(currentUrl);
      });
  }

  ngOnInit(): void {
    this.translate.addLangs(['en', 'pt']);
    this.translate.setFallbackLang('pt');

    const browserLang = this.translate.getBrowserLang();
    this.translate.use(browserLang?.match(/en|pt/) ? browserLang : 'pt');

    this.evaluateAgeModal(this.router.url.split('?')[0]);

    this.authService.currentUser.subscribe(() => {
      this.evaluateAgeModal(this.router.url.split('?')[0]);
    });
  }

  private evaluateAgeModal(currentUrl: string): void {
    if (this.ageModalDismissed || !this.authService.isLoggedIn()) {
      this.showAgeVerificationModal.set(false);
      return;
    }

    const isExcludedRoute = this.modalExcludedRoutes.some((route) =>
      currentUrl.startsWith(route),
    );

    if (isExcludedRoute) {
      this.showAgeVerificationModal.set(false);
      return;
    }

    const status = this.authService.getLoggedUserAgeStatus()?.toLowerCase();
    this.isGuardianConsentPending.set(status === 'pending');
    this.showAgeVerificationModal.set(status === 'unverified' || status === 'pending');
  }

  onAgeModalClose(): void {
    this.ageModalDismissed = true;
    this.showAgeVerificationModal.set(false);
  }

  goBack(): void {
    this.navigationService.back('/campanhas');
  }
}