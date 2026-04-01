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
    const departure_from = query.departure_from
    const departure_to = query.departure_to
    const num_adults = query.num_adults ? Number(query.num_adults) : 0
    const num_children = query.num_children ? Number(query.num_children) : 0
    const min_price = query.min_price ? Number(query.min_price) : undefined
    const max_price = query.max_price ? Number(query.max_price) : undefined
    const duration = query.duration?.trim()?.toLowerCase()
    const sort = (query.sort?.trim() || 'newest').toLowerCase()

    const totalPassengers = num_adults + num_children

    // ====================== MATCH TOUR ======================
    const tourMatch: any = {
      status: TourStatus.Active
    }

    if (keyword) {
      tourMatch.$text = { $search: keyword }
    }

    if (category_id) {
      tourMatch.category_id = new ObjectId(category_id)
    }

    if (destination) {
      tourMatch.destination = { $regex: destination, $options: 'i' }
    }

    if (duration) {
      if (duration === '1-2') tourMatch.duration_days = { $gte: 1, $lte: 2 }
      else if (duration === '3-5') tourMatch.duration_days = { $gte: 3, $lte: 5 }
      else if (duration === '6+') tourMatch.duration_days = { $gte: 6 }
    }

    // ====================== MATCH SCHEDULE ======================
    const scheduleMatch: any = {
      status: ScheduleStatus.Available,
      departure_date: { $gte: new Date() },
      available_slots: { $gt: 0 }
    }

    if (query.departure_from || query.departure_to) {
      scheduleMatch.departure_date = {}

      if (query.departure_from) {
        scheduleMatch.departure_date.$gte = new Date(query.departure_from)
      }

      if (query.departure_to) {
        const end = new Date(query.departure_to)
        end.setHours(23, 59, 59, 999) // lấy hết ngày
        scheduleMatch.departure_date.$lte = end
      }
    }

    if (totalPassengers > 0) {
      scheduleMatch.available_slots = { $gte: totalPassengers }
    }

    if (min_price || max_price) {
      scheduleMatch.price_adult = {}
      if (min_price !== undefined) scheduleMatch.price_adult.$gte = min_price
      if (max_price !== undefined) scheduleMatch.price_adult.$lte = max_price
    }

    // ====================== SORT ======================
    let sortOption: any = { created_at: -1 }

    switch (sort) {
      case 'name_asc':
        sortOption = { name: 1, created_at: -1 }
        break
      case 'name_desc':
        sortOption = { name: -1, created_at: -1 }
        break
      case 'duration_asc':
        sortOption = { duration_days: 1, created_at: -1 }
        break
      case 'duration_desc':
        sortOption = { duration_days: -1, created_at: -1 }
        break
      case 'price_asc':
        sortOption = { min_price: 1, created_at: -1 }
        break
      case 'price_desc':
        sortOption = { min_price: -1, created_at: -1 }
        break
      default:
        sortOption = { created_at: -1 }
    }

    // ====================== AGGREGATION ======================
    const pipeline: any[] = [
      { $match: tourMatch },

      // join schedules
      {
        $lookup: {
          from: 'schedules',
          localField: '_id',
          foreignField: 'tour_id',
          as: 'schedules'
        }
      },

      // filter schedules
      {
        $addFields: {
          schedules: {
            $filter: {
              input: '$schedules',
              as: 's',
              cond: {
                $and: [
                  { $gt: ['$$s.available_slots', 0] },

                  ...(query.departure_from
                    ? [{ $gte: ['$$s.departure_date', new Date(query.departure_from)] }]
                    : [{ $gte: ['$$s.departure_date', new Date()] }]),

                  ...(query.departure_to
                    ? [
                        {
                          $lte: ['$$s.departure_date', new Date(new Date(query.departure_to).setHours(23, 59, 59, 999))]
                        }
                      ]
                    : [])
                ]
              }
            }
          }
        }
      },

      // loại tour không có schedule hợp lệ
      {
        $match: {
          schedules: { $ne: [] }
        }
      },

      // lấy giá rẻ nhất
      {
        $addFields: {
          min_price: { $min: '$schedules.price_adult' }
        }
      },

      // sort
      { $sort: sortOption },

      // pagination
      { $skip: skip },
      { $limit: limit },

      // ẩn schedules cho nhẹ
      {
        $project: {
          schedules: 0
        }
      }
    ]

    const [tours, totalResult] = await Promise.all([
      databaseServices.tours.aggregate(pipeline).toArray(),
      databaseServices.tours
        .aggregate([
          ...pipeline.filter((p) => !('$skip' in p || '$limit' in p || '$project' in p)),
          { $count: 'total' }
        ])
        .toArray()
    ])

    const total = totalResult[0]?.total || 0

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
