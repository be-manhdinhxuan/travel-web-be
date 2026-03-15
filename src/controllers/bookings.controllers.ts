import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { MESSAGES } from '~/constants/messages'
import { CreateBookingReqBody, GetBookingsQuery, GetMyBookingsQuery } from '~/models/requests/Booking.requests'
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

export const getMyBookingsController = async (
  req: Request<ParamsDictionary, any, any, GetMyBookingsQuery>,
  res: Response
) => {
  const user_id = req.decoded_authorization?.user_id as string
  const result = await bookingsService.getMyBookings(user_id, req.query)
  return res.json({
    message: MESSAGES.GET_MY_BOOKINGS_SUCCESS,
    result
  })
}

export const getMyBookingDetailController = async (req: Request, res: Response) => {
  const { id } = req.params
  const result = await bookingsService.getMyBookingDetail(id as string)
  return res.json({
    message: MESSAGES.GET_BOOKING_DETAIL_SUCCESS,
    result
  })
}

export const cancelBookingController = async (
  req: Request<ParamsDictionary, any, { reason?: string }>,
  res: Response
) => {
  const { id } = req.params
  const { reason } = req.body
  const result = await bookingsService.cancelBooking(id as string, reason)
  return res.json({
    message: MESSAGES.CANCEL_BOOKING_SUCCESS,
    result
  })
}

export const getBookingsController = async (
  req: Request<ParamsDictionary, any, any, GetBookingsQuery>,
  res: Response
) => {
  const result = await bookingsService.getBookings(req.query)
  return res.json({
    message: MESSAGES.GET_BOOKINGS_SUCCESS,
    result
  })
}

export const getBookingDetailController = async (req: Request, res: Response) => {
  const { id } = req.params
  const result = await bookingsService.getBookingDetail(id as string)
  return res.json({
    message: MESSAGES.GET_BOOKING_DETAIL_SUCCESS,
    result
  })
}
