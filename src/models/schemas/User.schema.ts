import { ObjectId } from 'mongodb'
import { UserRole, UserStatus, UserVerifyStatus } from '~/constants/enums'

interface UserType {
  _id?: ObjectId
  full_name: string
  email: string
  password: string
  date_of_birth: Date
  role?: UserRole
  verify?: UserVerifyStatus
  status?: UserStatus
  email_verify_token?: string
  forgot_password_token?: string
  avatar?: string
  phone?: string
  address?: string
  wishlist?: ObjectId[]
  created_at?: Date
  updated_at?: Date
}

export default class User {
  _id?: ObjectId
  full_name: string
  email: string
  password: string
  date_of_birth: Date
  role: UserRole
  status: UserStatus
  verify: UserVerifyStatus
  email_verify_token: string
  forgot_password_token: string
  avatar: string
  phone: string
  address: string
  wishlist: ObjectId[]
  created_at?: Date
  updated_at?: Date

  constructor(user: UserType) {
    const date = new Date()
    this._id = user._id
    this.full_name = user.full_name || ''
    this.email = user.email
    this.password = user.password
    this.date_of_birth = user.date_of_birth || new Date()
    this.role = user.role || UserRole.User
    this.verify = user.verify || UserVerifyStatus.Unverified
    this.status = user.status || UserStatus.Active
    this.email_verify_token = user.email_verify_token || ''
    this.forgot_password_token = user.forgot_password_token || ''
    this.avatar = user.avatar || ''
    this.phone = user.phone || ''
    this.address = user.address || ''
    this.wishlist = user.wishlist || []
    this.created_at = user.created_at || date
    this.updated_at = user.updated_at || date
  }
}
