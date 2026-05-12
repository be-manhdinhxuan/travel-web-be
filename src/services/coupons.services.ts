import {
  CreateCouponReqBody,
  GetCouponsQuery,
  UpdateCouponReqBody,
  ValidateCouponReqBody
} from '~/models/requests/Coupon.requests'
import Coupon from '~/models/schemas/Coupon.schema'
import databaseServices from './database.services'
import { Filter, ObjectId } from 'mongodb'
import { Request } from 'express'
import { MESSAGES } from '~/constants/messages'
import { BookingStatus } from '~/constants/enums'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
import { nowVN, startOfDayVN, endOfDayVN, toVNDate } from '~/utils/time'

class CouponsService {
  async getPublicCoupons(params: { page?: number; limit?: number; keyword?: string }) {
    let { page = 1, limit = 10 } = params
    const keyword = params.keyword?.trim() || ''

    page = Number(page) || 1
    limit = Number(limit) || 10

    if (page < 1) page = 1
    if (limit < 1 || limit > 100) limit = 10

    const skip = (page - 1) * limit

    const query: any = {
      is_active: true,
      expires_at: { $gte: nowVN().toDate() },
      $expr: { $lt: ['$used_count', '$max_usage'] }
    }

    if (keyword.trim()) {
      query.code = {
        $regex: keyword.trim(),
        $options: 'i'
      }
    }

    const [coupons, total] = await Promise.all([
      databaseServices.coupons
        .find(query, {
          projection: {
            code: 1,
            value: 1,
            min_order_value: 1,
            expires_at: 1
          }
        })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),

      databaseServices.coupons.countDocuments(query)
    ])

    return {
      coupons,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    }
  }

  async createCoupon(payload: CreateCouponReqBody) {
    const coupon = new Coupon({
      code: payload.code.toUpperCase(),
      value: payload.value,
      min_order_value: payload.min_order_value,
      max_usage: payload.max_usage,
      expires_at: toVNDate(payload.expires_at)
    })

    const result = await databaseServices.coupons.insertOne(coupon)

    return {
      coupon: { ...coupon, _id: result.insertedId }
    }
  }

  async getCoupons(query: GetCouponsQuery) {
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 10
    const skip = (page - 1) * limit

    const filter: Filter<Coupon> = {}

    if (query.is_active !== undefined) {
      filter.is_active = query.is_active === true || query.is_active === ('true' as any)
    }

    if (query.keyword) {
      filter.code = { $regex: query.keyword.toUpperCase(), $options: 'i' }
    }

    const [coupons, total] = await Promise.all([
      databaseServices.coupons.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).toArray(),
      databaseServices.coupons.countDocuments(filter)
    ])

    return {
      coupons,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    }
  }

  async getSuggestedCoupons(user_id: string, booking_id: string) {
    const booking = await databaseServices.bookings.findOne({
      _id: new ObjectId(booking_id),
      user_id: new ObjectId(user_id)
    })

    if (!booking) {
      throw new ErrorWithStatus({
        message: MESSAGES.BOOKING_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const order_value = booking.total_price
    const now = nowVN().toDate()

    const coupons = await databaseServices.coupons
      .aggregate([
        {
          $match: {
            is_active: true,
            expires_at: { $gte: now },
            $expr: { $lt: ['$used_count', '$max_usage'] },
            min_order_value: { $lte: order_value },
            used_by: { $nin: [new ObjectId(user_id)] } // dùng used_by thay vì lookup
          }
        },
        {
          $addFields: {
            discount_amount: {
              $min: ['$value', order_value]
            }
          }
        },
        { $sort: { discount_amount: -1 } },
        { $limit: 5 },
        {
          $project: {
            code: 1,
            value: 1,
            min_order_value: 1,
            expires_at: 1,
            discount_amount: 1
          }
        }
      ])
      .toArray()

    return { coupons }
  }

  async updateCoupon(id: string, payload: UpdateCouponReqBody) {
    const { expires_at, code, ...rest } = payload

    const updateData: Partial<Coupon> = {
      ...rest,
      ...(code && { code: code.toUpperCase() }),
      ...(expires_at && { expires_at: toVNDate(expires_at) }),
      updated_at: nowVN().toDate()
    }

    const updatedCoupon = await databaseServices.coupons.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return { coupon: updatedCoupon }
  }

  async toggleCoupon(id: string) {
    const coupon = await databaseServices.coupons.findOne({
      _id: new ObjectId(id)
    })

    const updatedCoupon = await databaseServices.coupons.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          is_active: !coupon!.is_active,
          updated_at: nowVN().toDate()
        }
      },
      { returnDocument: 'after' }
    )

    return { coupon: updatedCoupon }
  }

  async validateCoupon(payload: ValidateCouponReqBody, user_id: string) {
    const { code, order_value } = payload

    const coupon = await databaseServices.coupons.findOne({
      code: code.toUpperCase()
    })

    // coupon không tồn tại
    if (!coupon) {
      return {
        is_valid: false,
        discount_amount: 0,
        final_price: order_value,
        coupon: null,
        reason: MESSAGES.COUPON_NOT_FOUND
      }
    }

    // coupon không active
    if (!coupon.is_active) {
      return {
        is_valid: false,
        discount_amount: 0,
        final_price: order_value,
        coupon: null,
        reason: MESSAGES.COUPON_IS_INACTIVE
      }
    }

    // coupon hết hạn
    if (coupon.expires_at < nowVN().toDate()) {
      return {
        is_valid: false,
        discount_amount: 0,
        final_price: order_value,
        coupon: null,
        reason: MESSAGES.COUPON_EXPIRED
      }
    }

    // coupon hết lượt
    if (coupon.used_count >= coupon.max_usage) {
      return {
        is_valid: false,
        discount_amount: 0,
        final_price: order_value,
        coupon: null,
        reason: MESSAGES.COUPON_MAX_USAGE_REACHED
      }
    }

    // đơn hàng không đạt tối thiểu
    if (order_value < coupon.min_order_value) {
      return {
        is_valid: false,
        discount_amount: 0,
        final_price: order_value,
        coupon: null,
        reason: MESSAGES.COUPON_MIN_ORDER_NOT_MET
      }
    }

    // user đã dùng coupon này rồi
    const alreadyUsed = coupon.used_by.some((id) => id.toString() === user_id)
    if (alreadyUsed) {
      return {
        is_valid: false,
        discount_amount: 0,
        final_price: order_value,
        coupon: null,
        reason: MESSAGES.COUPON_ALREADY_USED
      }
    }

    // hợp lệ — tính tiền giảm
    const discount_amount = Math.min(coupon.value, order_value)
    const final_price = order_value - discount_amount

    return {
      is_valid: true,
      discount_amount,
      final_price,
      coupon
    }
  }

  async applyBookingCoupon(booking_id: string, user_id: string, coupon_code: string) {
    const booking = await databaseServices.bookings.findOne({
      _id: new ObjectId(booking_id),
      user_id: new ObjectId(user_id),
      status: BookingStatus.Pending
    })

    // validate coupon
    const coupon = await databaseServices.coupons.findOne({
      code: coupon_code.toUpperCase(),
      is_active: true,
      expires_at: { $gte: nowVN().toDate() },
      $expr: { $lt: ['$used_count', '$max_usage'] }
    })

    const discount_amount = Math.min(coupon!.value, booking!.total_price)
    const final_price = booking!.total_price - discount_amount

    await databaseServices.bookings.updateOne(
      { _id: new ObjectId(booking_id) },
      {
        $set: {
          coupon_id: coupon!._id,
          'price_detail.discount_amount': discount_amount,
          'price_detail.coupon_code': coupon_code.toUpperCase(),
          final_price,
          updated_at: nowVN().toDate()
        }
      }
    )
  }
}

const couponsService = new CouponsService()

export default couponsService
