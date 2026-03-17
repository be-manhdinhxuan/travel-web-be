import { CreateCouponReqBody, GetCouponsQuery, UpdateCouponReqBody } from '~/models/requests/Coupon.requests'
import Coupon from '~/models/schemas/Coupon.schema'
import databaseServices from './database.services'
import { Filter, ObjectId } from 'mongodb'
import { Request } from 'express'

class CouponsService {
  async createCoupon(payload: CreateCouponReqBody) {
    const coupon = new Coupon({
      code: payload.code.toUpperCase(),
      value: payload.value,
      min_order_value: payload.min_order_value,
      max_usage: payload.max_usage,
      expires_at: new Date(payload.expires_at)
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

  async updateCoupon(id: string, payload: UpdateCouponReqBody) {
    const { expires_at, code, ...rest } = payload

    const updateData: Partial<Coupon> = {
      ...rest,
      ...(code && { code: code.toUpperCase() }),
      ...(expires_at && { expires_at: new Date(expires_at) }),
      updated_at: new Date()
    }

    const updatedCoupon = await databaseServices.coupons.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return { coupon: updatedCoupon }
  }
}

const couponsService = new CouponsService()

export default couponsService
