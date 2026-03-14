import { ObjectId } from 'mongodb'
import { TourStatus } from '~/constants/enums'

export interface ItineraryDayType {
  day: number
  title: string
  description: string
}

interface TourType {
  _id?: ObjectId
  category_id: ObjectId
  name: string
  slug: string // tạo URL: /tours/tour-ha-noi
  description?: string
  highlights?: string[]
  destination: string
  departure_city: string
  duration_days: number
  duration_nights: number
  images?: string[]
  itinerary?: ItineraryDayType[]
  includes?: string[]
  excludes?: string[]
  status?: TourStatus
  created_at?: Date
  updated_at?: Date
}

export default class Tour {
  _id?: ObjectId
  category_id: ObjectId
  name: string
  slug: string // tạo URL: /tours/tour-ha-noi
  description: string
  highlights: string[]
  destination: string
  departure_city: string
  duration_days: number
  duration_nights: number
  images: string[]
  itinerary: ItineraryDayType[]
  includes: string[]
  excludes: string[]
  status: TourStatus
  created_at: Date
  updated_at: Date
  constructor(tour: TourType) {
    const date = new Date()
    this._id = tour._id
    this.category_id = tour.category_id
    this.name = tour.name
    this.slug = tour.slug
    this.description = tour.description || ''
    this.highlights = tour.highlights || []
    this.destination = tour.destination
    this.departure_city = tour.departure_city
    this.duration_days = tour.duration_days
    this.duration_nights = tour.duration_nights
    this.images = tour.images || []
    this.itinerary = tour.itinerary || []
    this.includes = tour.includes || []
    this.excludes = tour.excludes || []
    this.status = tour.status ?? TourStatus.Inactive
    this.created_at = tour.created_at || date
    this.updated_at = tour.updated_at || date
  }
}
