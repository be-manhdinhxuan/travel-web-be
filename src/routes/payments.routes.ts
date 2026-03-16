import { Router } from 'express'
import { createMomoPaymentController } from '~/controllers/payments.controllers'
import { accessTokenValidator } from '~/middlewares/auths.middlewares'
import { createMomoPaymentValidator } from '~/middlewares/payments.middlewares'
import { verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const paymentsRouter = Router()

/**
 * Description: Create MoMo payment
 * Path: /momo
 * Method: POST
 * Header: { Authorization: Bearer <access_token> }
 * Body: { booking_id (ObjectId, required) }
 */
paymentsRouter.post(
  '/momo',
  accessTokenValidator,
  verifiedUserValidator,
  createMomoPaymentValidator,
  wrapRequestHandler(createMomoPaymentController)
)

export default paymentsRouter
