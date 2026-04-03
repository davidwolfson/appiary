import { bootstrapApplication } from "@angular/platform-browser";

import { AppComponent } from "./app/app.component";
import { appConfig } from "./app/core/config/app.config";

bootstrapApplication(AppComponent, appConfig).catch((error) => {
  console.error(error);
});

