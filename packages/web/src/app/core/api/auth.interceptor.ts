import { HttpErrorResponse, type HttpInterceptorFn } from "@angular/common/http";
import { inject, Injector } from "@angular/core";
import { catchError, throwError } from "rxjs";

import { AuthService } from "../../features/auth/auth.service";
import { AuthStore } from "../../features/auth/auth.store";

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const injector = inject(Injector);
  const token = authService.getToken();

  const authorizedRequest = token
    ? req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    })
    : req;

  return next(authorizedRequest).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        void injector.get(AuthStore).invalidateSession();
      }

      return throwError(() => error);
    }),
  );
};

