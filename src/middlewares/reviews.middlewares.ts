import { Request } from 'express'
import { checkSchema, ParamSchema } from 'express-validator'
import { validate } from '~/utils/validation'
import { MESSAGES } from '~/constants/messages'
import databaseServices from '~/services/database.services'
import { ObjectId } from 'mongodb'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
import { BookingStatus } from '~/constants/enums'

export const createReviewValidator = validate(
  checkSchema(
    {
      booking_id: {
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

            const user_id = (req as Request).decoded_authorization?.user_id

            // kiểm tra booking tồn tại, thuộc user, status = Completed
            const booking = await databaseServices.bookings.findOne({
              _id: new ObjectId(value),
              user_id: new ObjectId(user_id as string),
              status: BookingStatus.Completed
            })

            if (!booking) {
              throw new ErrorWithStatus({
                message: MESSAGES.BOOKING_NOT_ELIGIBLE_FOR_REVIEW,
                status: HTTP_STATUS.BAD_REQUEST
              })
            }

            // kiểm tra booking chưa được review
            const existingReview = await databaseServices.reviews.findOne({
              booking_id: new ObjectId(value)
            })

            if (existingReview) {
              throw new ErrorWithStatus({
                message: MESSAGES.BOOKING_ALREADY_REVIEWED,
                status: HTTP_STATUS.CONFLICT
              })
            }

            // gán booking vào req để dùng trong service
            ;(req as Request).booking = booking
            return true
          }
        }
      },
      rating: {
        notEmpty: {
          errorMessage: MESSAGES.RATING_IS_REQUIRED
        },
        isInt: {
          options: { min: 1, max: 5 },
          errorMessage: MESSAGES.RATING_MUST_BE_FROM_1_TO_5
        },
        toInt: true
      },
      comment: {
        optional: true,
        isString: {
          errorMessage: MESSAGES.COMMENT_MUST_BE_A_STRING
        },
        isLength: {
          options: { max: 1000 },
          errorMessage: MESSAGES.COMMENT_TOO_LONG
        },
        trim: true
      }
    },
    ['body']
  )
)

export const getReviewsValidator = validate(
  checkSchema(
    {
      tour_id: {
        notEmpty: {
          errorMessage: MESSAGES.TOUR_ID_IS_REQUIRED
        },
        custom: {
          options: (value: string) => {
            if (!ObjectId.isValid(value)) {
              throw new ErrorWithStatus({
                message: MESSAGES.TOUR_ID_IS_INVALID,
                status: HTTP_STATUS.BAD_REQUEST
              })
            }
            return true
          }
        }
      },
      page: {
        optional: true,
        isInt: { options: { min: 1 }, errorMessage: MESSAGES.PAGE_MUST_BE_A_POSITIVE_INTEGER },
        toInt: true
      },
      limit: {
        optional: true,
        isInt: { options: { min: 1, max: 50 }, errorMessage: MESSAGES.LIMIT_MUST_BE_FROM_1_TO_50 },
        toInt: true
      }
    },
    ['query']
  )
)
