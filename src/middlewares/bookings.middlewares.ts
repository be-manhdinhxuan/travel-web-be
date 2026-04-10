import { checkSchema } from 'express-validator'
import { ObjectId } from 'mongodb'
import { BookingStatus, PaymentProvider, PaymentStatus, ScheduleStatus } from '~/constants/enums'
import HTTP_STATUS from '~/constants/httpStatus'
import { MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import databaseServices from '~/services/database.services'
import { validate } from '~/utils/validation'
import { Request } from 'express'

export const createBookingValidator = validate(
  checkSchema(
    {
      schedule_id: {
        notEmpty: {
          errorMessage: MESSAGES.SCHEDULE_ID_IS_REQUIRED
        },
        custom: {
          options: async (value: string) => {
            if (!ObjectId.isValid(value)) {
              throw new Error(MESSAGES.SCHEDULE_ID_IS_INVALID)
            }
            const schedule = await databaseServices.schedules.findOne({
              _id: new ObjectId(value),
              status: { $in: [ScheduleStatus.Available, ScheduleStatus.Full] },
              departure_date: { $gte: new Date() }
            })
            if (!schedule) {
              throw new ErrorWithStatus({
                message: MESSAGES.SCHEDULE_NOT_FOUND,
                status: HTTP_STATUS.NOT_FOUND
              })
            }
            return true
          }
        }
      },
      'passengers.adults': {
        notEmpty: {
          errorMessage: MESSAGES.PASSENGERS_ADULTS_IS_REQUIRED
        },
        isInt: {
          options: { min: 1 },
          errorMessage: MESSAGES.PASSENGERS_ADULTS_MUST_BE_AT_LEAST_1
        },
        toInt: true
      },
      'passengers.children': {
        optional: true,
        isInt: {
          options: { min: 0 },
          errorMessage: MESSAGES.PASSENGERS_CHILDREN_MUST_BE_NON_NEGATIVE
        },
        toInt: true
      },
      'passengers.babies': {
        optional: true,
        isInt: {
          options: { min: 0 },
          errorMessage: MESSAGES.PASSENGERS_BABIES_MUST_BE_NON_NEGATIVE
        },
        toInt: true
      },
      coupon_code: {
        optional: true,
        isString: {
          errorMessage: MESSAGES.COUPON_CODE_MUST_BE_A_STRING
        },
        trim: true,
        toUpperCase: true
      },
      'contact_info.full_name': {
        notEmpty: {
          errorMessage: MESSAGES.CONTACT_FULL_NAME_IS_REQUIRED
        },
        isString: {
          errorMessage: MESSAGES.CONTACT_FULL_NAME_MUST_BE_A_STRING
        },
        trim: true
      },
      'contact_info.phone': {
        notEmpty: {
          errorMessage: MESSAGES.CONTACT_PHONE_IS_REQUIRED
        },
        isMobilePhone: {
          options: ['vi-VN'],
          errorMessage: MESSAGES.CONTACT_PHONE_IS_INVALID
        }
      },
      'contact_info.email': {
        notEmpty: {
          errorMessage: MESSAGES.CONTACT_EMAIL_IS_REQUIRED
        },
        isEmail: {
          errorMessage: MESSAGES.CONTACT_EMAIL_IS_INVALID
        },
        trim: true
      }
    },
    ['body']
  )
)

export const getMyBookingsValidator = validate(
  checkSchema(
    {
      page: {
        optional: true,
        isInt: {
          options: { min: 1 },
          errorMessage: MESSAGES.PAGE_MUST_BE_A_POSITIVE_INTEGER
        },
        toInt: true
      },
      limit: {
        optional: true,
        isInt: {
          options: { min: 1, max: 100 },
          errorMessage: MESSAGES.LIMIT_MUST_BE_FROM_1_TO_100
        },
        toInt: true
      },
      status: {
        optional: true,
        isIn: {
          options: [[BookingStatus.Pending, BookingStatus.Confirmed, BookingStatus.Completed, BookingStatus.Cancelled]],
          errorMessage: MESSAGES.BOOKING_STATUS_IS_INVALID
        },
        toInt: true
      }
    },
    ['query']
  )
)

export const getMyBookingDetailValidator = validate(
  checkSchema(
    {
      id: {
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
            const user_id = (req as Request).decoded_authorization?.user_id
            if (booking.user_id.toString() !== user_id) {
              throw new ErrorWithStatus({
                message: MESSAGES.BOOKING_NOT_BELONG_TO_USER,
                status: HTTP_STATUS.FORBIDDEN
              })
            }
            return true
          }
        }
      }
    },
    ['params']
  )
)

export const cancelBookingValidator = validate(
  checkSchema(
    {
      id: {
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
            const user_id = (req as Request).decoded_authorization?.user_id
            if (booking.user_id.toString() !== user_id) {
              throw new ErrorWithStatus({
                message: MESSAGES.BOOKING_NOT_BELONG_TO_USER,
                status: HTTP_STATUS.FORBIDDEN
              })
            }
            if (booking.status !== BookingStatus.Pending) {
              throw new ErrorWithStatus({
                message: MESSAGES.BOOKING_CANNOT_BE_CANCELLED,
                status: HTTP_STATUS.BAD_REQUEST
              })
            }
            return true
          }
        }
      },
      reason: {
        optional: true,
        isString: {
          errorMessage: MESSAGES.REASON_MUST_BE_A_STRING
        },
        trim: true
      }
    },
    ['body', 'params']
  )
)

export const getBookingsValidator = validate(
  checkSchema(
    {
      page: {
        optional: true,
        isInt: {
          options: { min: 1 },
          errorMessage: MESSAGES.PAGE_MUST_BE_A_POSITIVE_INTEGER
        },
        toInt: true
      },
      limit: {
        optional: true,
        isInt: {
          options: { min: 1, max: 100 },
          errorMessage: MESSAGES.LIMIT_MUST_BE_FROM_1_TO_100
        },
        toInt: true
      },
      status: {
        optional: true,
        isIn: {
          options: [[BookingStatus.Pending, BookingStatus.Confirmed, BookingStatus.Completed, BookingStatus.Cancelled]],
          errorMessage: MESSAGES.BOOKING_STATUS_IS_INVALID
        },
        toInt: true
      },
      keyword: {
        optional: true,
        isString: {
          errorMessage: MESSAGES.KEYWORD_MUST_BE_A_STRING
        },
        trim: true
      },
      tour_id: {
        optional: true,
        custom: {
          options: (value: string) => {
            if (!ObjectId.isValid(value)) {
              throw new Error(MESSAGES.TOUR_ID_IS_INVALID)
            }
            return true
          }
        }
      },
      from_date: {
        optional: true,
        isISO8601: {
          options: { strict: true },
          errorMessage: MESSAGES.FROM_DATE_IS_INVALID
        }
      },
      to_date: {
        optional: true,
        isISO8601: {
          options: { strict: true },
          errorMessage: MESSAGES.TO_DATE_IS_INVALID
        },
        custom: {
          options: (value: string, { req }) => {
            if (req.query?.from_date && new Date(value) < new Date(req.query.from_date as string)) {
              throw new Error(MESSAGES.TO_DATE_MUST_BE_AFTER_FROM_DATE)
            }
            return true
          }
        }
      }
    },
    ['query']
  )
)

export const getBookingDetailValidator = validate(
  checkSchema(
    {
      id: {
        custom: {
          options: async (value: string) => {
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
            return true
          }
        }
      }
    },
    ['params']
  )
)

export const updateBookingStatusValidator = validate(
  checkSchema(
    {
      id: {
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
            ;(req as Request).booking = booking
            return true
          }
        }
      },
      status: {
        notEmpty: {
          errorMessage: MESSAGES.BOOKING_STATUS_IS_REQUIRED
        },
        isIn: {
          options: [[BookingStatus.Confirmed, BookingStatus.Completed, BookingStatus.Cancelled]],
          errorMessage: MESSAGES.BOOKING_STATUS_IS_INVALID
        },
        toInt: true
      },
      cancelled_reason: {
        custom: {
          options: (value: string, { req }) => {
            const status = Number(req.body?.status)
            if (status === BookingStatus.Cancelled && !value) {
              throw new Error(MESSAGES.CANCELLED_REASON_IS_REQUIRED)
            }
            return true
          }
        },
        optional: true,
        isString: {
          errorMessage: MESSAGES.REASON_MUST_BE_A_STRING
        },
        trim: true
      }
    },
    ['body', 'params']
  )
)

export const confirmRefundValidator = validate(
  checkSchema(
    {
      id: {
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
            ;(req as Request).booking = booking
            return true
          }
        }
      },
      status: {
        notEmpty: {
          errorMessage: MESSAGES.PAYMENT_STATUS_IS_REQUIRED
        },
        isIn: {
          options: [[PaymentStatus.Refunded]],
          errorMessage: MESSAGES.PAYMENT_STATUS_IS_INVALID
        },
        toInt: true
      }
    },
    ['body', 'params']
  )
)
