import { checkSchema } from "express-validator";
import { MESSAGES } from "~/constants/messages";
import { validate } from "~/utils/validation";


export const createCategoryValidator = validate(
  checkSchema({
    name: {
      notEmpty: {
        errorMessage: MESSAGES.CATEGORY_NAME_IS_REQUIRED
      },
      isString: {
        errorMessage: MESSAGES.CATEGORY_NAME_MUST_BE_STRING
      },
      trim: true,
      isLength: {
        options: { min: 1, max: 200 },
        errorMessage: MESSAGES.CATEGORY_NAME_LENGTH_INVALID
      }
    },
    description: {
      optional: true,
      isString: {
        errorMessage: MESSAGES.DESCRIPTION_MUST_BE_STRING
      },
      trim: true
    }
  })
)