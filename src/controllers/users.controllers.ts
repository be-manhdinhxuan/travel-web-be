import { Request, Response, NextFunction } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { UserRole } from '~/constants/enums'
import HTTP_STATUS from '~/constants/httpStatus'
import { MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { TokenPayload } from '~/models/requests/Auth.requests'
import {
  ChangePasswordReqBody,
  GetUserDetailReqParams,
  ToggleWishlistReqParams,
  UpdateMeReqBody,
  UpdateStatusReqBody,
  UpdateStatusReqParams,
  UpdateUserRoleReqBody,
  UpdateUserRoleReqParams
} from '~/models/requests/User.requests'
import usersService from '~/services/users.services'

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

export const toggleWishlistController = async (req: Request<ToggleWishlistReqParams>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { tour_id } = req.params

  const result = await usersService.toggleWishlist(user_id, tour_id)

  return res.json({
    message: 'Toggle wishlist success',
    result
  })
}

export const getMyWishlistController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const user = await usersService.getMyWishlist(user_id)
  return res.json({
    message: MESSAGES.GET_MY_WISHLIST_SUCCESS,
    result: user
  })
}

export const getUsersController = async (req: Request, res: Response, next: NextFunction) => {
  const currentUserRole = (req.decoded_authorization as TokenPayload)?.role ?? UserRole.User
  const result = await usersService.getUsers(req.query, currentUserRole)
  return res.json({
    message: 'Get users success',
    result
  })
}

export const getUserDetailController = async (
  req: Request<GetUserDetailReqParams>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.params

  const result = await usersService.getUserDetail(user_id)

  return res.json({
    message: MESSAGES.GET_USER_DETAIL_SUCCESS,
    result
  })
}

export const updateUserRoleController = async (
  req: Request<UpdateUserRoleReqParams, any, UpdateUserRoleReqBody>,
  res: Response
) => {
  const { id } = req.params
  const { role } = req.body

  const { user_id } = req.decoded_authorization as TokenPayload

  const result = await usersService.updateUserRole(user_id, id, role)

  return res.json({
    message: MESSAGES.UPDATE_USER_ROLE_SUCCESS,
    result
  })
}

export const updateUserStatusController = async (
  req: Request<UpdateStatusReqParams, any, UpdateStatusReqBody>,
  res: Response
) => {
  const { id } = req.params
  const { status } = req.body

  const { user_id } = req.decoded_authorization as TokenPayload

  const result = await usersService.updateUserStatus(user_id, id, status)

  return res.json({
    message: MESSAGES.UPDATE_USER_STATUS_SUCCESS,
    result
  })
}
