/**
 * Public auth-module entry point.
 *
 * Re-exports the auth module and the supporting services so that
 * `AppModule` can import `AuthModule` and the development bootstrap
 * command can consume `AuthService` and `PasswordService`.
 */

export { AuthModule } from './auth.module.js';
export { AuthController } from './auth.controller.js';
export { AuthService } from './auth.service.js';
export { PasswordService } from './password.service.js';
export { SessionTokenService } from './session-token.service.js';
export { CsrfService } from './csrf.service.js';
export {
  SESSION_COOKIE_NAME,
  CSRF_HEADER_NAME,
  SESSION_ABSOLUTE_TTL_MS,
  SESSION_IDLE_TOUCH_INTERVAL_MS,
  SESSION_ROTATION_INTERVAL_MS,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from './auth.constants.js';
