import { ObjectId } from 'mongodb'
import { ParamsDictionary } from 'express-serve-static-core'

interface ItineraryDayType {
  day: number
  title: string
  description: string
}

export interface CreateTourReqBody {
  category_id: string
  name: string
  description?: string
  highlights?: string[]
  destination: string
  departure_city: string
  duration_days: number
  duration_nights: number
  itinerary?: ItineraryDayType[]
  includes?: string[]
  excludes?: string[]
}

export interface GetToursQuery {
  page?: number
  limit?: number
  keyword?: string
  category_id?: string
  destination?: string
  departure_date?: string
  num_adults?: number
  num_children?: number
  min_price?: number
  max_price?: number
  sort?: 'price_asc' | 'price_desc' | 'newest'
}
