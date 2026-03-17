import { Router } from 'express'
import {
  createMomoPaymentController,
  createVnpayPaymentController,
  momoIpnController,
  vnpayIpnController,
  vnpayReturnController
} from '~/controllers/payments.controllers'
import { accessTokenValidator } from '~/middlewares/auths.middlewares'
import {
  createMomoPaymentValidator,
  createVnpayPaymentValidator,
  momoReturnController
} from '~/middlewares/payments.middlewares'
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

/**
 * Description: Create VNPay payment
 * Path: /vnpay
 * Method: POST
 * Header: { Authorization: Bearer <access_token> }
 * Body: { booking_id (ObjectId, required) }
 */
paymentsRouter.post(
  '/vnpay',
  accessTokenValidator,
  verifiedUserValidator,
  createVnpayPaymentValidator,
  wrapRequestHandler(createVnpayPaymentController)
)

/**
 * Description: VNPay return URL
 * Path: /vnpay/return
 * Method: GET
 * Query: vnp_ResponseCode, vnp_TxnRef, vnp_SecureHash... (từ VNPay)
 */
paymentsRouter.get('/vnpay/return', wrapRequestHandler(vnpayReturnController))

/**
 * Description: VNPay IPN callback
 * Path: /vnpay/ipn
 * Method: POST
 * Body: VNPay IPN payload
 */
paymentsRouter.post('/vnpay/ipn', wrapRequestHandler(vnpayIpnController))

export default paymentsRouter
