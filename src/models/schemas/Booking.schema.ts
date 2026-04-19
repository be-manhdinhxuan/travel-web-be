import { ObjectId } from 'mongodb'
import { BookingStatus, PaymentProvider } from '~/constants/enums'

interface PassengersType {
  adults: number
  children: number
  babies: number
}

interface ContactInfoType {
  full_name: string
  email: string
  phone: string
}

interface TourSnapshotType {
  tour_id: ObjectId
  tour_name: string
  schedule_id: ObjectId
  departure_date: Date
  return_date: Date
  price_adult: number
  price_child: number
  price_baby: number
}

interface PriceDetailType {
  adult_count: number
  child_count: number
  baby_count: number
  adult_total: number
  child_total: number
  baby_total: number
  discount_amount: number
  coupon_code: string
}

interface BookingType {
  _id?: ObjectId
  booking_code: string
  user_id: ObjectId
  schedule_id: ObjectId
  coupon_id?: ObjectId | null
  tour_snapshot: TourSnapshotType
  passengers: PassengersType
  contact_info: ContactInfoType
  price_detail: PriceDetailType
  total_price: number
  final_price: number
  status?: BookingStatus
  cancelled_reason?: string
  reminder_sent?: boolean
  created_at?: Date
  updated_at?: Date
}

export default class Booking {
  _id?: ObjectId
  booking_code: string
  user_id: ObjectId
  schedule_id: ObjectId
  coupon_id: ObjectId | null
  tour_snapshot: TourSnapshotType
  passengers: PassengersType
  contact_info: ContactInfoType
  price_detail: PriceDetailType
  total_price: number
  final_price: number
  status: BookingStatus
  cancelled_reason: string
  reminder_sent: boolean
  created_at: Date
  updated_at: Date
  constructor(booking: BookingType) {
    const date = new Date()
    this._id = booking._id
    this.booking_code = booking.booking_code
    this.user_id = booking.user_id
    this.schedule_id = booking.schedule_id
    this.coupon_id = booking.coupon_id || null
    this.tour_snapshot = booking.tour_snapshot
    this.passengers = booking.passengers
    this.contact_info = booking.contact_info
    this.price_detail = booking.price_detail
    this.total_price = booking.total_price
    this.final_price = booking.final_price
    this.status = booking.status || BookingStatus.Pending
    this.cancelled_reason = booking.cancelled_reason || ''
    this.reminder_sent = booking.reminder_sent || false
    this.created_at = booking.created_at || date
    this.updated_at = booking.updated_at || date
  }
}
