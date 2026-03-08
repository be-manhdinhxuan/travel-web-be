import { ObjectId } from 'mongodb'
import { PaymentProvider, PaymentStatus } from '~/constants/enums'

interface PaymentType {
  _id?: ObjectId
  booking_id: ObjectId
  user_id: ObjectId
  provider: PaymentProvider
  transaction_id?: string
  provider_order_id: string
  amount: number
  status?: PaymentStatus
  raw_response?: Record<string, unknown> // Lưu toàn bộ payload từ MoMo/VNPay để đối soát khi cần
  paid_at?: Date | null
  created_at?: Date
  updated_at?: Date
}

export default class Payment {
  _id?: ObjectId
  booking_id: ObjectId
  user_id: ObjectId
  provider: PaymentProvider
  transaction_id: string
  provider_order_id: string
  amount: number
  status: PaymentStatus
  raw_response: Record<string, unknown>
  paid_at: Date | null
  created_at: Date
  updated_at: Date
  constructor(payment: PaymentType) {
    const date = new Date()
    this._id = payment._id
    this.booking_id = payment.booking_id
    this.user_id = payment.user_id
    this.provider = payment.provider
    this.transaction_id = payment.transaction_id || ''
    this.provider_order_id = payment.provider_order_id
    this.amount = payment.amount
    this.status = payment.status || PaymentStatus.Pending
    this.raw_response = payment.raw_response || {}
    this.paid_at = payment.paid_at || null
    this.created_at = payment.created_at || date
    this.updated_at = payment.updated_at || date
  }
}
