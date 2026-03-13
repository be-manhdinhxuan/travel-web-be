import { Router } from 'express'
import { create } from 'lodash'
import { UserRole } from '~/constants/enums'
import {
  createCategoryController,
  getCategoriesController,
  getDetailCategoryController
} from '~/controllers/categories.controllers'
import { authorize } from '~/middlewares/authorize.middlewares'
import { accessTokenValidator } from '~/middlewares/auths.middlewares'
import { createCategoryValidator, getDetailCategoryValidator } from '~/middlewares/categories.middlewares'
import { uploadImage } from '~/middlewares/uploads.middlewares'
import { verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const categoriesRouter = Router()

/**
 * Description: Get categories
 * Path:
 * Method: GET
 */
categoriesRouter.get('', wrapRequestHandler(getCategoriesController))

/**
 * Description: Get detail category
 * Path: /:id
 * Method: GET
 * Param: id - category id
 */
categoriesRouter.get('/:id', getDetailCategoryValidator, wrapRequestHandler(getDetailCategoryController))

/**
 * Description: Create a new category
 * Path:
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
