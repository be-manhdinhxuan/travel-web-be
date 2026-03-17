import { CreateCouponReqBody } from '~/models/requests/Coupon.requests'
import Coupon from '~/models/schemas/Coupon.schema'
import databaseServices from './database.services'

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
}

const couponsService = new CouponsService()

export default couponsService
