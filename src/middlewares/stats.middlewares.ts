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