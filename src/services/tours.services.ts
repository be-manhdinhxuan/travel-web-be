import { Document, Filter, ObjectId } from 'mongodb'
import { CreateTourReqBody, GetToursQuery, UpdateTourReqBody } from '~/models/requests/Tour.requests'
import Tour from '~/models/schemas/Tour.schema'
import { generateUniqueCategorySlug } from '~/utils/generateCategorySlug'
import { uploadImageToCloudinary } from '~/utils/uploadImageToCloudinary'
import databaseServices from './database.services'
import { ScheduleStatus, TourSort, TourStatus, UserRole } from '~/constants/enums'
import Schedule from '~/models/schemas/Schedule.schema'
import { ErrorWithStatus } from '~/models/Errors'
import { MESSAGES } from '~/constants/messages'
import HTTP_STATUS from '~/constants/httpStatus'
import { generateUniqueTourSlug } from '~/utils/generateTourSlug'
import { uploadImage } from '~/middlewares/uploads.middlewares'
import cloudinary, { getPublicIdFromUrl } from '~/utils/cloudinary'

class ToursService {
  async createTour(payload: CreateTourReqBody, files: Express.Multer.File[]) {
    const images: string[] = []

    if (files?.length) {
      const uploads = await Promise.all(files.map((file) => uploadImageToCloudinary(file.buffer, 'tours')))

      uploads.forEach((img: any) => images.push(img.secure_url))
    }

    const slug = await generateUniqueTourSlug(payload.name)

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
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 12
    const skip = (page - 1) * limit

    const keyword = query.keyword?.trim()
    const category_id = query.category_id
    const destination = query.destination?.trim()
    const departure_date = query.departure_date
    const num_adults = query.num_adults ? Number(query.num_adults) : undefined
    const num_children = query.num_children ? Number(query.num_children) : undefined
    const min_price = query.min_price ? Number(query.min_price) : undefined
    const max_price = query.max_price ? Number(query.max_price) : undefined
    const duration = query.duration?.trim()?.toLowerCase()
    let sort = (query.sort?.trim() || 'newest').toLowerCase()

    // ====================== TOUR FILTER (chính) ======================
    const tourFilter: Filter<Tour> = {
      status: TourStatus.Active
    }

    // ==================== DURATION FILTER (đặt sớm) ====================
    if (duration) {
      if (duration === '1-2') {
        tourFilter.duration_days = { $gte: 1, $lte: 2 }
      } else if (duration === '3-5') {
        tourFilter.duration_days = { $gte: 3, $lte: 5 }
      } else if (duration === '6+') {
        tourFilter.duration_days = { $gte: 6 }
      }
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

    // ====================== SCHEDULE FILTER ======================
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
      if (min_price !== undefined) scheduleFilter.price_adult.$gte = min_price
      if (max_price !== undefined) scheduleFilter.price_adult.$lte = max_price
    }

    const validSchedules = await databaseServices.schedules
      .find(scheduleFilter, { projection: { tour_id: 1 } })
      .toArray()

    const validTourIds = [...new Set(validSchedules.map((s) => s.tour_id.toString()))].map((id) => new ObjectId(id))

    // Kết hợp filter tour_id từ schedule (nếu có)
    if (validTourIds.length > 0) {
      tourFilter._id = { $in: validTourIds }
    } else {
      return { tours: [], pagination: { page, limit, total: 0, total_pages: 0 } }
    }

    // ====================== SORT ======================
    const sortOption: Document = {}

    switch (sort) {
      case TourSort.NAME_ASC:
        sortOption.name = 1
        sortOption.created_at = -1
        break
      case TourSort.NAME_DESC:
        sortOption.name = -1
        sortOption.created_at = -1
        break
      case TourSort.DURATION_ASC:
        sortOption.duration_days = 1
        sortOption.created_at = -1
        break
      case TourSort.DURATION_DESC:
        sortOption.duration_days = -1
        sortOption.created_at = -1
        break
      case TourSort.PRICE_ASC:
        sortOption.price_adult = 1
        sortOption.created_at = -1
        break
      case TourSort.PRICE_DESC:
        sortOption.price_adult = -1
        sortOption.created_at = -1
        break
      case TourSort.NEWEST:
      default:
        sortOption.created_at = -1
        break
    }

    // ====================== QUERY ======================
    const [tours, total] = await Promise.all([
      databaseServices.tours.find(tourFilter).sort(sortOption).skip(skip).limit(limit).toArray(),
      databaseServices.tours.countDocuments(tourFilter)
    ])

    const toursWithPrice = await Promise.all(
      tours.map(async (tour) => {
        const schedules = await databaseServices.schedules
          .find({
            tour_id: tour._id,
            status: { $in: [ScheduleStatus.Available, ScheduleStatus.Full] },
            departure_date: { $gte: new Date() }
          })
          .sort({ price_adult: 1 }) // rẻ nhất lên đầu
          .toArray()

        const price = schedules.length > 0 ? schedules[0].price_adult : null

        return {
          ...tour,
          price
        }
      })
    )

    return {
      tours: toursWithPrice,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    }
  }

  async getDetailTour(slug: string, role: UserRole) {
    const filter: Filter<Tour> = { slug }

    if (role !== UserRole.Admin) {
      filter.status = TourStatus.Active
    }

    const tour = await databaseServices.tours.findOne(filter)

    if (!tour) {
      throw new ErrorWithStatus({
        message: MESSAGES.TOUR_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const schedules = await databaseServices.schedules
      .find({
        tour_id: tour._id,
        status: { $in: [ScheduleStatus.Available, ScheduleStatus.Full] },
        departure_date: { $gte: new Date() }
      })
      .sort({ price_adult: 1 })
      .toArray()

    // lấy giá rẻ nhất từ schedule có giá người lớn thấp nhất
    const min_price = schedules.length > 0 ? schedules[0].price_adult : null

    return { tour, schedules, min_price }
  }

  async updateTour(id: string, payload: UpdateTourReqBody, files: Express.Multer.File[] | undefined) {
    const { name, ...rest } = payload

    const tour = await databaseServices.tours.findOne({
      _id: new ObjectId(id)
    })

    if (!tour) {
      throw new ErrorWithStatus({
        message: MESSAGES.TOUR_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const updateData: Partial<Tour> = { ...rest }

    // nếu name thay đổi
    if (name) {
      updateData.name = name
      updateData.slug = await generateUniqueTourSlug(name, id)
    }

    // upload images mới lên Cloudinary
    if (files?.length) {
      const uploadedImages = await Promise.all(files.map((file) => uploadImageToCloudinary(file.buffer, 'tours')))
      // xóa ảnh cũ trên Cloudinary
      await Promise.all(
        tour.images.map((url) => {
          const publicId = getPublicIdFromUrl(url)
          return publicId ? cloudinary.uploader.destroy(publicId) : Promise.resolve()
        })
      )
      updateData.images = uploadedImages.map((img) => img.secure_url)
    }

    updateData.updated_at = new Date()

    const updatedTour = await databaseServices.tours.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return {
      tour: updatedTour
    }
  }

  async updateTourStatus(id: string, status: number) {
    const updateTour = await databaseServices.tours.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: { status },
        $currentDate: { updated_at: true }
      },

      { returnDocument: 'after' }
    )
    return updateTour
  }

  async deleteTour(id: string) {
    const bookingCount = await databaseServices.bookings.countDocuments({
      tour_id: new ObjectId(id)
    })

    if (bookingCount > 0) {
      throw new ErrorWithStatus({
        message: MESSAGES.TOUR_HAS_BOOKINGS,
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    await databaseServices.tours.deleteOne({ _id: new ObjectId(id) })
  }
}

const toursService = new ToursService()

export default toursService
