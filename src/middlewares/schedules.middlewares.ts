import { checkSchema, ParamSchema } from 'express-validator'
import { validate } from '~/utils/validation'
import { idTourValidator } from './tours.middlewares'
import { MESSAGES } from '~/constants/messages'
import databaseServices from '~/services/database.services'
import { ObjectId } from 'mongodb'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
import { ScheduleStatus } from '~/constants/enums'
import { nowVNDate } from '~/utils/time'

export const idScheduleValidator: ParamSchema = {
  notEmpty: {
    errorMessage: MESSAGES.SCHEDULE_ID_IS_REQUIRED
  },
  isMongoId: {
    errorMessage: MESSAGES.SCHEDULE_ID_IS_INVALID
  },
  custom: {
    options: async (value: string) => {
      const schedule = await databaseServices.schedules.findOne({
        _id: new ObjectId(value)
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
}

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
            if (date <= nowVNDate()) {
              throw new Error(MESSAGES.DEPARTURE_DATE_MUST_BE_IN_FUTURE)
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

export const getSchedulesValidator = validate(
  checkSchema(
    {
      tour_id: idTourValidator
    },
    ['params', 'query']
  )
)

export const updateScheduleValidator = validate(
  checkSchema(
    {
      id: idScheduleValidator,
      departure_date: {
        optional: true,
        isISO8601: {
          options: { strict: true },
          errorMessage: MESSAGES.DEPARTURE_DATE_IS_INVALID
        },
        custom: {
          options: (value: string) => {
            const date = new Date(value)
            if (date <= nowVNDate()) {
              throw new Error(MESSAGES.DEPARTURE_DATE_MUST_BE_IN_FUTURE)
            }
            return true
          }
        }
      },
      price_adult: {
        optional: true,
        isInt: {
          options: { min: 1 },
          errorMessage: MESSAGES.PRICE_ADULT_MUST_BE_A_POSITIVE_INTEGER
        },
        toInt: true
      },
      price_child: {
        optional: true,
        isInt: {
          options: { min: 0 },
          errorMessage: MESSAGES.PRICE_CHILD_MUST_BE_NON_NEGATIVE
        },
        toInt: true
      },
      price_baby: {
        optional: true,
        isInt: {
          options: { min: 0 },
          errorMessage: MESSAGES.PRICE_BABY_MUST_BE_NON_NEGATIVE
        },
        toInt: true
      },
      total_slots: {
        optional: true,
        isInt: {
          options: { min: 1 },
          errorMessage: MESSAGES.TOTAL_SLOTS_MUST_BE_A_POSITIVE_INTEGER
        },
        toInt: true
      },
      status: {
        optional: true,
        isIn: {
          options: [[ScheduleStatus.Cancelled, ScheduleStatus.Available, ScheduleStatus.Full]],
          errorMessage: MESSAGES.SCHEDULE_STATUS_IS_INVALID
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

export const deleteScheduleValidator = validate(
  checkSchema(
    {
      id: idScheduleValidator
    },
    ['params']
  )
)
