import { Request, Response } from 'express'
import { MESSAGES } from '~/constants/messages'
import { CreateTourReqBody, GetToursQuery } from '~/models/requests/Tour.requests'
import toursService from '~/services/tour.services'
import { ParamsDictionary } from 'express-serve-static-core'
import { TokenPayload } from '~/models/requests/Auth.requests'

export const createTourController = async (req: Request<ParamsDictionary, any, CreateTourReqBody>, res: Response) => {
  const files = req.files as Express.Multer.File[]
  const body = req.body

  const result = await toursService.createTour(body, files)

  return res.status(201).json({
    message: MESSAGES.CREATE_TOUR_SUCCESS,
    result
  })
}

export const getToursController = async (req: Request<ParamsDictionary, any, any, GetToursQuery>, res: Response) => {
  const result = await toursService.getTours(req.query)
  return res.json({
    message: MESSAGES.GET_TOURS_SUCCESS,
    result
  })
}

export const getDetailTourController = async (req: Request, res: Response) => {
  const { slug } = req.params
  const { role } = (req.decoded_authorization as TokenPayload) || {}
  const tour = await toursService.getDetailTour(slug as string, role)
  return res.json({
    message: MESSAGES.GET_DETAIL_TOUR_SUCCESS,
    result: { tour }
  })
}
