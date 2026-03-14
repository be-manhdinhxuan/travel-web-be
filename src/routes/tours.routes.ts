import { Router } from 'express'
import { UserRole } from '~/constants/enums'
import { createTourController } from '~/controllers/tours.controllers'
import { authorize } from '~/middlewares/authorize.middlewares'
import { accessTokenValidator } from '~/middlewares/auths.middlewares'
import { createTourValidator } from '~/middlewares/tours.middlewares'
import { uploadImage } from '~/middlewares/uploads.middlewares'
import { verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const toursRouter = Router()

/**
 * Description: Create a new tour
 * Path:
 * Method: POST
 * Header: { Authorization: Bearer <access_token>}
 * Body: {}
 */
toursRouter.post(
  '',
  accessTokenValidator,
  verifiedUserValidator,
  authorize(UserRole.Admin),
  uploadImage.array('images', 10),
  createTourValidator,
  wrapRequestHandler(createTourController)
)

export default toursRouter
