import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { NavbarComponent } from './shared/navbar/navbar';
import { FooterComponent } from './shared/footer/footer';
import { NavigationService } from './services/navigation-service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent implements OnInit {
  title = 'rpgdex';

  private router = inject(Router);
  public navigationService = inject(NavigationService);

  showBackButton = false;

  private hiddenRoutes = [
    '/',
    '/home',
    '/login',
    '/cadastro',
    '/verificar-email',
    '/emailConfirmation',
    '/auth/callback',
  ];

  constructor(private translate: TranslateService) {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const currentUrl = event.urlAfterRedirects.split('?')[0];
        this.showBackButton = !this.hiddenRoutes.includes(currentUrl);
      });
  }
  ngOnInit(): void {
    this.translate.addLangs(['en', 'pt']);

    this.translate.setFallbackLang('pt');

    const browserLang = this.translate.getBrowserLang();
    this.translate.use(browserLang?.match(/en|pt/) ? browserLang : 'pt');
  }

  goBack(): void {
    this.navigationService.back('/campanhas');
  }
}
