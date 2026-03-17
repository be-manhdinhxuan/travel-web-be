import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { MESSAGES } from '~/constants/messages'
import paymentsService from '~/services/payments.services'
import crypto from 'crypto'

export const createMomoPaymentController = async (
  req: Request<ParamsDictionary, any, { booking_id: string }>,
  res: Response
) => {
  const user_id = req.decoded_authorization?.user_id as string
  const { booking_id } = req.body
  const result = await paymentsService.createMomoPayment(booking_id, user_id)
  return res.json({
    message: MESSAGES.CREATE_PAYMENT_SUCCESS,
    result
  })
}

export const momoIpnController = async (req: Request, res: Response) => {
  await paymentsService.handleMomoIpn(req.body)
  return res.status(204).send()
}

export const createVnpayPaymentController = async (
  req: Request<ParamsDictionary, any, { booking_id: string }>,
  res: Response
) => {
  const user_id = req.decoded_authorization?.user_id as string
  const { booking_id } = req.body
  const ip_addr = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1'
  const result = await paymentsService.createVnpayPayment(booking_id, user_id, ip_addr)
  return res.json({
    message: MESSAGES.CREATE_PAYMENT_SUCCESS,
    result
  })
}

export const vnpayReturnController = async (req: Request, res: Response) => {
  const vnpParams = { ...req.query } as Record<string, string>
  const clientUrl = process.env.CLIENT_URL
  const orderId = vnpParams['vnp_TxnRef']

  // xác thực chữ ký
  const secureHash = vnpParams['vnp_SecureHash']
  delete vnpParams['vnp_SecureHash']
  delete vnpParams['vnp_SecureHashType']

  const sortedParams = Object.keys(vnpParams)
    .sort()
    .reduce((acc: Record<string, string>, key) => {
      acc[key] = vnpParams[key]
      return acc
    }, {})

  const signData = new URLSearchParams(sortedParams).toString()

  const expectedHash = crypto
    .createHmac('sha512', process.env.VNPAY_HASH_SECRET as string)
    .update(signData)
    .digest('hex')

  if (secureHash !== expectedHash) {
    return res.redirect(`${clientUrl}/payment/failed?orderId=${orderId}&reason=invalid_signature`)
  }

  const responseCode = vnpParams['vnp_ResponseCode']

  // xử lý nghiệp vụ luôn ở đây vì VNPay sandbox không gọi IPN
  await paymentsService.handleVnpayIpn({ ...vnpParams, vnp_SecureHash: secureHash })

  if (responseCode === '00') {
    return res.redirect(`${clientUrl}/payment/success?orderId=${orderId}`)
  }

  return res.redirect(`${clientUrl}/payment/failed?orderId=${orderId}&code=${responseCode}`)
}

export const vnpayIpnController = async (req: Request, res: Response) => {
  const result = await paymentsService.handleVnpayIpn(req.query as Record<string, string>)
  return res.json(result)
}
