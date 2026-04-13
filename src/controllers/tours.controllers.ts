import { Request, Response } from 'express'
import { MESSAGES } from '~/constants/messages'
import { CreateTourReqBody, GetToursQuery, UpdateTourReqBody } from '~/models/requests/Tour.requests'
import toursService from '~/services/tours.services'
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
  const { role } = (req.decoded_authorization as TokenPayload) || {}
  const result = await toursService.getTours(req.query, role)
  return res.json({
    message: MESSAGES.GET_TOURS_SUCCESS,
    result
  })
}

export const getRecommendedToursController = async (req: Request, res: Response) => {
  const user_id = req.decoded_authorization?.user_id as string | undefined

  const result = await toursService.getRecommendedTours(user_id)

  return res.json({
    message: MESSAGES.GET_RECOMMENDED_TOURS_SUCCESS,
    result
  })
}

export const getDetailTourController = async (req: Request, res: Response) => {
  const { role } = (req.decoded_authorization as TokenPayload) || {}
  const { slug } = req.params
  const tour = await toursService.getDetailTour(slug as string, role)
  return res.json({
    message: MESSAGES.GET_DETAIL_TOUR_SUCCESS,
    result: { tour }
  })
}

export const updateTourController = async (req: Request<ParamsDictionary, any, UpdateTourReqBody>, res: Response) => {
  const { id } = req.params
  const files = req.files as Express.Multer.File[] | undefined
  const body = req.body

  const result = await toursService.updateTour(id as string, body, files)

  return res.json({
    message: MESSAGES.UPDATE_TOUR_SUCCESS,
    result
  })
}

export const updateTourStatusController = async (
  req: Request<ParamsDictionary, any, { status: number }>,
  res: Response
) => {
  const { id } = req.params
  const { status } = req.body
  const result = await toursService.updateTourStatus(id as string, status)

  return res.json({
    message: MESSAGES.UPDATE_TOUR_STATUS_SUCCESS,
    result
  })
}

export const deleteTourController = async (req: Request, res: Response) => {
  const { id } = req.params
  await toursService.deleteTour(id as string)

  return res.json({
    message: MESSAGES.DELETE_TOUR_SUCCESS
  })
}
