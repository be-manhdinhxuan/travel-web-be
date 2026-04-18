import { Router } from 'express'
import { createReviewController, getReviewsController } from '~/controllers/reviews.controllers'
import { accessTokenValidator } from '~/middlewares/auths.middlewares'
import { createReviewValidator, getReviewsValidator } from '~/middlewares/reviews.middlewares'
import { verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const reviewsRouter = Router()

/**
 * Description: Create a review
 * Path: /
 * Method: POST
 * Header: { Authorization: Bearer <access_token> }
 * Body: { booking_id, rating, comment }
 */
reviewsRouter.post(
  '/',
  accessTokenValidator,
  verifiedUserValidator,
  createReviewValidator,
  wrapRequestHandler(createReviewController)
)

/**
 * Description: Get reviews by tour
 * Path: /
 * Method: GET
 * Query: { tour_id (required), page, limit }
 */
reviewsRouter.get('/', getReviewsValidator, wrapRequestHandler(getReviewsController))

export default reviewsRouter
