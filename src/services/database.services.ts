import { config } from 'dotenv'
import { MongoClient, Db, Collection } from 'mongodb'
import Booking from '~/models/schemas/Booking.schema'
import Category from '~/models/schemas/Category.schema'
import Coupon from '~/models/schemas/Coupon.schema'
import Payment from '~/models/schemas/Payment.schema'
import RefreshToken from '~/models/schemas/RefreshToken.schema'
import Schedule from '~/models/schemas/Schedule.schema'
import Tour from '~/models/schemas/Tour.schema'
import User from '~/models/schemas/User.schema'

config()

const uri = `mongodb://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@ac-oq6ks1i-shard-00-00.7e69wir.mongodb.net:27017,ac-oq6ks1i-shard-00-01.7e69wir.mongodb.net:27017,ac-oq6ks1i-shard-00-02.7e69wir.mongodb.net:27017/?ssl=true&replicaSet=atlas-a3klcx-shard-0&authSource=admin&appName=Cluster-TravelWeb`

class DatabaseService {
  private client: MongoClient
  private db: Db
  constructor() {
    this.client = new MongoClient(uri)
    this.db = this.client.db(process.env.DB_NAME)
  }

  async connect() {
    try {
      await this.db.command({ ping: 1 })
      console.log('Pinged your deployment, You successfully connected to MongoDB!')
    } catch (error) {
      console.log('Error', error)
      throw error
    }
  }

  get users(): Collection<User> {
    return this.db.collection(process.env.DB_USERS_COLLECTION as string)
  }
  get refresh_tokens(): Collection<RefreshToken> {
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
}

const databaseService = new DatabaseService()
export default databaseService
