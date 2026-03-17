import { Request, Response } from 'express'
import { MESSAGES } from '~/constants/messages'
import statsService from '~/services/stats.services'

export const getOverviewStatsController = async (req: Request, res: Response) => {
  const { period } = req.query as { period: string }
  const result = await statsService.getOverviewStats(period)
  return res.json({
    message: MESSAGES.GET_STATS_SUCCESS,
    result
  })
}