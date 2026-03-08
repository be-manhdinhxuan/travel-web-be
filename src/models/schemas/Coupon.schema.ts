import { ObjectId } from 'mongodb'
import { cp } from 'node:fs'

interface CouponType {
  _id?: ObjectId
  code: string
  value: number // số tiền giảm cố định (VNĐ)
  min_order_value: number
  max_usage: number
  used_count?: number
  used_by?: ObjectId[]
  expires_at: Date
  is_active?: Boolean
  created_at?: Date
  updated_at?: Date
}

export default class Coupon {
  _id?: ObjectId
  code: string
  value: number
  min_order_value: number
  max_usage: number
  used_count: number
  used_by: ObjectId[]
  expires_at: Date
  is_active: Boolean
  created_at: Date
  updated_at: Date
  constructor(coupon: CouponType) {
    const date = new Date()
    this._id = coupon._id
    this.code = coupon.code
    this.value = coupon.value
    this.min_order_value = coupon.min_order_value
    this.max_usage = coupon.max_usage
    this.used_count = coupon.used_count || 0
    this.used_by = coupon.used_by || []
    this.expires_at = coupon.expires_at
    this.is_active = coupon.is_active || true
    this.created_at = coupon.created_at || date
    this.updated_at = coupon.updated_at || date
  }
}
