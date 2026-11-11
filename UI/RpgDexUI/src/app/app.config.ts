import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { jwtInterceptor } from './core/interceptors/jwt-interceptor';
import { tokenInterceptor } from './core/interceptors/token-interceptor';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { provideTranslateHttpLoader, TranslateHttpLoader } from '@ngx-translate/http-loader';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideCharts(withDefaultRegisterables()),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withInterceptors([tokenInterceptor, jwtInterceptor])),
    provideTranslateHttpLoader({
      prefix: './i18n/',
      suffix: '.json',
    }),
    provideTranslateService({
      fallbackLang: 'pt',
      loader: {
        provide: TranslateLoader,
        useClass: TranslateHttpLoader,
      },
    }),
  ],
};
