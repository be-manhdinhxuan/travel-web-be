import { Request, Response, NextFunction } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import { MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { TokenPayload } from '~/models/requests/Auth.requests'
import { UpdateMeReqBody } from '~/models/requests/User.requests'
import usersService from '~/services/user.services'

export const getMeController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const user = await usersService.getMe(user_id)
  return res.json({
    message: MESSAGES.GET_ME_SUCCESS,
    result: user
  })
}

export const updateMeController = async (
  req: Request<ParamsDictionary, any, UpdateMeReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { body } = req
  const user = await usersService.updateMe(user_id, body)
  return res.json({
    message: MESSAGES.UPDATE_ME_SUCCESS,
    result: user
  })
}

export const updateAvatarController = async (
  req: Request,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayload

  if (!req.file) {
    throw new ErrorWithStatus({
      message: MESSAGES.AVATAR_IS_REQUIRED,
      status: HTTP_STATUS.BAD_REQUEST
    })
  }

  const result = await usersService.updateAvatar(user_id, req.file)

  return res.json({
    message: MESSAGES.UPLOAD_AVATAR_SUCCESS,
    result
  })
}