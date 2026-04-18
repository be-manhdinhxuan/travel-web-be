export interface CreateReviewReqBody {
  booking_id: string
  rating: number
  comment?: string
}

export interface GetReviewsQuery {
  tour_id: string
  page?: number
  limit?: number
}
