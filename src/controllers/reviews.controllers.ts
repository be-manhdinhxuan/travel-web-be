import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { MESSAGES } from '~/constants/messages'
import { CreateReviewReqBody, GetReviewsQuery } from '~/models/requests/Review.request'
import reviewsService from '~/services/reviews.services'

export const createReviewController = async (
  req: Request<ParamsDictionary, any, CreateReviewReqBody>,
  res: Response
) => {
  const user_id = req.decoded_authorization?.user_id as string
  const booking = req.booking!
  const result = await reviewsService.createReview(user_id, booking, req.body)
  return res.status(201).json({
    message: MESSAGES.CREATE_REVIEW_SUCCESS,
    result
  })
}

export const getReviewsController = async (req: Request, res: Response) => {
  const query = req.query as unknown as GetReviewsQuery

  const result = await reviewsService.getReviews(query)

  return res.json({
    message: MESSAGES.GET_REVIEWS_SUCCESS,
    result
  })
}
