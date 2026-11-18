import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-discord-auth',
  imports: [],
  templateUrl: './discord-auth.html',
  styleUrl: './discord-auth.css',
})
export class DiscordAuth {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    // Captura os parâmetros token da URL
    this.route.queryParams.subscribe((params) => {
      const token = params['token'];
      const refreshToken = params['refreshToken'];
      const error = params['error'];
      const redirectTo = params['redirectPage'] ?? '/';

      if (token) {
        this.authService.StoreToken(token, refreshToken);

        // Redireciona o usuário para a tela principal/dashboard da sua app
        this.router.navigate([redirectTo]);
      } else {
        console.error('Erro na autenticação:', error);
        this.router.navigate(['/login']);
      }
    });
  }
}
