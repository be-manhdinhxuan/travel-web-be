import { Router } from 'express'
import { create } from 'lodash'
import { UserRole } from '~/constants/enums'
import {
  createCategoryController,
  deleteCategoryController,
  getCategoriesController,
  getDetailCategoryController,
  toggleCategoryController,
  updateCategoryController,
  updateCategoryImageController
} from '~/controllers/categories.controllers'
import { authorize } from '~/middlewares/authorize.middlewares'
import { accessTokenValidator } from '~/middlewares/auths.middlewares'
import {
  createCategoryValidator,
  deleteCategoryValidator,
  getDetailCategoryValidator,
  optionalAccessTokenValidator,
  toogleCategoryValidator,
  updateCategoryValidator
} from '~/middlewares/categories.middlewares'
import { checkAllowedFields } from '~/middlewares/common.middlewares'
import { uploadImage } from '~/middlewares/uploads.middlewares'
import { verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const categoriesRouter = Router()

/**
 * Description: Get categories
 * Path:
 * Method: GET
 */
categoriesRouter.get('', optionalAccessTokenValidator, wrapRequestHandler(getCategoriesController))

/**
 * Description: Get detail category
 * Path: /:id
 * Method: GET
 * Param: id - category id
 */
categoriesRouter.get(
  '/:id',
  optionalAccessTokenValidator,
  getDetailCategoryValidator,
  wrapRequestHandler(getDetailCategoryController)
)

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
  authorize([UserRole.Admin]),
  uploadImage.single('thumbnail'),
  createCategoryValidator,
  wrapRequestHandler(createCategoryController)
)

/**
 * Description: Update category
 * Path: /:id
 * Method: PUT
 * Header: { Authorization: Bearer <access_token>}
 * Body: {name: string, description?: string, thumbnail: file}
 */
categoriesRouter.put(
  '/:id',
  accessTokenValidator,
  verifiedUserValidator,
  authorize([UserRole.Admin]),
  checkAllowedFields(['name', 'description']),
  updateCategoryValidator,
  wrapRequestHandler(updateCategoryController)
)

/**
 * Description: Update category image
 * Path: /:id/image
 * Method: POST
 * Header: { Authorization: Bearer <access_token>}
 */
categoriesRouter.post(
  '/:id/image',
  accessTokenValidator,
  verifiedUserValidator,
  authorize([UserRole.Admin]),
  uploadImage.single('thumbnail'),
  wrapRequestHandler(updateCategoryImageController)
)

/**
 * Description: Toogle status category
 * Path: /:id
 * Method: PATCH
 * Header: { Authorization: Bearer <access_token>}
 * Body: {is_active: boolean (required)}
 */
categoriesRouter.patch(
  '/:id',
  accessTokenValidator,
  verifiedUserValidator,
  authorize([UserRole.Admin]),
  toogleCategoryValidator,
  wrapRequestHandler(toggleCategoryController)
)

/**
 * Description: Delete category
 * Path: /:id
 * Method: DELETE
 * Header: { Authorization: Bearer <access_token>}
 */
categoriesRouter.delete(
  '/:id',
  accessTokenValidator,
  verifiedUserValidator,
  authorize([UserRole.Admin]),
  deleteCategoryValidator,
  wrapRequestHandler(deleteCategoryController)
)

export default categoriesRouter
