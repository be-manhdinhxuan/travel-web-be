import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { MESSAGES } from '~/constants/messages'
import paymentsService from '~/services/payments.services'

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