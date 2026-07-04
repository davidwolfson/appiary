import type { Routes } from "@angular/router";

import { authGuard } from "./features/auth/auth.guard";
import { guestGuard } from "./features/auth/guest.guard";
import { LoginComponent } from "./features/auth/login/login.component";
import { RegisterComponent } from "./features/auth/register/register.component";
import { HivesDashboardComponent } from "./features/hives/hives-dashboard.component";

export const appRoutes: Routes = [
  {
    path: "",
    component: HivesDashboardComponent,
    canActivate: [authGuard],
  },
  {
    path: "login",
    component: LoginComponent,
    canActivate: [guestGuard],
  },
  {
    path: "register",
    component: RegisterComponent,
    canActivate: [guestGuard],
  },
  {
    path: "**",
    redirectTo: "",
  },
];
