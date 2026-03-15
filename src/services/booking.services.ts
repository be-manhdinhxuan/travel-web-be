import { ErrorWithStatus } from '~/models/Errors'
import databaseServices from './database.services'
import { MESSAGES } from '~/constants/messages'
import HTTP_STATUS from '~/constants/httpStatus'
import { Filter, ObjectId } from 'mongodb'
import { CreateBookingReqBody, GetMyBookingsQuery } from '~/models/requests/Booking.requests'
import Booking from '~/models/schemas/Booking.schema'
import { generateBookingCode } from '~/utils/generateBookingCode'

class BookingServices {
  async createBooking(user_id: string, payload: CreateBookingReqBody) {
    const { schedule_id, passengers, coupon_code, payment_method, contact_info } = payload

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
      final_price,
      payment_method
    })

    const result = await databaseServices.bookings.insertOne(booking)
    booking._id = result.insertedId

    return { booking }
  }

  async getMyBookings(user_id: string, query: GetMyBookingsQuery) {
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 10
    const skip = (page - 1) * limit

    const filter: Filter<Booking> = {
      user_id: new ObjectId(user_id)
    }

    if (query.status !== undefined) {
      filter.status = Number(query.status)
    }

    const [bookings, total] = await Promise.all([
      databaseServices.bookings.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).toArray(),
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
}

const bookingsService = new BookingServices()

export default bookingsService
