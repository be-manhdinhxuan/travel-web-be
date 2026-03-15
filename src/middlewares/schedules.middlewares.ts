import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validation'
import { idTourValidator } from './tours.middlewares'
import { MESSAGES } from '~/constants/messages'

export const createScheduleValidator = validate(
  checkSchema(
    {
      tour_id: idTourValidator,
      departure_date: {
        notEmpty: {
          errorMessage: MESSAGES.DEPARTURE_DATE_IS_REQUIRED
        },
        isISO8601: {
          options: { strict: true },
          errorMessage: MESSAGES.DEPARTURE_DATE_IS_INVALID
        },
        custom: {
          options: (value: string) => {
            const date = new Date(value)
            if (date <= new Date()) {
              throw new Error(MESSAGES.DEPARTURE_DATE_MUST_BE_IN_FUTURE)
            }
            return true
          }
        }
      },
      return_date: {
        notEmpty: {
          errorMessage: MESSAGES.RETURN_DATE_IS_REQUIRED
        },
        isISO8601: {
          options: { strict: true },
          errorMessage: MESSAGES.RETURN_DATE_IS_INVALID
        },
        custom: {
          options: (value: string, { req }) => {
            const returnDate = new Date(value)
            const departureDate = new Date(req.body.departure_date)
            if (returnDate <= departureDate) {
              throw new Error(MESSAGES.RETURN_DATE_MUST_BE_AFTER_DEPARTURE_DATE)
            }
            return true
          }
        }
      },
      price_adult: {
        notEmpty: {
          errorMessage: MESSAGES.PRICE_ADULT_IS_REQUIRED
        },
        isInt: {
          options: { min: 1 },
          errorMessage: MESSAGES.PRICE_ADULT_MUST_BE_A_POSITIVE_INTEGER
        },
        toInt: true
      },
      price_child: {
        notEmpty: {
          errorMessage: MESSAGES.PRICE_CHILD_IS_REQUIRED
        },
        isInt: {
          options: { min: 0 },
          errorMessage: MESSAGES.PRICE_CHILD_MUST_BE_NON_NEGATIVE
        },
        toInt: true
      },
      price_baby: {
        notEmpty: {
          errorMessage: MESSAGES.PRICE_BABY_IS_REQUIRED
        },
        isInt: {
          options: { min: 0 },
          errorMessage: MESSAGES.PRICE_BABY_MUST_BE_NON_NEGATIVE
        },
        toInt: true
      },
      total_slots: {
        notEmpty: {
          errorMessage: MESSAGES.TOTAL_SLOTS_IS_REQUIRED
        },
        isInt: {
          options: { min: 1 },
          errorMessage: MESSAGES.TOTAL_SLOTS_MUST_BE_A_POSITIVE_INTEGER
        },
        toInt: true
      },
      note: {
        optional: true,
        isString: {
          errorMessage: MESSAGES.NOTE_MUST_BE_A_STRING
        },
        trim: true
      }
    },
    ['body', 'params']
  )
)
