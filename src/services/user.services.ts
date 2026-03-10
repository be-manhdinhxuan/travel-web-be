import { ObjectId } from 'mongodb'
import databaseServices from './database.services'
import { UpdateMeReqBody } from '~/models/requests/User.requests'

class UsersService {
  async getMe(user_id: string) {
    const user = await databaseServices.users.findOne(
      { _id: new ObjectId(user_id) },
      { projection: { password: 0, email_verify_token: 0, forgot_password_token: 0 } }
    )
    return user
  }

  async updateMe(user_id: string, payload: UpdateMeReqBody) {
    const _payload = payload.date_of_birth ? { ...payload, date_of_birth: new Date(payload.date_of_birth) } : payload
    const user = await databaseServices.users.findOneAndUpdate(
      { _id: new ObjectId(user_id) },
      { $set: { ...(_payload as UpdateMeReqBody & { date_of_birth?: Date }) }, $currentDate: { updated_at: true } },
      { returnDocument: 'after', projection: { password: 0, email_verify_token: 0, forgot_password_token: 0 } }
    )
    return user
  }
}

const usersService = new UsersService()
export default usersService
