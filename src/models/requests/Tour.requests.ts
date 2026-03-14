import { ObjectId } from 'mongodb'

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
