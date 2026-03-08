import express from 'express'
import { config } from 'dotenv'
import databaseService from './services/database.services'

config()
databaseService.connect()
const app = express()
const port = process.env.PORT || 4000

app.listen(port, () => {
  console.log(`Server đang chạy ở cổng ${port}`)
})
