import { checkSchema } from 'express-validator'
import { ObjectId } from 'mongodb'
import HTTP_STATUS from '~/constants/httpStatus'
import { MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import databaseServices from '~/services/database.services'
import { validate } from '~/utils/validation'

export const getDetailCategoryValidator = validate(
  checkSchema(
    {
      id: {
        notEmpty: {
          errorMessage: MESSAGES.CATEGORY_ID_IS_REQUIRED
        },
        isMongoId: {
          errorMessage: MESSAGES.CATEGORY_ID_INVALID
        },
        custom: {
          options: async (value: string) => {
            const category = await databaseServices.categories.findOne({
              _id: new ObjectId(value)
            })
            if (!category) {
              throw new ErrorWithStatus({
                message: MESSAGES.CATEGORY_NOT_FOUND,
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
