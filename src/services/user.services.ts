import { ObjectId } from 'mongodb'
import databaseServices from './database.services'
import { UpdateMeReqBody } from '~/models/requests/User.requests'
import cloudinary, { getPublicIdFromUrl } from '~/utils/cloudinary'
import streamifier from 'streamifier'
import { ErrorWithStatus } from '~/models/Errors'
import { MESSAGES } from '~/constants/messages'
import HTTP_STATUS from '~/constants/httpStatus'

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

  async updateAvatar(user_id: string, file: Express.Multer.File) {
    const user = await databaseServices.users.findOne({
      _id: new ObjectId(user_id)
    })

    if (!user) {
      throw new ErrorWithStatus({
        message: MESSAGES.USER_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // upload avatar mới
    const result: any = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'avatars',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'auto' },
            { quality: 'auto' },
            { fetch_format: 'webp' }
          ]
        },
        (error, result) => {
          if (result) resolve(result)
          else reject(error)
        }
      )

      streamifier.createReadStream(file.buffer).pipe(uploadStream)
    })

    const avatar_url = result.secure_url

    // xóa avatar cũ
    if (user.avatar) {
      const publicId = getPublicIdFromUrl(user.avatar)
      if (publicId) {
        cloudinary.uploader.destroy(publicId).catch(console.error)
      }
    }

    await databaseServices.users.updateOne(
      { _id: new ObjectId(user_id) },
      {
        $set: { avatar: avatar_url },
        $currentDate: { updated_at: true }
      }
    )

    return avatar_url
  }
}

const usersService = new UsersService()
export default usersService
