import { Router } from 'express'
import { createBookingController } from '~/controllers/bookings.controllers'
import { accessTokenValidator } from '~/middlewares/auths.middlewares'
import { createBookingValidator } from '~/middlewares/bookings.middlewares'
import { verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const bookingsRouter = Router()

/**
 * Description: Create a new booking
 * Path: /
 * Method: POST
 * Header: { Authorization: Bearer <access_token> }
 * Body: {
 *   schedule_id (ObjectId, required)
 *   passengers.adults (int, required, min 1)
 *   passengers.children (int, default 0)
 *   passengers.babies (int, default 0)
 *   coupon_code (string) — tùy chọn
 *   payment_method (int, required) — 1: momo, 2: vnpay
 *   contact_info.full_name (string, required)
 *   contact_info.phone (string, required)
 *   contact_info.email (string, required)
 * }
 */
bookingsRouter.post(
  '/',
  accessTokenValidator,
  verifiedUserValidator,
  createBookingValidator,
  wrapRequestHandler(createBookingController)
)

export default bookingsRouter
