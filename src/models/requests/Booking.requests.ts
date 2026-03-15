import { BookingStatus, PaymentProvider } from '~/constants/enums'

export interface CreateBookingReqBody {
  schedule_id: string
  passengers: {
    adults: number
    children?: number
    babies?: number
  }
  coupon_code?: string
  payment_method: PaymentProvider
  contact_info: {
    full_name: string
    phone: string
    email: string
  }
}

export interface GetMyBookingsQuery {
  page?: number
  limit?: number
  status?: BookingStatus
}

export interface GetBookingsQuery {
  page?: number
  limit?: number
  status?: BookingStatus
  keyword?: string
  tour_id?: string
  from_date?: string
  to_date?: string
}
