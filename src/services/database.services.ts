import { MongoClient, Db, Collection } from 'mongodb'
import Booking from '~/models/schemas/Booking.schema'
import Category from '~/models/schemas/Category.schema'
import Coupon from '~/models/schemas/Coupon.schema'
import Payment from '~/models/schemas/Payment.schema'
import RefreshToken from '~/models/schemas/RefreshToken.schema'
import Review from '~/models/schemas/Review.schema'
import Schedule from '~/models/schemas/Schedule.schema'
import Tour from '~/models/schemas/Tour.schema'
import User from '~/models/schemas/User.schema'

class DatabaseService {
  private client: MongoClient
  private db: Db
  constructor() {
    const uri = `mongodb://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@ac-oq6ks1i-shard-00-00.7e69wir.mongodb.net:27017,ac-oq6ks1i-shard-00-01.7e69wir.mongodb.net:27017,ac-oq6ks1i-shard-00-02.7e69wir.mongodb.net:27017/?ssl=true&replicaSet=atlas-a3klcx-shard-0&authSource=admin&appName=Cluster-TravelWeb`
    this.client = new MongoClient(uri)
    this.db = this.client.db(process.env.DB_NAME)
  }

  async indexCollections() {
    // users
    await this.users.createIndex({ email: 1 }, { unique: true })
    await this.users.createIndex({ status: 1 })

    // refresh_tokens
    await this.refreshTokens.createIndex({ token: 1 }, { unique: true })
    await this.refreshTokens.createIndex({ user_id: 1 })
    await this.refreshTokens.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }) // TTL

    // categories
    await this.categories.createIndex({ slug: 1 }, { unique: true })
    await this.categories.createIndex({ is_active: 1 })

    // tours
    await this.tours.createIndex({ slug: 1 }, { unique: true })
    await this.tours.createIndex({ category_id: 1 })
    await this.tours.createIndex({ destination: 1 })
    await this.tours.createIndex({ status: 1 })
    await this.tours.createIndex({ name: 'text', description: 'text' }) // full-text search

    // schedules
    await this.schedules.createIndex({ tour_id: 1 })
    await this.schedules.createIndex({ departure_date: 1 })
    await this.schedules.createIndex({ status: 1 })
    await this.schedules.createIndex({ available_slots: 1 })

    // bookings
    await this.bookings.createIndex({ booking_code: 1 }, { unique: true })
    await this.bookings.createIndex({ user_id: 1 })
    await this.bookings.createIndex({ schedule_id: 1 })
    await this.bookings.createIndex({ status: 1 })
    await this.bookings.createIndex({ created_at: 1 })

    // payments
    await this.payments.createIndex({ booking_id: 1 })
    await this.payments.createIndex({ booking_id: 1, created_at: -1 })
    await this.payments.createIndex({ provider_order_id: 1 }, { unique: true })
    await this.payments.createIndex({ user_id: 1 })
    await this.payments.createIndex({ status: 1 })

    // coupons
    await this.coupons.createIndex({ code: 1 }, { unique: true })
    await this.coupons.createIndex({ is_active: 1 })
    await this.coupons.createIndex({ expires_at: 1 })

    // reviews
    await this.reviews.createIndex({ booking_id: 1 }, { unique: true }) // 1 booking = 1 review
    await this.reviews.createIndex({ tour_id: 1 })
    await this.reviews.createIndex({ user_id: 1 })
  }

  async connect() {
    try {
      await this.db.command({ ping: 1 })
      console.log('Pinged your deployment, You successfully connected to MongoDB!')
      await this.indexCollections()
    } catch (error) {
      console.log('Error', error)
      throw error
    }
  }

  get users(): Collection<User> {
    return this.db.collection(process.env.DB_USERS_COLLECTION as string)
  }
  get refreshTokens(): Collection<RefreshToken> {
    return this.db.collection(process.env.DB_REFRESH_TOKENS_COLLECTION as string)
  }
  get categories(): Collection<Category> {
    return this.db.collection(process.env.DB_CATEGORIES_COLLECTION as string)
  }
  get tours(): Collection<Tour> {
    return this.db.collection(process.env.DB_TOURS_COLLECTION as string)
  }
  get schedules(): Collection<Schedule> {
    return this.db.collection(process.env.DB_SCHEDULES_COLLECTION as string)
  }
  get bookings(): Collection<Booking> {
    return this.db.collection(process.env.DB_BOOKINGS_COLLECTION as string)
  }
  get payments(): Collection<Payment> {
    return this.db.collection(process.env.DB_PAYMENTS_COLLECTION as string)
  }
  get coupons(): Collection<Coupon> {
    return this.db.collection(process.env.DB_COUPONS_COLLECTION as string)
  }
  get reviews(): Collection<Review> {
    return this.db.collection(process.env.DB_REVIEWS_COLLECTION as string)
  }
}

const databaseService = new DatabaseService()
export default databaseService
