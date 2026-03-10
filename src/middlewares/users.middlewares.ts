import { Request, Response, NextFunction } from 'express'
import { checkSchema, ParamSchema } from 'express-validator'
import { UserVerifyStatus } from '~/constants/enums'
import HTTP_STATUS from '~/constants/httpStatus'
import { MESSAGES } from '~/constants/messages'
import { REGEX_PHONE } from '~/constants/regex'
import { ErrorWithStatus } from '~/models/Errors'
import { TokenPayload } from '~/models/requests/Auth.requests'
import databaseService from '~/services/database.services'
import { validate } from '~/utils/validation'

const fullnameSchema: ParamSchema = {
  notEmpty: {
    errorMessage: MESSAGES.NAME_IS_REQUIRED
  },
  isString: {
    errorMessage: MESSAGES.NAME_MUST_BE_A_STRING
  },
  isLength: {
    options: {
      min: 1,
      max: 100
    },
    errorMessage: MESSAGES.NAME_LENGTH_MUST_BE_FROM_1_TO_100
  },
  trim: true
}

const dateOfBirthSchema: ParamSchema = {
  isISO8601: {
    options: {
      strict: true,
      strictSeparator: true
    },
    errorMessage: MESSAGES.DATE_OF_BIRTH_MUST_BE_ISO8601
  }
}

export const verifiedUserValidator = (req: Request, res: Response, next: NextFunction) => {
  const { verify } = req.decoded_authorization as TokenPayload
  if (verify !== UserVerifyStatus.Verified) {
    return next(
      new ErrorWithStatus({
        message: MESSAGES.USER_NOT_VERIFIED,
        status: HTTP_STATUS.FORBIDDEN
      })
    )
  }
  next()
}

export const updateMeValidator = validate(
  checkSchema(
    {
      full_name: { ...fullnameSchema, optional: true, notEmpty: undefined },
      date_of_birth: { ...dateOfBirthSchema, optional: true },
      phone: {
        optional: true,
        isString: {
          errorMessage: MESSAGES.PHONE_MUST_BE_STRING
        },
        trim: true,
        custom: {
          options: async (value, { req }) => {
            if (!REGEX_PHONE.test(value)) {
              throw Error(MESSAGES.PHONE_IS_INVALID)
            }
            const user = await databaseService.users.findOne({ phone: value })
            if (user) {
              throw Error(MESSAGES.PHONE_EXISTED)
            }
          }
        }
      },
      address: {
        optional: true,
        isString: {
          errorMessage: MESSAGES.ADDRESS_MUST_BE_STRING
        },
        trim: true,
        isLength: {
          options: {
            min: 1,
            max: 300
          },
          errorMessage: MESSAGES.ADDRESS_LENGTH_MUST_BE_FROM_1_TO_300
        }
      }
    },
    ['body']
  )
)
