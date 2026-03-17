import e, { Router } from 'express'
import { UserRole } from '~/constants/enums'
import { createCouponController, getCouponsController } from '~/controllers/coupons.controllers'
import { authorize } from '~/middlewares/authorize.middlewares'
import { accessTokenValidator } from '~/middlewares/auths.middlewares'
import { createCouponValidator, getCouponsValidator } from '~/middlewares/coupons.middlewares'
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

export default couponsRouter
