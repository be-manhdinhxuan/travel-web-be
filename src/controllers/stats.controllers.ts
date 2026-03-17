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

export const getRevenueStatsController = async (req: Request, res: Response) => {
  const { period, year } = req.query as { period: string; year?: string }
  const result = await statsService.getRevenueStats(period, year ? Number(year) : undefined)
  return res.json({
    message: MESSAGES.GET_STATS_SUCCESS,
    result
  })
}

export const getTopToursStatsController = async (req: Request, res: Response) => {
  const { period, limit } = req.query as { period: string; limit?: string }
  const result = await statsService.getTopToursStats(period, limit ? Number(limit) : 10)
  return res.json({
    message: MESSAGES.GET_STATS_SUCCESS,
    result
  })
}