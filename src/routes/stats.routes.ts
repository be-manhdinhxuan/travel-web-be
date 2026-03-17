import { Router } from 'express'
import { UserRole } from '~/constants/enums'
import { getOverviewStatsController } from '~/controllers/stats.controllers'
import { authorize } from '~/middlewares/authorize.middlewares'
import { accessTokenValidator } from '~/middlewares/auths.middlewares'
import { overviewStatsValidator } from '~/middlewares/stats.middlewares'
import { verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const statsRouter = Router()

/**
 * Description: Get dashboard overview stats
 * Path: /overview
 * Method: GET
 * Header: { Authorization: Bearer <access_token> }
 * Query: { period (today | week | month | year) }
 */
statsRouter.get(
  '/overview',
  accessTokenValidator,
  verifiedUserValidator,
  authorize(UserRole.Admin),
  overviewStatsValidator,
  wrapRequestHandler(getOverviewStatsController)
)

export default statsRouter
