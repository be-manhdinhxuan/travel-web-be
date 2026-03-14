import { Request, Response } from 'express'
import { MESSAGES } from '~/constants/messages'
import { CreateTourReqBody } from '~/models/requests/Tour.requests'
import toursService from '~/services/tour.services'

export const createTourController = async (req: Request<any, any, CreateTourReqBody>, res: Response) => {
  const files = req.files as Express.Multer.File[]
  const body = req.body

  const result = await toursService.createTour(body, files)

  return res.status(201).json({
    message: MESSAGES.CREATE_TOUR_SUCCESS,
    result
  })
}
