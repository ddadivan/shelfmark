import { APP_PATH } from '../../../models/app-path.const';

/** Absolute paths the auth flow navigates to. */
export const AUTH_ROUTE = {
  Home: '/',
  SignIn: `/${APP_PATH.SignIn}`,
} as const;
