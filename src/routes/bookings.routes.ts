import { Router } from 'express'
import {
  cancelBookingController,
  createBookingController,
  getMyBookingDetailController,
  getMyBookingsController
} from '~/controllers/bookings.controllers'
import { accessTokenValidator } from '~/middlewares/auths.middlewares'
import {
  cancelBookingValidator,
  createBookingValidator,
  getMyBookingDetailValidator,
  getMyBookingsValidator
} from '~/middlewares/bookings.middlewares'
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

/**
 * Description: Get my booking history
 * Path: /my
 * Method: GET
 * Header: { Authorization: Bearer <access_token> }
 * Query: { page, limit, status }
 */
bookingsRouter.get(
  '/my',
  accessTokenValidator,
  verifiedUserValidator,
  getMyBookingsValidator,
  wrapRequestHandler(getMyBookingsController)
)

/**
 * Description: Get my booking detail
 * Path: /my/:id
 * Method: GET
 * Header: { Authorization: Bearer <access_token> }
 * Param: id - booking id
 */
bookingsRouter.get(
  '/my/:id',
  accessTokenValidator,
  verifiedUserValidator,
  getMyBookingDetailValidator,
  wrapRequestHandler(getMyBookingDetailController)
)

/**
 * Description: Cancel my booking
 * Path: /my/:id/cancel
 * Method: PATCH
 * Header: { Authorization: Bearer <access_token> }
 * Param: id - booking id
 * Body: { reason (string) }
 */
bookingsRouter.patch(
  '/my/:id/cancel',
  accessTokenValidator,
  verifiedUserValidator,
  cancelBookingValidator,
  wrapRequestHandler(cancelBookingController)
)

export default bookingsRouter
