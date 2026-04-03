import { APP_INITIALIZER, type ApplicationConfig, provideZonelessChangeDetection } from "@angular/core";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { provideRouter } from "@angular/router";

import { appRoutes } from "../../app.routes";
import { AuthStore } from "../../features/auth/auth.store";
import { authInterceptor } from "../api/auth.interceptor";

function initializeAuth(authStore: AuthStore) {
  return () => authStore.initialize();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthStore],
      multi: true,
    },
  ],
};
