import { Request, Response, NextFunction } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import { MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { TokenPayload } from '~/models/requests/Auth.requests'
import { ChangePasswordReqBody, UpdateMeReqBody } from '~/models/requests/User.requests'
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

export const updateAvatarController = async (req: Request, res: Response, next: NextFunction) => {
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

export const changePasswordController = async (
  req: Request<ParamsDictionary, any, ChangePasswordReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { password, new_password } = req.body
  await usersService.changePassword(user_id, password, new_password)
  return res.json({
    message: MESSAGES.CHANGE_PASSWORD_SUCCESS
  })
}

export const toggleWishlistController = async (
  req: Request<ParamsDictionary & { tour_id: string }>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { tour_id } = req.params

  const result = await usersService.toggleWishlist(user_id, tour_id)

  return res.json({
    message: 'Toggle wishlist success',
    result
  })
}