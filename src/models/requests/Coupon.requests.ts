export interface CreateCouponReqBody {
  code: string
  value: number
  min_order_value: number
  max_usage: number
  expires_at: string
}

export interface GetCouponsQuery {
  page?: number
  limit?: number
  is_active?: boolean
  keyword?: string
}

export interface UpdateCouponReqBody {
  code?: string
  value?: number
  min_order_value?: number
  max_usage?: number
  expires_at?: string
}

export interface ValidateCouponReqBody {
  code: string
  order_value: number
}

export interface ApplyBookingCouponReqBody {
  booking_id: string
  user_id: string
  coupon_code: string
}
