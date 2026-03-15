import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { MESSAGES } from '~/constants/messages'
import { TokenPayload } from '~/models/requests/Auth.requests'
import { CreateScheduleReqBody, GetSchedulesQuery } from '~/models/requests/Schedule.requests'
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

export const getSchedulesController = async (
  req: Request<ParamsDictionary, any, any, GetSchedulesQuery>,
  res: Response
) => {
  const { tour_id } = req.params
  const { role } = (req.decoded_authorization as TokenPayload) || {}
  const result = await schedulesService.getSchedules(tour_id as string, req.query, role)
  return res.json({
    message: MESSAGES.GET_SCHEDULES_SUCCESS,
    result
  })
}
