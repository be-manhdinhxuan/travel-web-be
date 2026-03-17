import e, { Router } from 'express'
import { UserRole } from '~/constants/enums'
import {
  createCouponController,
  getCouponsController,
  toggleCouponController,
  updateCouponController
} from '~/controllers/coupons.controllers'
import { authorize } from '~/middlewares/authorize.middlewares'
import { accessTokenValidator } from '~/middlewares/auths.middlewares'
import { checkAllowedFields } from '~/middlewares/common.middlewares'
import {
  couponIdValidator,
  createCouponValidator,
  getCouponsValidator,
  updateCouponValidator
} from '~/middlewares/coupons.middlewares'
import { verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const couponsRouter = Router()

/**
 * Description: Create coupon (Admin only)
 * Path: /
 * Method: POST
 * Header: { Authorization: Bearer <access_token> }
 * Body: { code, value, min_order_value, max_usage, expires_at }
 */
couponsRouter.post(
  '/',
  accessTokenValidator,
  verifiedUserValidator,
  authorize(UserRole.Admin),
  createCouponValidator,
  wrapRequestHandler(createCouponController)
)

/**
 * Description: Get all coupons (Admin)
 * Path: /
 * Method: GET
 * Header: { Authorization: Bearer <access_token> }
 * Query: { page, limit, is_active, keyword }
 */
couponsRouter.get(
  '/',
  accessTokenValidator,
  verifiedUserValidator,
  authorize(UserRole.Admin),
  getCouponsValidator,
  wrapRequestHandler(getCouponsController)
)

/**
 * Description: Update coupon
 * Path: /:id
 * Method: PUT
 * Header: { Authorization: Bearer <access_token> }
 * Param: id - coupon id
 * Body: { code, value, min_order_value, max_usage, expires_at } (optional)
 */
couponsRouter.put(
  '/:id',
  accessTokenValidator,
  verifiedUserValidator,
  authorize(UserRole.Admin),
  checkAllowedFields(['code', 'value', 'min_order_value', 'max_usage', 'expires_at']),
  updateCouponValidator,
  wrapRequestHandler(updateCouponController)
)

/**
 * Description: Toggle coupon status
 * Path: /:id/toggle
 * Method: PATCH
 * Header: { Authorization: Bearer <access_token> }
 * Param: id - coupon id
 */
couponsRouter.patch(
  '/:id/toggle',
  accessTokenValidator,
  verifiedUserValidator,
  authorize(UserRole.Admin),
  couponIdValidator,
  wrapRequestHandler(toggleCouponController)
)

export default couponsRouter
