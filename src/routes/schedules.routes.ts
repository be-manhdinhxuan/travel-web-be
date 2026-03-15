import { Router } from 'express'
import { UserRole } from '~/constants/enums'
import { deleteScheduleController, updateScheduleController } from '~/controllers/schedules.controllers'
import { authorize } from '~/middlewares/authorize.middlewares'
import { accessTokenValidator } from '~/middlewares/auths.middlewares'
import { deleteScheduleValidator, updateScheduleValidator } from '~/middlewares/schedules.middlewares'
import { verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const schedulesRouter = Router()

/**
 * Description: Update schedule of a tour
 * Path: /:id
 * Method: PUT
 * Header: { Authorization: Bearer <access_token>}
 * Param: id - tour id
 * Body: {departure_date (Date)
return_date (Date)
price_adult (number)
price_child (number)
price_baby (number)
total_slots (number)
status (number, 0: available, 1: full, 2: cancelled)
note (string)
 */
schedulesRouter.put(
  '/:id',
  accessTokenValidator,
  verifiedUserValidator,
  authorize(UserRole.Admin),
  updateScheduleValidator,
  wrapRequestHandler(updateScheduleController)
)

/**
 * Description: Delete schedule of a tour
 * Path: /:id
 * Method: DELETE
 * Header: { Authorization: Bearer <access_token>}
 * Param: id - tour id
 */
schedulesRouter.delete(
  '/:id',
  accessTokenValidator,
  verifiedUserValidator,
  authorize(UserRole.Admin),
  deleteScheduleValidator,
  wrapRequestHandler(deleteScheduleController)
)

export default schedulesRouter
