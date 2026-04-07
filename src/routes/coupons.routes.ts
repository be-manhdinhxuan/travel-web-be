import { Router } from 'express'
import { UserRole } from '~/constants/enums'
import {
  applyBookingCouponController,
  createCouponController,
  getCouponsController,
  getPublicCouponsController,
  toggleCouponController,
  updateCouponController,
  validateCouponController
} from '~/controllers/coupons.controllers'
import { authorize } from '~/middlewares/authorize.middlewares'
import { accessTokenValidator } from '~/middlewares/auths.middlewares'
import { checkAllowedFields } from '~/middlewares/common.middlewares'
import {
  couponIdValidator,
  createCouponValidator,
  getCouponsValidator,
  getPublicCouponsValidator,
  updateCouponValidator,
  validateCouponValidator
} from '~/middlewares/coupons.middlewares'
import { verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const couponsRouter = Router()

/**
 * Description: Get public coupons (available coupons for users)
 * Path: /public-coupons
 * Method: GET
 * Query: { page, limit, keyword }
 */
couponsRouter.get('/public-coupons', getPublicCouponsValidator, wrapRequestHandler(getPublicCouponsController))

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
  authorize([UserRole.Admin]),
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
  authorize([UserRole.Admin]),
  getCouponsValidator,
  wrapRequestHandler(getCouponsController)
)

/**
 * Description: Update coupon (Admin only)
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
  authorize([UserRole.Admin]),
  checkAllowedFields(['code', 'value', 'min_order_value', 'max_usage', 'expires_at']),
  updateCouponValidator,
  wrapRequestHandler(updateCouponController)
)

/**
 * Description: Toggle coupon status (Admin only)
 * Path: /:id/toggle
 * Method: PATCH
 * Header: { Authorization: Bearer <access_token> }
 * Param: id - coupon id
 */
couponsRouter.patch(
  '/:id/toggle',
  accessTokenValidator,
  verifiedUserValidator,
  authorize([UserRole.Admin]),
  couponIdValidator,
  wrapRequestHandler(toggleCouponController)
)

/**
 * Description: Validate coupon
 * Path: /validate
 * Method: POST
 * Header: { Authorization: Bearer <access_token> }
 * Body: { code (string, required), order_value (number, required) }
 */
couponsRouter.post(
  '/validate',
  accessTokenValidator,
  verifiedUserValidator,
  validateCouponValidator,
  wrapRequestHandler(validateCouponController)
)

/**
 * Description: Update coupon for bookings
 * Path: /:id/coupon
 * Method: PATCH
 * Header: { Authorization: Bearer <access_token> }
 * Body: { booking_id (string, required), user_id (string, required), coupon_code (string, required) }
 */
couponsRouter.patch(
  '/:id/coupon',
  accessTokenValidator,
  verifiedUserValidator,
  wrapRequestHandler(applyBookingCouponController)
)

export default couponsRouter
