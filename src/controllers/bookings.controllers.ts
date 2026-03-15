import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { MESSAGES } from '~/constants/messages'
import { CreateBookingReqBody } from '~/models/requests/Booking.requests'
import bookingsService from '~/services/booking.services'

export const createBookingController = async (
  req: Request<ParamsDictionary, any, CreateBookingReqBody>,
  res: Response
) => {
  const user_id = req.decoded_authorization?.user_id as string
  const result = await bookingsService.createBooking(user_id, req.body)
  return res.status(201).json({
    message: MESSAGES.CREATE_BOOKING_SUCCESS,
    result
  })
}
