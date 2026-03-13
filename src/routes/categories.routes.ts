import { Router } from 'express'
import { create } from 'lodash'
import { UserRole } from '~/constants/enums'
import { createCategoryController } from '~/controllers/categories.controllers'
import { authorize } from '~/middlewares/authorize.middlewares'
import { accessTokenValidator } from '~/middlewares/auths.middlewares'
import { createCategoryValidator } from '~/middlewares/categories.middlewares'
import { uploadImage } from '~/middlewares/uploads.middlewares'
import { verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const categoriesRouter = Router()

/**
 * Description: Create a new category
 * Path: /categories
 * Method: POST
 * Header: { Authorization: Bearer <access_token>}
 * Body: {name: string, description?: string, thumbnail: file}
 */
categoriesRouter.post(
  '',
  accessTokenValidator,
  verifiedUserValidator,
  authorize(UserRole.Admin),
  uploadImage.single('thumbnail'),
  createCategoryValidator,
  wrapRequestHandler(createCategoryController)
)

export default categoriesRouter
