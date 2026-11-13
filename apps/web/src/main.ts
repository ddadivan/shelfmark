import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { startLandingLoad } from './app/core/routing/start-landing-load';

startLandingLoad();
bootstrapApplication(App, appConfig).catch((error: unknown) => console.error(error));
