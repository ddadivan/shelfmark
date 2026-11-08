import { SIGN_IN_ERROR } from './sign-in-error.const';

export type SignInError = (typeof SIGN_IN_ERROR)[keyof typeof SIGN_IN_ERROR];
