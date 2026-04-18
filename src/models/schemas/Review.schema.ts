import { ObjectId } from 'mongodb'

interface ReviewType {
  _id?: ObjectId
  user_id: ObjectId
  tour_id: ObjectId
  booking_id: ObjectId
  rating: number // 1-5
  comment?: string
  created_at?: Date
  updated_at?: Date
}

export default class Review {
  _id?: ObjectId
  user_id: ObjectId
  tour_id: ObjectId
  booking_id: ObjectId
  rating: number
  comment: string
  created_at: Date
  updated_at: Date

  constructor(review: ReviewType) {
    const date = new Date()
    this._id = review._id
    this.user_id = new ObjectId(review.user_id)
    this.tour_id = new ObjectId(review.tour_id)
    this.booking_id = new ObjectId(review.booking_id)
    this.rating = review.rating
    this.comment = review.comment || ''
    this.created_at = review.created_at || date
    this.updated_at = review.updated_at || date
  }
}
