import { Router } from 'express'
import { UserRole } from '~/constants/enums'
import {
  createTourController,
  deleteTourController,
  getDetailTourController,
  getToursController,
  updateTourController,
  updateTourStatusController
} from '~/controllers/tours.controllers'
import { authorize } from '~/middlewares/authorize.middlewares'
import { accessTokenValidator } from '~/middlewares/auths.middlewares'
import { optionalAccessTokenValidator } from '~/middlewares/categories.middlewares'
import {
  createTourValidator,
  deleteTourValidator,
  getDetailTourValidator,
  getToursValidator,
  idTourValidator,
  updateTourStatusValidator,
  updateTourValidator
} from '~/middlewares/tours.middlewares'
import { uploadImage } from '~/middlewares/uploads.middlewares'
import { verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const toursRouter = Router()

/**
 * Description: Create a new tour
 * Path: /
 * Method: POST
 * Header: { Authorization: Bearer <access_token>}
 * Body: {name (string, required)
category_id (ObjectId, required)
description (string)
highlights (JSON string array) — VD: ["Điểm 1","Điểm 2"]
destination (string, required)
departure_city (string, required)
duration_days (int, required, min 1)
duration_nights (int, required, min 0)
itinerary (JSON string array) — VD: [{"day":1,"title":"...","description":"..."}]
includes (JSON string array) — VD: ["Bao gồm 1","Bao gồm 2"]
excludes (JSON string array) — VD: ["Không bao gồm 1"]
images (file, multipart/form-data) — tối đa 10 ảnh}
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

/**
 * Description: Get list of tours
 * Path: /
 * Method: GET
 * Query: { page, limit, keyword, category_id, destination, departure_date, num_adults, num_children, min_price, max_price, sort }
 */
toursRouter.get('', getToursValidator, wrapRequestHandler(getToursController))

/**
 * Description: Get detail tour
 * Path: /:slug
 * Method: GET
 * Param: slug - tour slug
 */
toursRouter.get(
  '/:slug',
  optionalAccessTokenValidator,
  getDetailTourValidator,
  wrapRequestHandler(getDetailTourController)
)

/**
 * Description: Update a tour
 * Path: /:id
 * Method: PUT
 * Header: { Authorization: Bearer <access_token>}
 * Param: id - tour id
 * Body: Đều là optional {name (string, required)
category_id (ObjectId, required)
description (string)
highlights (JSON string array) — VD: ["Điểm 1","Điểm 2"]
destination (string, required)
departure_city (string, required)
duration_days (int, required, min 1)
duration_nights (int, required, min 0)
itinerary (JSON string array) — VD: [{"day":1,"title":"...","description":"..."}]
includes (JSON string array) — VD: ["Bao gồm 1","Bao gồm 2"]
excludes (JSON string array) — VD: ["Không bao gồm 1"]
images (file, multipart/form-data) — tối đa 10 ảnh}
 */
toursRouter.put(
  '/:id',
  accessTokenValidator,
  verifiedUserValidator,
  authorize(UserRole.Admin),
  uploadImage.array('images', 10),
  updateTourValidator,
  wrapRequestHandler(updateTourController)
)

/**
 * Description: Update tour status (active/inactive/cancelled)
 * Path: /:id/status
 * Method: PATCH
 * Header: { Authorization: Bearer <access_token>}
 * Param: id - tour id
 * Body: {status: 'active' | 'inactive' | 'cancelled'}
 */
toursRouter.patch(
  '/:id',
  accessTokenValidator,
  verifiedUserValidator,
  authorize(UserRole.Admin),
  updateTourStatusValidator,
  wrapRequestHandler(updateTourStatusController)
)

/**
 * Description: Delete a tour
 * Path: /:id
 * Method: DELETE
 * Header: { Authorization: Bearer <access_token>}
 * Param: id - tour id
 */
toursRouter.delete(
  '/:id',
  accessTokenValidator,
  verifiedUserValidator,
  authorize(UserRole.Admin),
  deleteTourValidator,
  wrapRequestHandler(deleteTourController)
)

export default toursRouter
