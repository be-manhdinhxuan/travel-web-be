import { checkSchema } from "express-validator";
import { MESSAGES } from "~/constants/messages";
import { validate } from "~/utils/validation";


export const overviewStatsValidator = validate(
  checkSchema(
    {
      period: {
        notEmpty: {
          errorMessage: MESSAGES.PERIOD_IS_REQUIRED
        },
        isIn: {
          options: [['today', 'week', 'month', 'year']],
          errorMessage: MESSAGES.PERIOD_IS_INVALID
        }
      }
    },
    ['query']
  )
)

export const revenueStatsValidator = validate(
  checkSchema(
    {
      period: {
        notEmpty: {
          errorMessage: MESSAGES.PERIOD_IS_REQUIRED
        },
        isIn: {
          options: [['week', 'month', 'year']],
          errorMessage: MESSAGES.PERIOD_IS_INVALID
        }
      },
      year: {
        optional: true,
        isInt: {
          options: { min: 2000, max: 2100 },
          errorMessage: MESSAGES.YEAR_IS_INVALID
        },
        toInt: true
      }
    },
    ['query']
  )
)

export const topToursStatsValidator = validate(
  checkSchema(
    {
      period: {
        notEmpty: {
          errorMessage: MESSAGES.PERIOD_IS_REQUIRED
        },
        isIn: {
          options: [['week', 'month', 'year']],
          errorMessage: MESSAGES.PERIOD_IS_INVALID
        }
      },
      limit: {
        optional: true,
        isInt: {
          options: { min: 1, max: 20 },
          errorMessage: MESSAGES.LIMIT_MUST_BE_FROM_1_TO_20
        },
        toInt: true
      }
    },
    ['query']
  )
)