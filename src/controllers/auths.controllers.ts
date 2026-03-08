import { Request, Response, NextFunction } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { ObjectId } from 'mongodb'
import { UserVerifyStatus } from '~/constants/enums'
import HTTP_STATUS from '~/constants/httpStatus'
import { MESSAGES } from '~/constants/messages'
import { RegisterReqBody, TokenPayload, VerifyEmailReqBody } from '~/models/requests/User.requests'
import authsService from '~/services/auth.services'
import databaseServices from '~/services/database.services'

export const registerController = async (
  req: Request<ParamsDictionary, any, RegisterReqBody>,
  res: Response,
  next: NextFunction
) => {
  // throw new Error('Test error')
  const result = await authsService.register(req.body)
  return res.json({
    message: MESSAGES.REGISTER_SUCCESS,
    result
  })
}

export const verifyEmailController = async (req: Request<ParamsDictionary, any, VerifyEmailReqBody>, res: Response) => {
  const { user_id } = req.decoded_email_verify_token as TokenPayload

  const result = await authsService.verifyEmail(user_id)

  return res.json({
    message: MESSAGES.EMAIL_VERIFY_SUCCESS,
    result
  })
}

export const resendVerifyEmailController = async (
  req: Request,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayload

  const result = await authsService.resendEmailVerify(user_id)

  return res.json(result)
}