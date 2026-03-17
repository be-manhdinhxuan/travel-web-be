import { checkSchema } from 'express-validator'
import { ObjectId } from 'mongodb'
import HTTP_STATUS from '~/constants/httpStatus'
import { MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import databaseServices from '~/services/database.services'
import { validate } from '~/utils/validation'

export const createCouponValidator = validate(
  checkSchema(
    {
      code: {
        notEmpty: {
          errorMessage: MESSAGES.COUPON_CODE_IS_REQUIRED
        },
        isString: {
          errorMessage: MESSAGES.COUPON_CODE_MUST_BE_A_STRING
        },
        trim: true,
        toUpperCase: true,
        isLength: {
          options: { min: 3, max: 20 },
          errorMessage: MESSAGES.COUPON_CODE_LENGTH_INVALID
        },
        custom: {
          options: async (value: string) => {
            const coupon = await databaseServices.coupons.findOne({
              code: value.toUpperCase()
            })
            if (coupon) {
              throw new ErrorWithStatus({
                message: MESSAGES.COUPON_CODE_ALREADY_EXISTS,
                status: HTTP_STATUS.CONFLICT
              })
            }
            return true
          }
        }
      },
      value: {
        notEmpty: {
          errorMessage: MESSAGES.COUPON_VALUE_IS_REQUIRED
        },
        isInt: {
          options: { min: 1 },
          errorMessage: MESSAGES.COUPON_VALUE_MUST_BE_A_POSITIVE_INTEGER
        },
        toInt: true
      },
      min_order_value: {
        notEmpty: {
          errorMessage: MESSAGES.COUPON_MIN_ORDER_VALUE_IS_REQUIRED
        },
        isInt: {
          options: { min: 0 },
          errorMessage: MESSAGES.COUPON_MIN_ORDER_VALUE_MUST_BE_NON_NEGATIVE
        },
        toInt: true
      },
      max_usage: {
        notEmpty: {
          errorMessage: MESSAGES.COUPON_MAX_USAGE_IS_REQUIRED
        },
        isInt: {
          options: { min: 1 },
          errorMessage: MESSAGES.COUPON_MAX_USAGE_MUST_BE_A_POSITIVE_INTEGER
        },
        toInt: true
      },
      expires_at: {
        notEmpty: {
          errorMessage: MESSAGES.COUPON_EXPIRES_AT_IS_REQUIRED
        },
        isISO8601: {
          options: { strict: true },
          errorMessage: MESSAGES.COUPON_EXPIRES_AT_IS_INVALID
        },
        custom: {
          options: (value: string) => {
            if (new Date(value) <= new Date()) {
              throw new Error(MESSAGES.COUPON_EXPIRES_AT_MUST_BE_IN_FUTURE)
            }
            return true
          }
        }
      }
    },
    ['body']
  )
)

export const getCouponsValidator = validate(
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
      is_active: {
        optional: true,
        isBoolean: {
          errorMessage: MESSAGES.IS_ACTIVE_MUST_BE_A_BOOLEAN
        },
        toBoolean: true
      },
      keyword: {
        optional: true,
        isString: {
          errorMessage: MESSAGES.KEYWORD_MUST_BE_A_STRING
        },
        trim: true
      }
    },
    ['query']
  )
)

export const updateCouponValidator = validate(
  checkSchema(
    {
      id: {
        custom: {
          options: async (value: string) => {
            if (!ObjectId.isValid(value)) {
              throw new ErrorWithStatus({
                message: MESSAGES.COUPON_ID_IS_INVALID,
                status: HTTP_STATUS.BAD_REQUEST
              })
            }
            const coupon = await databaseServices.coupons.findOne({
              _id: new ObjectId(value)
            })
            if (!coupon) {
              throw new ErrorWithStatus({
                message: MESSAGES.COUPON_NOT_FOUND,
                status: HTTP_STATUS.NOT_FOUND
              })
            }
            return true
          }
        }
      },
      code: {
        optional: true,
        isString: {
          errorMessage: MESSAGES.COUPON_CODE_MUST_BE_A_STRING
        },
        trim: true,
        toUpperCase: true,
        isLength: {
          options: { min: 3, max: 20 },
          errorMessage: MESSAGES.COUPON_CODE_LENGTH_INVALID
        },
        custom: {
          options: async (value: string, { req }) => {
            const coupon = await databaseServices.coupons.findOne({
              code: value.toUpperCase(),
              _id: { $ne: new ObjectId(req.params?.id) }
            })
            if (coupon) {
              throw new ErrorWithStatus({
                message: MESSAGES.COUPON_CODE_ALREADY_EXISTS,
                status: HTTP_STATUS.CONFLICT
              })
            }
            return true
          }
        }
      },
      value: {
        optional: true,
        isInt: {
          options: { min: 1 },
          errorMessage: MESSAGES.COUPON_VALUE_MUST_BE_A_POSITIVE_INTEGER
        },
        toInt: true
      },
      min_order_value: {
        optional: true,
        isInt: {
          options: { min: 0 },
          errorMessage: MESSAGES.COUPON_MIN_ORDER_VALUE_MUST_BE_NON_NEGATIVE
        },
        toInt: true
      },
      max_usage: {
        optional: true,
        isInt: {
          options: { min: 1 },
          errorMessage: MESSAGES.COUPON_MAX_USAGE_MUST_BE_A_POSITIVE_INTEGER
        },
        toInt: true
      },
      expires_at: {
        optional: true,
        isISO8601: {
          options: { strict: true },
          errorMessage: MESSAGES.COUPON_EXPIRES_AT_IS_INVALID
        },
        custom: {
          options: (value: string) => {
            if (new Date(value) <= new Date()) {
              throw new Error(MESSAGES.COUPON_EXPIRES_AT_MUST_BE_IN_FUTURE)
            }
            return true
          }
        }
      }
    },
    ['body', 'params']
  )
)

export const couponIdValidator = validate(
  checkSchema(
    {
      id: {
        custom: {
          options: async (value: string) => {
            if (!ObjectId.isValid(value)) {
              throw new ErrorWithStatus({
                message: MESSAGES.COUPON_ID_IS_INVALID,
                status: HTTP_STATUS.BAD_REQUEST
              })
            }
            const coupon = await databaseServices.coupons.findOne({
              _id: new ObjectId(value)
            })
            if (!coupon) {
              throw new ErrorWithStatus({
                message: MESSAGES.COUPON_NOT_FOUND,
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
