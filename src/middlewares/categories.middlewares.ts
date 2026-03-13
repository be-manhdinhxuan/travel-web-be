import { Request } from 'express'
import { checkSchema } from 'express-validator'
import { JsonWebTokenError } from 'jsonwebtoken'
import { capitalize } from 'lodash'
import { ObjectId } from 'mongodb'
import HTTP_STATUS from '~/constants/httpStatus'
import { MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import databaseServices from '~/services/database.services'
import { verifyToken } from '~/utils/jwt'
import { validate } from '~/utils/validation'

export const optionalAccessTokenValidator = validate(
  checkSchema(
    {
      Authorization: {
        optional: true,
        custom: {
          options: async (value: string, { req }) => {
            const access_token = (value || '').split(' ')[1]
            if (!access_token) return true // không có token thì bỏ qua
            try {
              const decoded_authorization = await verifyToken({
                token: access_token,
                secretOrPublicKey: process.env.JWT_SECRET_ACCESS_TOKEN as string
              })
              ;(req as Request).decoded_authorization = decoded_authorization
            } catch (error) {
              throw new ErrorWithStatus({
                message: capitalize((error as JsonWebTokenError).message),
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }
            return true
          }
        }
      }
    },
    ['headers']
  )
)

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
  checkSchema(
    {
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
    },
    ['body']
  )
)

export const updateCategoryValidator = validate(
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
      },
      name: {
        optional: true,
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
      },
      is_active: {
        optional: true,
        isBoolean: {
          errorMessage: MESSAGES.CATEGORY_STATUS_IS_INVALID
        }
      }
    },
    ['body', 'params']
  )
)
