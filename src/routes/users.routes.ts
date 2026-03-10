import { Router } from 'express'
import { getMeController, updateAvatarController, updateMeController } from '~/controllers/users.controllers'
import { accessTokenValidator } from '~/middlewares/auths.middlewares'
import { filterMiddleware } from '~/middlewares/common.middlewares'
import { uploadAvatar } from '~/middlewares/uploads.middlewares'
import { updateMeValidator, verifiedUserValidator } from '~/middlewares/users.middlewares'
import { UpdateMeReqBody } from '~/models/requests/User.requests'
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

/**
 * Description: Update my profile
 * Path: /me
 * Method: PATCH
 * Header: { Authorization: Bearer <access_token}
 * Body: UserSchema
 */
usersRouter.patch(
  '/me',
  accessTokenValidator,
  verifiedUserValidator,
  updateMeValidator,
  filterMiddleware<UpdateMeReqBody>(['full_name', 'date_of_birth', 'phone', 'address']),
  wrapRequestHandler(updateMeController)
)

/**
 * Description: Update avatar
 * Path: /me/avatar
 * Method: PATCH
 * Header: { Authorization: Bearer <access_token}
 * Body: form-data
 */
usersRouter.patch(
  '/me/avatar',
  accessTokenValidator,
  verifiedUserValidator,
  uploadAvatar.single('avatar'),
  wrapRequestHandler(updateAvatarController)
)

export default usersRouter
