import { HttpErrorResponse, type HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, throwError } from "rxjs";

import { AuthService } from "../../features/auth/auth.service";

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
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
        authService.clearSession();
        void router.navigateByUrl("/login");
      }

      return throwError(() => error);
    }),
  );
};

