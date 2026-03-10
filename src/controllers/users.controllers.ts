import { Request, Response, NextFunction } from 'express'
import { MESSAGES } from '~/constants/messages'
import { TokenPayload } from '~/models/requests/Auth.requests'
import usersService from '~/services/user.services'


export const getMeController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const user = await usersService.getMe(user_id)
  return res.json({
    message: MESSAGES.GET_ME_SUCCESS,
    result: user
  })
}