import { config } from 'dotenv'
import { MongoClient, Db, Collection } from 'mongodb'
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
}

const databaseService = new DatabaseService()
export default databaseService
