import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { UserLoginComponent } from './pages/user-login/user-login.component';
import { UserRegisterComponent } from './pages/user-register/user-register.component';
import { CharacterList } from './pages/character-list/character-list';
import { CharacterEditor } from './pages/character-editor/character-editor';
import { CampaignsComponent } from './pages/campaigns/campaigns';
import { ProfileComponent } from './pages/profile/profile';
import { EditProfileComponent } from './pages/edit-profile/edit-profile';
import { authGuard } from './guards/auth.guard';
import { EmailConfirmation } from './pages/email-confirmation/email-confirmation';
import { EmailPending } from './pages/email-pending/email-pending';
import { DiscordAuth } from './callbacks/discord-auth/discord-auth';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'login', component: UserLoginComponent },
  { path: 'cadastro', component: UserRegisterComponent },
  { path: 'emailConfirmation', component: EmailConfirmation },
  { path: 'verificar-email', component: EmailPending },
  { path: 'auth/callback', component: DiscordAuth },

  {
    path: 'perfil',
    component: ProfileComponent,
    canActivate: [authGuard],
  },
  {
    path: 'perfil/editar',
    component: EditProfileComponent,
    canActivate: [authGuard],
  },
  {
    path: 'personagens',
    component: CharacterList,
    canActivate: [authGuard],
  },
  {
    path: 'personagens/:id',
    component: CharacterEditor,
    canActivate: [authGuard],
  },
  {
    path: 'campanhas',
    component: CampaignsComponent,
    canActivate: [authGuard],
  },
  {
    path: 'campanha/:id',
    loadComponent: () =>
      import('./pages/campaign-detail/campaign-detail').then(
        (m) => m.CampaignDetailComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'biblioteca',
    loadComponent: () =>
      import('./pages/library/library').then(
        (m) => m.LibraryComponent
      ),
    canActivate: [authGuard],
  },

  { path: '**', redirectTo: '/home' },
];