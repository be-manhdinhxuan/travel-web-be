import { Request, Response, NextFunction } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { ObjectId } from 'mongodb'
import { UserVerifyStatus } from '~/constants/enums'
import HTTP_STATUS from '~/constants/httpStatus'
import { MESSAGES } from '~/constants/messages'
import {
  ForgotPasswordReqBody,
  LoginReqBody,
  LogoutReqBody,
  RefreshTokenReqBody,
  RegisterReqBody,
  TokenPayload,
  VerifyEmailReqBody,
  VerifyForgotPasswordReqBody
} from '~/models/requests/Auth.requests'
import User from '~/models/schemas/User.schema'
import authsService from '~/services/auth.services'
import databaseServices from '~/services/database.services'

export const registerController = async (
  req: Request<ParamsDictionary, any, RegisterReqBody>,
  res: Response,
  next: NextFunction
) => {
  const result = await authsService.register(req.body)
  return res.status(HTTP_STATUS.CREATED).json({
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

export const resendVerifyEmailController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload

  const result = await authsService.resendEmailVerify(user_id)

  return res.json(result)
}

export const loginController = async (req: Request<ParamsDictionary, any, LoginReqBody>, res: Response) => {
  const user = req.user as User
  const user_id = user._id as ObjectId
  const result = await authsService.login({ user_id: user_id.toString(), role: user.role, verify: user.verify })
  return res.json({
    message: MESSAGES.LOGIN_SUCCESS,
    result
  })
}

export const logoutController = async (req: Request<ParamsDictionary, any, LogoutReqBody>, res: Response) => {
  const { refresh_token } = req.body
  const result = await authsService.logout(refresh_token)
  return res.json({
    message: MESSAGES.LOGOUT_SUCCESS,
    result
  })
}

export const refreshTokenController = async (
  req: Request<ParamsDictionary, any, RefreshTokenReqBody>,
  res: Response
) => {
  const { refresh_token } = req.body
  const { user_id, role, verify } = req.decoded_refresh_token as TokenPayload
  const result = await authsService.refreshToken({ user_id, role, verify, refresh_token })
  return res.json({
    message: MESSAGES.REFRESH_TOKEN_SUCCESS,
    result
  })
}

export const forgotPasswordController = async (
  req: Request<ParamsDictionary, any, ForgotPasswordReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { _id, verify } = req.user as User
  const result = await authsService.forgotPassword({ user_id: (_id as ObjectId).toString(), verify })
  return res.json({
    message: MESSAGES.FORGOT_PASSWORD_SUCCESS,
    result
  })
}

export const verifyForgotPasswordController = async (
  req: Request<ParamsDictionary, any, VerifyForgotPasswordReqBody>,
  res: Response,
  next: NextFunction
) => {
  return res.json({
    message: MESSAGES.VERIFY_FORGOT_PASSWORD_SUCCESS
  })
}
