import { Router } from 'express'
import { registerController, resendVerifyEmailController, verifyEmailController } from '~/controllers/auths.controllers'
import { accessTokenValidator, emailVerifyTokenValidator, registerValidator } from '~/middlewares/auths.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const authsRouter = Router()

/**
 * Description: Register a new user
 * Path: /register
 * Method: POST
 * Body: {full_name: string, email: string, password: string, confirm_password: string date_of_birth: ISO8601}
 */
authsRouter.post('/register', registerValidator, wrapRequestHandler(registerController))

/**
 * Description: Verify email when dev test in postman
 * Path: /verify-email
 * Method: POST
 * Body: {email_verify_token: string}
 */
authsRouter.post('/verify-email', emailVerifyTokenValidator, wrapRequestHandler(verifyEmailController))

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

export default authsRouter
