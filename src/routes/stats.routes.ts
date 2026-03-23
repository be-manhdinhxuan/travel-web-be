import { Router } from 'express'
import { UserRole } from '~/constants/enums'
import {
  getOverviewStatsController,
  getRevenueStatsController,
  getTopToursStatsController
} from '~/controllers/stats.controllers'
import { authorize } from '~/middlewares/authorize.middlewares'
import { accessTokenValidator } from '~/middlewares/auths.middlewares'
import { overviewStatsValidator, revenueStatsValidator, topToursStatsValidator } from '~/middlewares/stats.middlewares'
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
  authorize([UserRole.Admin]),
  overviewStatsValidator,
  wrapRequestHandler(getOverviewStatsController)
)

/**
 * Description: Get revenue stats
 * Path: /revenue
 * Method: GET
 * Header: { Authorization: Bearer <access_token> }
 * Query: { period (week | month | year), year (int) }
 */
statsRouter.get(
  '/revenue',
  accessTokenValidator,
  verifiedUserValidator,
  authorize([UserRole.Admin]),
  revenueStatsValidator,
  wrapRequestHandler(getRevenueStatsController)
)

/**
 * Description: Get top tours stats
 * Path: /top-tours
 * Method: GET
 * Header: { Authorization: Bearer <access_token> }
 * Query: { period (week | month | year), limit (int, default 10) }
 */
statsRouter.get(
  '/top-tours',
  accessTokenValidator,
  verifiedUserValidator,
  authorize([UserRole.Admin]),
  topToursStatsValidator,
  wrapRequestHandler(getTopToursStatsController)
)

export default statsRouter
