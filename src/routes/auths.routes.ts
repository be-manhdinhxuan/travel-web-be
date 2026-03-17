import { Router } from 'express'
import {
  forgotPasswordController,
  loginController,
  logoutController,
  refreshTokenController,
  registerController,
  resendVerifyEmailController,
  resetPasswordController,
  verifyEmailController,
  verifyForgotPasswordController
} from '~/controllers/auths.controllers'
import {
  accessTokenValidator,
  emailVerifyTokenValidator,
  forgotPasswordValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  resetPasswordValidator,
  verifyForgotPasswordTokenValidator
} from '~/middlewares/auths.middlewares'
import { checkAllowedFields } from '~/middlewares/common.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const authsRouter = Router()

/**
 * Description: Register a new user
 * Path: /register
 * Method: POST
 * Body: {full_name: string, email: string, password: string, confirm_password: string date_of_birth: ISO8601}
 */
authsRouter.post(
  '/register',
  checkAllowedFields(['full_name', 'email', 'password', 'confirm_password', 'date_of_birth']),
  registerValidator,
  wrapRequestHandler(registerController)
)

/**
 * Description: Verify email when dev test in postman
 * Path: /verify-email
 * Method: POST
 * Body: {email_verify_token: string}
 */
authsRouter.post(
  '/verify-email',
  checkAllowedFields(['email_verify_token']),
  emailVerifyTokenValidator,
  wrapRequestHandler(verifyEmailController)
)

/**
 * Description: Verify email when user client click on the link in email
 * Path: /verify-email
 * Method: GET
 * Body: {email_verify_token: string}
 */
authsRouter.get('/verify-email', emailVerifyTokenValidator, wrapRequestHandler(verifyEmailController))

/**
 * Description: Verify email when user client click on the link in email
 * Path: /resend-verify-email
 * Method: POST
 * Header: {Authorization : Bearer <access_token>}
 * Body: {}
 */
authsRouter.post('/resend-verify-email', accessTokenValidator, wrapRequestHandler(resendVerifyEmailController))

/**
 * Description: Login a user
 * Path: /login
 * Method: POST
 * Body: {email: string, password: string}
 */
authsRouter.post(
  '/login',
  checkAllowedFields(['email', 'password']),
  loginValidator,
  wrapRequestHandler(loginController)
)

/**
 * Description: Logout a user
 * Path: /logout
 * Method: POST
 * Header: {Authorization: Bearer <access_token>}
 * Body: {refresh_token: string}
 */
authsRouter.post(
  '/logout',
  checkAllowedFields(['refresh_token']),
  accessTokenValidator,
  refreshTokenValidator,
  wrapRequestHandler(logoutController)
)

/**
 * Description: Refresh token
 * Path: /refresh-token
 * Method: POST
 * Body: {refresh_token: string}
 */
authsRouter.post(
  '/refresh-token',
  checkAllowedFields(['refresh_token']),
  refreshTokenValidator,
  wrapRequestHandler(refreshTokenController)
)

/**
 * Description: Submit email to reset password, send email to user
 * Path: /forgot-passwor
 * Method: POST
 * Body: {email: string}
 */
authsRouter.post(
  '/forgot-password',
  checkAllowedFields(['email']),
  forgotPasswordValidator,
  wrapRequestHandler(forgotPasswordController)
)

/**
 * Description: Verify link in email to reset password
 * Path: /verify-forgot-password
 * Method: POST
 * Body: {forgot_password_token: string}
 */
authsRouter.post(
  '/verify-forgot-password',
  verifyForgotPasswordTokenValidator,
  wrapRequestHandler(verifyForgotPasswordController)
)

/**
 * Description: Reset password
 * Path: /reset-password
 * Method: POST
 * Body: {forgot_password_token: string, password: string, confirm_password: string}
 */
authsRouter.post(
  '/reset-password',
  checkAllowedFields(['forgot_password_token', 'password', 'confirm_password']),
  resetPasswordValidator,
  wrapRequestHandler(resetPasswordController)
)

export default authsRouter
