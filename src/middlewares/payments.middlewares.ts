import { checkSchema, ParamSchema } from 'express-validator'
import { ObjectId } from 'mongodb'
import { BookingStatus } from '~/constants/enums'
import HTTP_STATUS from '~/constants/httpStatus'
import { MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import databaseServices from '~/services/database.services'
import { validate } from '~/utils/validation'
import { Request, Response } from 'express'

export const createPaymentValidator: ParamSchema = {
  notEmpty: {
    errorMessage: MESSAGES.BOOKING_ID_IS_REQUIRED
  },
  custom: {
    options: async (value: string, { req }) => {
      if (!ObjectId.isValid(value)) {
        throw new ErrorWithStatus({
          message: MESSAGES.BOOKING_ID_IS_INVALID,
          status: HTTP_STATUS.BAD_REQUEST
        })
      }
      const booking = await databaseServices.bookings.findOne({
        _id: new ObjectId(value)
      })
      if (!booking) {
        throw new ErrorWithStatus({
          message: MESSAGES.BOOKING_NOT_FOUND,
          status: HTTP_STATUS.NOT_FOUND
        })
      }
      if (booking.user_id.toString() !== (req as Request).decoded_authorization?.user_id) {
        throw new ErrorWithStatus({
          message: MESSAGES.BOOKING_NOT_BELONG_TO_USER,
          status: HTTP_STATUS.FORBIDDEN
        })
      }
      if (booking.status !== BookingStatus.Pending) {
        throw new ErrorWithStatus({
          message: MESSAGES.BOOKING_ALREADY_PAID,
          status: HTTP_STATUS.BAD_REQUEST
        })
      }
      return true
    }
  }
}

export const createMomoPaymentValidator = validate(
  checkSchema(
    {
      booking_id: createPaymentValidator
    },
    ['body']
  )
)

export const momoReturnController = async (req: Request, res: Response) => {
  const { resultCode, orderId } = req.query

  const clientUrl = process.env.CLIENT_URL

  if (resultCode === '0') {
    return res.redirect(`${clientUrl}/payment/success?orderId=${orderId}`)
  }

  return res.redirect(`${clientUrl}/payment/failed?orderId=${orderId}`)
}

export const createVnpayPaymentValidator = validate(
  checkSchema(
    {
      booking_id: createPaymentValidator
    },
    ['body']
  )
)
