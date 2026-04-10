import { ErrorWithStatus } from '~/models/Errors'
import databaseServices from './database.services'
import { MESSAGES } from '~/constants/messages'
import HTTP_STATUS from '~/constants/httpStatus'
import { Filter, ObjectId } from 'mongodb'
import {
  CreateBookingReqBody,
  GetBookingsQuery,
  GetMyBookingsQuery,
  UpdateBookingStatusReqBody
} from '~/models/requests/Booking.requests'
import Booking from '~/models/schemas/Booking.schema'
import { generateBookingCode } from '~/utils/generateBookingCode'
import { BookingStatus, PaymentStatus } from '~/constants/enums'

class BookingServices {
  async createBooking(user_id: string, payload: CreateBookingReqBody) {
    const { schedule_id, passengers, coupon_code, contact_info } = payload

    // Lấy schedule và tour
    const schedule = await databaseServices.schedules.findOne({
      _id: new ObjectId(schedule_id)
    })

    const tour = await databaseServices.tours.findOne({
      _id: schedule!.tour_id
    })

    // Kiểm tra số chỗ còn đủ không
    const totalPassengers = (passengers.adults || 0) + (passengers.children || 0) + (passengers.babies || 0)

    if (schedule!.available_slots < totalPassengers) {
      throw new ErrorWithStatus({
        message: MESSAGES.SCHEDULE_NOT_ENOUGH_SLOTS,
        status: HTTP_STATUS.CONFLICT
      })
    }

    // Giữ chỗ ngay bằng $inc atomic
    const updated = await databaseServices.schedules.findOneAndUpdate(
      {
        _id: new ObjectId(schedule_id),
        available_slots: { $gte: totalPassengers } // double check tránh race condition
      },
      { $inc: { available_slots: -totalPassengers } },
      { returnDocument: 'after' }
    )

    if (!updated) {
      throw new ErrorWithStatus({
        message: MESSAGES.SCHEDULE_NOT_ENOUGH_SLOTS,
        status: HTTP_STATUS.CONFLICT
      })
    }

    // Tính giá
    const adult_total = schedule!.price_adult * (passengers.adults || 0)
    const child_total = schedule!.price_child * (passengers.children || 0)
    const baby_total = schedule!.price_baby * (passengers.babies || 0)
    const total_price = adult_total + child_total + baby_total

    // Validate coupon nếu có
    let discount_amount = 0
    let coupon_id = null
    let coupon_code_used = ''

    if (coupon_code) {
      const coupon = await databaseServices.coupons.findOne({
        code: coupon_code.toUpperCase(),
        is_active: true,
        expires_at: { $gte: new Date() },
        $expr: { $lt: ['$used_count', '$max_usage'] }
      })

      if (!coupon) {
        throw new ErrorWithStatus({
          message: MESSAGES.COUPON_INVALID,
          status: HTTP_STATUS.BAD_REQUEST
        })
      }

      if (total_price < coupon.min_order_value) {
        throw new ErrorWithStatus({
          message: MESSAGES.COUPON_MIN_ORDER_NOT_MET,
          status: HTTP_STATUS.BAD_REQUEST
        })
      }

      const alreadyUsed = coupon.used_by.some((id) => id.toString() === user_id)
      if (alreadyUsed) {
        throw new ErrorWithStatus({
          message: MESSAGES.COUPON_ALREADY_USED,
          status: HTTP_STATUS.BAD_REQUEST
        })
      }

      discount_amount = coupon.value
      coupon_id = coupon._id
      coupon_code_used = coupon.code
    }

    const final_price = Math.max(0, total_price - discount_amount)

    // Tạo booking_code
    const booking_code = await generateBookingCode()

    // Tạo booking
    const booking = new Booking({
      booking_code,
      user_id: new ObjectId(user_id),
      schedule_id: new ObjectId(schedule_id),
      coupon_id,
      tour_snapshot: {
        tour_id: tour!._id as ObjectId,
        tour_name: tour!.name,
        schedule_id: new ObjectId(schedule_id),
        departure_date: schedule!.departure_date,
        return_date: schedule!.return_date,
        price_adult: schedule!.price_adult,
        price_child: schedule!.price_child,
        price_baby: schedule!.price_baby
      },
      passengers: {
        adults: passengers.adults || 0,
        children: passengers.children || 0,
        babies: passengers.babies || 0
      },
      contact_info,
      price_detail: {
        adult_count: passengers.adults || 0,
        child_count: passengers.children || 0,
        baby_count: passengers.babies || 0,
        adult_total,
        child_total,
        baby_total,
        discount_amount,
        coupon_code: coupon_code_used
      },
      total_price,
      final_price
    })

    const result = await databaseServices.bookings.insertOne(booking)
    booking._id = result.insertedId

    return { booking }
  }

  async getMyBookings(user_id: string, query: GetMyBookingsQuery) {
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 10
    const skip = (page - 1) * limit

    const filter: Record<string, unknown> = {
      user_id: new ObjectId(user_id)
    }

    if (query.status !== undefined) {
      filter.status = Number(query.status)
    }

    const [bookings, total] = await Promise.all([
      databaseServices.bookings
        .aggregate([
          { $match: filter },
          { $sort: { created_at: -1 } },
          { $skip: skip },
          { $limit: limit },

          // 🔥 JOIN TOUR (giữ nguyên)
          {
            $lookup: {
              from: 'tours',
              localField: 'tour_snapshot.tour_id',
              foreignField: '_id',
              as: 'tour_info'
            }
          },
          {
            $addFields: {
              'tour_snapshot.images': { $arrayElemAt: ['$tour_info.images', 0] },
              'tour_snapshot.destination': { $arrayElemAt: ['$tour_info.destination', 0] },
              'tour_snapshot.duration_days': { $arrayElemAt: ['$tour_info.duration_days', 0] },
              'tour_snapshot.duration_nights': { $arrayElemAt: ['$tour_info.duration_nights', 0] }
            }
          },

          // 🔥 ADD: JOIN PAYMENT
          {
            $lookup: {
              from: 'payments',
              let: { bookingId: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ['$booking_id', '$$bookingId'] }
                  }
                },
                { $sort: { created_at: -1 } },
                { $limit: 1 },
                {
                  $project: {
                    provider: 1,
                    status: 1
                  }
                }
              ],
              as: 'payment'
            }
          },
          {
            $unwind: {
              path: '$payment',
              preserveNullAndEmptyArrays: true
            }
          },

          { $project: { tour_info: 0 } }
        ])
        .toArray(),
      databaseServices.bookings.countDocuments(filter)
    ])

    return {
      bookings,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    }
  }

  async getMyBookingDetail(user_id: string, id: string) {
    const result = await databaseServices.bookings
      .aggregate([
        {
          $match: {
            _id: new ObjectId(id),
            user_id: new ObjectId(user_id)
          }
        },

        // JOIN PAYMENT
        {
          $lookup: {
            from: 'payments',
            let: { bookingId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$booking_id', '$$bookingId'] }
                }
              },
              { $sort: { created_at: -1 } },
              { $limit: 1 }
            ],
            as: 'payment'
          }
        },
        {
          $unwind: {
            path: '$payment',
            preserveNullAndEmptyArrays: true
          }
        }
      ])
      .toArray()

    return { booking: result[0] }
  }

  async cancelBooking(id: string, reason?: string) {
    // lấy booking để biết số lượng passengers
    const booking = await databaseServices.bookings.findOne({
      _id: new ObjectId(id)
    })

    const totalPassengers = booking!.passengers.adults + booking!.passengers.children + booking!.passengers.babies

    // hoàn lại available_slots
    await databaseServices.schedules.updateOne(
      { _id: booking!.schedule_id },
      { $inc: { available_slots: totalPassengers } }
    )

    // cập nhật trạng thái booking
    const updatedBooking = await databaseServices.bookings.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: BookingStatus.Cancelled,
          cancelled_reason: reason || '',
          updated_at: new Date()
        }
      },
      { returnDocument: 'after' }
    )

    return { booking: updatedBooking }
  }

  async getBookings(query: GetBookingsQuery) {
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 10
    const skip = (page - 1) * limit

    const filter: any = {}

    if (query.status !== undefined) {
      filter.status = Number(query.status)
    }

    if (query.keyword) {
      filter.$or = [
        { booking_code: { $regex: query.keyword, $options: 'i' } },
        { 'contact_info.full_name': { $regex: query.keyword, $options: 'i' } }
      ]
    }

    if (query.tour_id) {
      filter['tour_snapshot.tour_id'] = new ObjectId(query.tour_id)
    }

    if (query.from_date || query.to_date) {
      filter.created_at = {}
      if (query.from_date) {
        filter.created_at.$gte = new Date(query.from_date)
      }
      if (query.to_date) {
        const toDate = new Date(query.to_date)
        toDate.setHours(23, 59, 59, 999)
        filter.created_at.$lte = toDate
      }
    }

    const [bookings, total] = await Promise.all([
      databaseServices.bookings
        .aggregate([
          { $match: filter },

          // JOIN PAYMENT MỚI NHẤT
          {
            $lookup: {
              from: 'payments',
              let: { bookingId: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ['$booking_id', '$$bookingId'] }
                  }
                },
                { $sort: { created_at: -1 } },
                { $limit: 1 }
              ],
              as: 'payment'
            }
          },

          {
            $unwind: {
              path: '$payment',
              preserveNullAndEmptyArrays: true
            }
          },

          // ADD payment_status
          {
            $addFields: {
              payment_status: '$payment.status'
            }
          },

          // bỏ payment raw
          {
            $project: {
              payment: 0
            }
          },

          { $sort: { created_at: -1 } },
          { $skip: skip },
          { $limit: limit }
        ])
        .toArray(),

      databaseServices.bookings.countDocuments(filter)
    ])

    return {
      bookings,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    }
  }

  async getBookingDetail(id: string) {
    const result = await databaseServices.bookings
      .aggregate([
        {
          $match: {
            _id: new ObjectId(id)
          }
        },

        // JOIN PAYMENT (latest)
        {
          $lookup: {
            from: 'payments',
            let: { bookingId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$booking_id', '$$bookingId'] }
                }
              },
              { $sort: { created_at: -1 } },
              { $limit: 1 }
            ],
            as: 'payment'
          }
        },
        {
          $unwind: {
            path: '$payment',
            preserveNullAndEmptyArrays: true
          }
        }
      ])
      .toArray()

    return { booking: result[0] }
  }

  async updateBookingStatus(id: string, payload: UpdateBookingStatusReqBody) {
    const { status, cancelled_reason } = payload

    const booking = (await databaseServices.bookings.findOne({
      _id: new ObjectId(id)
    })) as Booking

    // Không update nếu đã cancel
    if (booking.status === BookingStatus.Cancelled) {
      throw new ErrorWithStatus({
        message: MESSAGES.CANNOT_UPDATE_CANCELLED_BOOKING,
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    let paymentStatus: PaymentStatus | null = null

    // Cancelled flow
    if (status === BookingStatus.Cancelled) {
      if (!cancelled_reason) {
        throw new ErrorWithStatus({
          message: MESSAGES.CANCELLED_REASON_IS_REQUIRED,
          status: HTTP_STATUS.BAD_REQUEST
        })
      }

      // Hoàn slot
      const totalPassengers = booking.passengers.adults + booking.passengers.children + booking.passengers.babies

      await databaseServices.schedules.updateOne(
        { _id: booking.schedule_id },
        { $inc: { available_slots: totalPassengers } }
      )

      // Lấy payment SUCCESS gần nhất
      const payment = await databaseServices.payments.findOne(
        {
          booking_id: booking._id,
          status: PaymentStatus.Success
        },
        { sort: { created_at: -1 } }
      )

      if (payment) {
        // update sang refund_pending
        await databaseServices.payments.updateOne(
          { _id: payment._id },
          {
            $set: {
              status: PaymentStatus.Refunded_Pending,
              updated_at: new Date()
            }
          }
        )

        paymentStatus = PaymentStatus.Refunded_Pending
      }
    }

    // Nếu update sang completed thì phải check đã qua ngày return_date chưa, chưa thì không cho update
    if (status === BookingStatus.Completed) {
      const returnDate = new Date(booking.tour_snapshot.return_date)

      if (returnDate > new Date()) {
        throw new ErrorWithStatus({
          message: MESSAGES.TOUR_NOT_FINISHED_YET,
          status: HTTP_STATUS.BAD_REQUEST
        })
      }
    }

    // Cập nhật trạng thái booking
    const updatedBooking = await databaseServices.bookings.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          status,
          ...(cancelled_reason && { cancelled_reason }),
          updated_at: new Date()
        }
      },
      { returnDocument: 'after' }
    )

    // Nếu booking bị cancelled ở trên thì đã có paymentStatus, còn nếu update bình thường sang confirmed/completed thì phải lấy payment status mới nhất
    if (paymentStatus === null) {
      const latestPayment = await databaseServices.payments.findOne(
        { booking_id: booking._id },
        { sort: { created_at: -1 } }
      )

      paymentStatus = latestPayment?.status ?? null
    }

    return {
      booking: {
        ...updatedBooking,
        payment_status: paymentStatus
      }
    }
  }

  async confirmRefund(id: string) {
    const booking = await databaseServices.bookings.findOne({
      _id: new ObjectId(id)
    })

    // Chỉ refund khi booking đã bị cancel
    if (booking?.status !== BookingStatus.Cancelled) {
      throw new ErrorWithStatus({
        message: MESSAGES.BOOKING_NOT_CANCELLED,
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Lấy payment SUCCESS gần nhất
    const payment = await databaseServices.payments.findOne(
      {
        booking_id: booking._id,
        status: PaymentStatus.Refunded_Pending
      },
      { sort: { created_at: -1 } }
    )

    if (!payment) {
      throw new ErrorWithStatus({
        message: MESSAGES.PAYMENT_NOT_FOUND_OR_INVALID,
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Update sang refunded
    await databaseServices.payments.updateOne(
      { _id: payment._id },
      {
        $set: {
          status: PaymentStatus.Refunded,
          refunded_at: new Date(),
          updated_at: new Date()
        }
      }
    )

    return { message: 'Refund confirmed' }
  }
}

const bookingsService = new BookingServices()

export default bookingsService
