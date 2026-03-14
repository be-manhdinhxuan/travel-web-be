import { Document, Filter, ObjectId } from 'mongodb'
import { CreateTourReqBody, GetToursQuery } from '~/models/requests/Tour.requests'
import Tour from '~/models/schemas/Tour.schema'
import { generateUniqueSlug } from '~/utils/generateSlug'
import { uploadImageToCloudinary } from '~/utils/uploadImageToCloudinary'
import databaseServices from './database.services'
import { ScheduleStatus, TourStatus } from '~/constants/enums'
import Schedule from '~/models/schemas/Schedule.schema'

class ToursService {
  async createTour(payload: CreateTourReqBody, files: Express.Multer.File[]) {
    const images: string[] = []

    if (files?.length) {
      const uploads = await Promise.all(files.map((file) => uploadImageToCloudinary(file.buffer, 'tours')))

      uploads.forEach((img: any) => images.push(img.secure_url))
    }

    const slug = await generateUniqueSlug(payload.name)

    const tour = new Tour({
      category_id: new ObjectId(payload.category_id),
      name: payload.name,
      slug,
      description: payload.description,
      highlights: payload.highlights,
      destination: payload.destination,
      departure_city: payload.departure_city,
      duration_days: Number(payload.duration_days),
      duration_nights: Number(payload.duration_nights),
      images,
      itinerary: payload.itinerary,
      includes: payload.includes,
      excludes: payload.excludes
    })

    const result = await databaseServices.tours.insertOne(tour)

    return {
      tour: {
        _id: result.insertedId,
        ...tour
      }
    }
  }

  async getTours(query: GetToursQuery) {
    const {
      page = 1,
      limit = 12,
      keyword,
      category_id,
      destination,
      departure_date,
      num_adults,
      num_children,
      min_price,
      max_price,
      sort
    } = query

    const skip = (page - 1) * limit

    // tìm schedule_id thỏa điều kiện
    const scheduleFilter: Filter<Schedule> = {
      status: ScheduleStatus.Available,
      departure_date: { $gte: new Date() },
      available_slots: { $gt: 0 }
    }

    if (departure_date) {
      const date = new Date(departure_date)
      const nextDay = new Date(date)
      nextDay.setDate(nextDay.getDate() + 1)
      scheduleFilter.departure_date = { $gte: date, $lt: nextDay }
    }

    if (num_adults || num_children) {
      const totalPassengers = (num_adults || 0) + (num_children || 0)
      scheduleFilter.available_slots = { $gte: totalPassengers }
    }

    if (min_price || max_price) {
      scheduleFilter.price_adult = {}
      if (min_price) scheduleFilter.price_adult.$gte = min_price
      if (max_price) scheduleFilter.price_adult.$lte = max_price
    }

    const validSchedules = await databaseServices.schedules
      .find(scheduleFilter, { projection: { tour_id: 1 } })
      .toArray()

    const validTourIds = [...new Set(validSchedules.map((s) => s.tour_id.toString()))].map((id) => new ObjectId(id))

    //  filter tours
    const tourFilter: Filter<Tour> = {
      status: TourStatus.Active,
      _id: { $in: validTourIds }
    }

    if (keyword) {
      tourFilter.$text = { $search: keyword }
    }

    if (category_id) {
      tourFilter.category_id = new ObjectId(category_id)
    }

    if (destination) {
      tourFilter.destination = { $regex: destination, $options: 'i' }
    }

    //  filter tours
    const sortOption: Document = {}
    if (sort === 'newest') {
      sortOption.created_at = -1
    } else {
      sortOption.created_at = -1 // default
    }

    //  query
    const [tours, total] = await Promise.all([
      databaseServices.tours.find(tourFilter).sort(sortOption).skip(skip).limit(limit).toArray(),
      databaseServices.tours.countDocuments(tourFilter)
    ])

    return {
      tours,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    }
  }
}

const toursService = new ToursService()

export default toursService
