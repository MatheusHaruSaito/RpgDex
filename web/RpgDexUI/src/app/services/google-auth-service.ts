import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

declare const google: any;

@Injectable({
  providedIn: 'root',
})
export class GoogleAuthService {
  private readonly googleClientId = environment.GoogleClientId;

  initLogin(callback: (response: any) => void) {
    google.accounts.id.initialize({
      client_id: this.googleClientId,
      callback: callback,
    });
  }

  renderButton(elementId: string) {
    google.accounts.id.renderButton(document.getElementById(elementId), {
      theme: 'outline',
      size: 'large',
    });
  }

  prompt() {
    google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        console.log('Prompt do Google não foi exibido:', notification.getNotDisplayedReason());
      }
    });
  }
}
