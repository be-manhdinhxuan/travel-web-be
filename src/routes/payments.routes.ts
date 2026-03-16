import { Router } from 'express'
import { createMomoPaymentController, momoIpnController } from '~/controllers/payments.controllers'
import { accessTokenValidator } from '~/middlewares/auths.middlewares'
import { createMomoPaymentValidator, momoReturnController } from '~/middlewares/payments.middlewares'
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

/**
 * Description: MoMo IPN callback
 * Path: /momo/ipn
 * Method: POST
 * Body: MoMo IPN payload
 */
paymentsRouter.post('/momo/ipn', wrapRequestHandler(momoIpnController))

/**
 * Description: MoMo return URL
 * Path: /momo/return
 * Method: GET
 * Query: resultCode, orderId, ... (từ MoMo)
 */
paymentsRouter.get('/momo/return', wrapRequestHandler(momoReturnController))

export default paymentsRouter
