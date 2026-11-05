import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Temporary: forces web/e2e to be affected in CI; reverted before merge.
bootstrapApplication(App, appConfig).catch((error: unknown) => console.error(error));
