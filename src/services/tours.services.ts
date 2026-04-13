import { Document, Filter, ObjectId } from 'mongodb'
import { CreateTourReqBody, GetToursQuery, UpdateTourReqBody } from '~/models/requests/Tour.requests'
import Tour from '~/models/schemas/Tour.schema'
import { generateUniqueCategorySlug } from '~/utils/generateCategorySlug'
import { uploadImageToCloudinary } from '~/utils/uploadImageToCloudinary'
import databaseServices from './database.services'
import { BookingStatus, ScheduleStatus, TourSort, TourStatus, UserRole } from '~/constants/enums'
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

  async getTours(query: GetToursQuery, role: UserRole) {
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 12
    const skip = (page - 1) * limit

    const keyword = query.keyword?.trim()
    const category_id = query.category_id
    const destination = query.destination?.trim()
    const num_adults = query.num_adults ? Number(query.num_adults) : 0
    const num_children = query.num_children ? Number(query.num_children) : 0
    const min_price = query.min_price ? Number(query.min_price) : undefined
    const max_price = query.max_price ? Number(query.max_price) : undefined
    const duration = query.duration?.trim()?.toLowerCase()
    const sort = (query.sort?.trim() || 'newest').toLowerCase()

    const totalPassengers = num_adults + num_children

    // ====================== MATCH TOUR ======================
    const tourMatch: any = {}

    const currentRole = role ?? UserRole.User
    if (currentRole === UserRole.User) {
      tourMatch.status = TourStatus.Active
    } else {
      // Admin / Employee mới được filter status
      if (query.status !== undefined) {
        tourMatch.status = Number(query.status)
      }
      // không truyền status → lấy tất cả
    }

    // keyword
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

    // ====================== SCHEDULE FILTER ======================
    const scheduleMatchConditions: any[] = [{ $gt: ['$$s.available_slots', 0] }]

    // departure_from
    if (query.departure_from) {
      scheduleMatchConditions.push({
        $gte: ['$$s.departure_date', new Date(query.departure_from)]
      })
    } else {
      scheduleMatchConditions.push({
        $gte: ['$$s.departure_date', new Date()]
      })
    }

    // departure_to
    if (query.departure_to) {
      const end = new Date(query.departure_to)
      end.setHours(23, 59, 59, 999)

      scheduleMatchConditions.push({
        $lte: ['$$s.departure_date', end]
      })
    }

    // slots
    if (totalPassengers > 0) {
      scheduleMatchConditions.push({
        $gte: ['$$s.available_slots', totalPassengers]
      })
    }

    // price
    if (min_price !== undefined) {
      scheduleMatchConditions.push({
        $gte: ['$$s.price_adult', min_price]
      })
    }

    if (max_price !== undefined) {
      scheduleMatchConditions.push({
        $lte: ['$$s.price_adult', max_price]
      })
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
    const basePipeline: any[] = [
      { $match: tourMatch },

      {
        $lookup: {
          from: 'schedules',
          localField: '_id',
          foreignField: 'tour_id',
          as: 'schedules'
        }
      },

      {
        $addFields: {
          schedules: {
            $filter: {
              input: '$schedules',
              as: 's',
              cond: {
                $and: scheduleMatchConditions
              }
            }
          }
        }
      },

      ...(currentRole === UserRole.User
        ? [
            {
              $match: {
                schedules: { $ne: [] }
              }
            }
          ]
        : []),

      {
        $addFields: {
          min_price: {
            $cond: [{ $gt: [{ $size: '$schedules' }, 0] }, { $min: '$schedules.price_adult' }, null]
          }
        }
      }
    ]

    const dataPipeline = [
      ...basePipeline,
      { $sort: sortOption },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          schedules: 0
        }
      }
    ]

    const countPipeline = [...basePipeline, { $count: 'total' }]

    const [tours, totalResult] = await Promise.all([
      databaseServices.tours.aggregate(dataPipeline).toArray(),
      databaseServices.tours.aggregate(countPipeline).toArray()
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

  async getRecommendedTours(user_id?: string) {
    const now = new Date()

    // Guest/User chưa login → show 10 tour mới nhất
    if (!user_id) {
      const tours = await databaseServices.tours
        .aggregate([
          {
            $match: {
              status: TourStatus.Active
            }
          },
          {
            $lookup: {
              from: 'schedules',
              localField: '_id',
              foreignField: 'tour_id',
              as: 'schedules'
            }
          },
          {
            $addFields: {
              schedules: {
                $filter: {
                  input: '$schedules',
                  as: 's',
                  cond: {
                    $and: [
                      { $eq: ['$$s.status', ScheduleStatus.Available] },
                      { $gte: ['$$s.departure_date', now] },
                      { $gt: ['$$s.available_slots', 0] }
                    ]
                  }
                }
              }
            }
          },
          {
            $match: { schedules: { $ne: [] } }
          },
          {
            $addFields: {
              min_price: { $min: '$schedules.price_adult' }
            }
          },
          {
            $sort: { created_at: -1 }
          },
          { $limit: 10 },
          {
            $project: {
              schedules: 0
            }
          }
        ])
        .toArray()

      return { tours }
    }

    // User đã login → show tour dựa trên lịch sử tương tác (booking history và wishlist)
    const userObjectId = new ObjectId(user_id)

    const user = await databaseServices.users.findOne({ _id: userObjectId }, { projection: { wishlist: 1 } })

    const wishlistIds: ObjectId[] = user?.wishlist || []

    const bookings = await databaseServices.bookings
      .find({
        user_id: userObjectId,
        status: { $in: [BookingStatus.Confirmed, BookingStatus.Completed] }
      })
      .toArray()

    // Nếu user chưa có tương tác nào → show 10 tour mới nhất
    if (bookings.length === 0 && wishlistIds.length === 0) {
      const tours = await databaseServices.tours
        .aggregate([{ $match: { status: TourStatus.Active } }, { $sort: { created_at: -1 } }, { $limit: 10 }])
        .toArray()

      return { tours }
    }

    const bookedTourIds = bookings.map((b) => b.tour_snapshot?.tour_id).filter(Boolean)

    const interactedTourIds = [
      ...new Set([...bookedTourIds.map((id) => id.toString()), ...wishlistIds.map((id) => id.toString())])
    ].map((id) => new ObjectId(id))

    let preferredCategoryIds: ObjectId[] = []

    if (interactedTourIds.length > 0) {
      const interactedTours = await databaseServices.tours
        .find({ _id: { $in: interactedTourIds } }, { projection: { category_id: 1 } })
        .toArray()

      preferredCategoryIds = [...new Set(interactedTours.map((t) => t.category_id.toString()))].map(
        (id) => new ObjectId(id)
      )
    }

    let avgBudget: number | null = null

    if (bookings.length > 0) {
      const total = bookings.reduce((sum, b) => sum + b.final_price, 0)
      avgBudget = total / bookings.length
    }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(now.getDate() - 30)

    const tours = await databaseServices.tours
      .aggregate([
        {
          $match: {
            status: TourStatus.Active,
            _id: { $nin: bookedTourIds }
          }
        },
        {
          $lookup: {
            from: 'schedules',
            localField: '_id',
            foreignField: 'tour_id',
            as: 'schedules'
          }
        },
        {
          $addFields: {
            schedules: {
              $filter: {
                input: '$schedules',
                as: 's',
                cond: {
                  $and: [
                    { $eq: ['$$s.status', ScheduleStatus.Available] },
                    { $gte: ['$$s.departure_date', now] },
                    { $gt: ['$$s.available_slots', 0] }
                  ]
                }
              }
            }
          }
        },
        { $match: { schedules: { $ne: [] } } },
        {
          $addFields: {
            min_price: { $min: '$schedules.price_adult' }
          }
        },
        {
          $addFields: {
            score: {
              $add: [
                {
                  $cond: [{ $in: ['$category_id', preferredCategoryIds] }, 3, 0]
                },
                avgBudget
                  ? {
                      $cond: [
                        {
                          $and: [{ $gte: ['$min_price', avgBudget * 0.5] }, { $lte: ['$min_price', avgBudget * 1.5] }]
                        },
                        2,
                        0
                      ]
                    }
                  : 0,
                {
                  $cond: [{ $gte: ['$created_at', thirtyDaysAgo] }, 1, 0]
                }
              ]
            }
          }
        },
        { $sort: { score: -1, created_at: -1 } },
        { $limit: 10 },
        {
          $project: {
            schedules: 0,
            score: 0
          }
        }
      ])
      .toArray()

    return { tours }
  }

  async getDetailTour(slug: string, role: UserRole) {
    const filter: Filter<Tour> = { slug }

    if (role !== UserRole.Admin && role !== UserRole.Employee) {
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
