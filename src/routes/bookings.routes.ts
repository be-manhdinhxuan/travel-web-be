import { Router } from 'express'
import { UserRole } from '~/constants/enums'
import {
  cancelBookingController,
  confirmRefundController,
  createBookingController,
  getBookingDetailController,
  getBookingsController,
  getMyBookingDetailController,
  getMyBookingsController,
  updateBookingStatusController
} from '~/controllers/bookings.controllers'
import { authorize } from '~/middlewares/authorize.middlewares'
import { accessTokenValidator } from '~/middlewares/auths.middlewares'
import {
  cancelBookingValidator,
  confirmRefundValidator,
  createBookingValidator,
  getBookingDetailValidator,
  getBookingsValidator,
  getMyBookingDetailValidator,
  getMyBookingsValidator,
  updateBookingStatusValidator
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

/**
 * Description: Get all bookings (Admin)
 * Path: /
 * Method: GET
 * Header: { Authorization: Bearer <access_token> }
 * Query: { page, limit, status, keyword, tour_id, from_date, to_date }
 */
bookingsRouter.get(
  '/',
  accessTokenValidator,
  verifiedUserValidator,
  authorize([UserRole.Admin, UserRole.Employee]),
  getBookingsValidator,
  wrapRequestHandler(getBookingsController)
)

/**
 * Description: Get booking detail (Admin)
 * Path: /:id
 * Method: GET
 * Header: { Authorization: Bearer <access_token> }
 * Param: id - booking id
 */
bookingsRouter.get(
  '/:id',
  accessTokenValidator,
  verifiedUserValidator,
  authorize([UserRole.Admin, UserRole.Employee]),
  getBookingDetailValidator,
  wrapRequestHandler(getBookingDetailController)
)

/**
 * Description: Update booking status (Admin)
 * Path: /:id/status
 * Method: PATCH
 * Header: { Authorization: Bearer <access_token> }
 * Param: id - booking id
 * Body: {
 *   status (int, required) — 1: confirmed, 2: completed, 3: cancelled
 *   cancelled_reason (string) — bắt buộc nếu status = 3
 * }
 */
bookingsRouter.patch(
  '/:id/status',
  accessTokenValidator,
  verifiedUserValidator,
  authorize([UserRole.Admin, UserRole.Employee]),
  updateBookingStatusValidator,
  wrapRequestHandler(updateBookingStatusController)
)

/**
 * Description: Confirm refund payment when cancelling a booking (Admin)
 * Path: /:id/refund
 * Method: PATCH
 * Header: { Authorization: Bearer <access_token> }
 * Param: id - booking id
 * Body: { status (int, required) — 3: refunded }
 */
bookingsRouter.patch(
  '/:id/refund',
  accessTokenValidator,
  verifiedUserValidator,
  authorize([UserRole.Admin, UserRole.Employee]),
  confirmRefundValidator,
  wrapRequestHandler(confirmRefundController)
)

export default bookingsRouter
