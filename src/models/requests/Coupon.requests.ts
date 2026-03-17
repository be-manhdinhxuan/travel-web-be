export interface CreateCouponReqBody {
  code: string
  value: number
  min_order_value: number
  max_usage: number
  expires_at: string
}
