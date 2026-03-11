import { Router } from 'express'
import {
  changePasswordController,
  getMeController,
  getMyWishlistController,
  toggleWishlistController,
  updateAvatarController,
  updateMeController
} from '~/controllers/users.controllers'
import { accessTokenValidator } from '~/middlewares/auths.middlewares'
import { filterMiddleware } from '~/middlewares/common.middlewares'
import { uploadAvatar } from '~/middlewares/uploads.middlewares'
import {
  changePasswordValidator,
  tourIdValidator,
  updateMeValidator,
  verifiedUserValidator
} from '~/middlewares/users.middlewares'
import { UpdateMeReqBody } from '~/models/requests/User.requests'
import { wrapRequestHandler } from '~/utils/handlers'

const usersRouter = Router()

/**
 * Description: Get my profile
 * Path: /me
 * Method: GET
 * Header: { Authorization: Bearer <access_token>}
 * Body: {}
 */
usersRouter.get('/me', accessTokenValidator, wrapRequestHandler(getMeController))

/**
 * Description: Update my profile
 * Path: /me
 * Method: PUT
 * Header: { Authorization: Bearer <access_token>}
 * Body: UserSchema
 */
usersRouter.put(
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
 * Header: { Authorization: Bearer <access_token>}
 * Body: form-data
 */
usersRouter.patch(
  '/me/avatar',
  accessTokenValidator,
  verifiedUserValidator,
  uploadAvatar.single('avatar'),
  wrapRequestHandler(updateAvatarController)
)

/**
 * Description: Change password
 * Path: /me/password
 * Method: PATCH
 * Header: { Authorization: Bearer <access_token>}
 * Body: {password: string, new_password: string, new_confirm_password: string}
 */
usersRouter.patch(
  '/me/password',
  accessTokenValidator,
  verifiedUserValidator,
  changePasswordValidator,
  wrapRequestHandler(changePasswordController)
)

/**
 * Description: Toggle wishlist (add/remove tour from wishlist)
 * Path: /me/wishlist/:tour_id
 * Method: POST
 * Header: { Authorization: Bearer <access_token>}
 * Params: {tour_id: string}
 */
usersRouter.post(
  '/me/wishlist/:tour_id',
  accessTokenValidator,
  verifiedUserValidator,
  tourIdValidator,
  wrapRequestHandler(toggleWishlistController)
)

/**
 * Description: Get my wishlist tours
 * Path: /me/wishlist
 * Method: GET
 * Header: { Authorization: Bearer <access_token>}
 */
usersRouter.get(
  '/me/wishlist',
  accessTokenValidator,
  verifiedUserValidator,
  wrapRequestHandler(getMyWishlistController)
)

export default usersRouter
