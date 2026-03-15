import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { MESSAGES } from '~/constants/messages'
import { CreateScheduleReqBody } from '~/models/requests/Schedule.requests'
import schedulesService from '~/services/schedule.services'

export const createScheduleController = async (
  req: Request<ParamsDictionary, any, CreateScheduleReqBody>,
  res: Response
) => {
  const { tour_id } = req.params
  const result = await schedulesService.createSchedule(tour_id as string, req.body)
  return res.status(201).json({
    message: MESSAGES.CREATE_SCHEDULE_SUCCESS,
    result
  })
}
