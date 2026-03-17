import { checkSchema } from "express-validator"
import HTTP_STATUS from "~/constants/httpStatus"
import { MESSAGES } from "~/constants/messages"
import { ErrorWithStatus } from "~/models/Errors"
import databaseServices from "~/services/database.services"
import { validate } from "~/utils/validation"


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