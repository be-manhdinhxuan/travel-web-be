import { ObjectId } from 'mongodb'
import databaseServices from './database.services'
import Review from '~/models/schemas/Review.schema'
import Booking from '~/models/schemas/Booking.schema'
import { CreateReviewReqBody, GetReviewsQuery } from '~/models/requests/Review.request'

class ReviewsService {
  async createReview(user_id: string, booking: Booking, payload: CreateReviewReqBody) {
    const { booking_id, rating, comment } = payload

    const review = new Review({
      user_id: new ObjectId(user_id),
      tour_id: booking.tour_snapshot.tour_id,
      booking_id: new ObjectId(booking_id),
      rating,
      comment
    })

    await databaseServices.reviews.insertOne(review)

    // cập nhật average_rating và total_reviews trong Tour
    // dùng aggregation để tính chính xác
    const stats = await databaseServices.reviews
      .aggregate([
        { $match: { tour_id: booking.tour_snapshot.tour_id } },
        {
          $group: {
            _id: '$tour_id',
            average_rating: { $avg: '$rating' },
            total_reviews: { $sum: 1 }
          }
        }
      ])
      .toArray()

    if (stats.length > 0) {
      await databaseServices.tours.updateOne(
        { _id: booking.tour_snapshot.tour_id },
        {
          $set: {
            average_rating: Math.round(stats[0].average_rating * 10) / 10, // làm tròn 1 chữ số thập phân
            total_reviews: stats[0].total_reviews,
            updated_at: new Date()
          }
        }
      )
    }

    return { review }
  }

  async getReviews(query: GetReviewsQuery) {
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 10
    const skip = (page - 1) * limit

    const tour_id = new ObjectId(query.tour_id)

    const [reviews, total] = await Promise.all([
      databaseServices.reviews
        .aggregate([
          { $match: { tour_id } },
          { $sort: { created_at: -1 } },
          { $skip: skip },
          { $limit: limit },
          // join user info
          {
            $lookup: {
              from: 'users',
              localField: 'user_id',
              foreignField: '_id',
              as: 'user_info'
            }
          },
          {
            $addFields: {
              user: {
                _id: { $arrayElemAt: ['$user_info._id', 0] },
                full_name: { $arrayElemAt: ['$user_info.full_name', 0] },
                avatar: { $arrayElemAt: ['$user_info.avatar', 0] }
              }
            }
          },
          { $project: { user_info: 0 } }
        ])
        .toArray(),
      databaseServices.reviews.countDocuments({ tour_id })
    ])

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    }
  }
}

const reviewsService = new ReviewsService()
export default reviewsService
