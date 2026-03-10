import { Router } from 'express'
import { getMeController } from '~/controllers/users.controllers'
import { accessTokenValidator } from '~/middlewares/auths.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const usersRouter = Router()

/**
 * Description: Get my profile
 * Path: /me
 * Method: GET
 * Header: { Authorization: Bearer <access_token}
 * Body: {}
 */
usersRouter.get('/me', accessTokenValidator, wrapRequestHandler(getMeController))

export default usersRouter
