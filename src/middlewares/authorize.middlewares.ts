import { Request, Response, NextFunction } from 'express'
import { UserRole } from '~/constants/enums'
import HTTP_STATUS from '~/constants/httpStatus'
import { MESSAGES } from '~/constants/messages'

export const authorize = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.decoded_authorization?.role as UserRole)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        message: MESSAGES.NOT_AUTHORIZED
      })
    }
    next()
  }
}
