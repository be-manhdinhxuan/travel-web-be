import { ObjectId } from 'mongodb'
import databaseServices from './database.services'
import { UpdateMeReqBody } from '~/models/requests/User.requests'
import cloudinary, { getPublicIdFromUrl } from '~/utils/cloudinary'
import streamifier from 'streamifier'
import { ErrorWithStatus } from '~/models/Errors'
import { MESSAGES } from '~/constants/messages'
import HTTP_STATUS from '~/constants/httpStatus'
import { hashPassword } from '~/utils/crypto'

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

  async changePassword(user_id: string, password: string, new_password: string) {
    const user = await databaseServices.users.findOne({ _id: new ObjectId(user_id) })

    if (!user) {
      throw new ErrorWithStatus({
        message: MESSAGES.USER_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (hashPassword(password) !== user.password) {
      throw new ErrorWithStatus({
        message: MESSAGES.PASSWORD_IS_INCORRECT,
        status: HTTP_STATUS.UNAUTHORIZED
      })
    }

    if (hashPassword(new_password) === user.password) {
      throw new ErrorWithStatus({
        message: MESSAGES.NEW_PASSWORD_MUST_BE_DIFFERENT,
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    await databaseServices.users.updateOne(
      { _id: new ObjectId(user_id) },
      {
        $set: {
          password: hashPassword(new_password)
        },
        $currentDate: {
          updated_at: true
        }
      }
    )

    // logout tất cả thiết bị
    await databaseServices.refreshTokens.deleteMany({
      user_id: new ObjectId(user_id)
    })

    return true
  }

  async toggleWishlist(user_id: string, tour_id: string) {
    const user = await databaseServices.users.findOne({
      _id: new ObjectId(user_id)
    })

    if (!user) {
      throw new ErrorWithStatus({
        message: MESSAGES.USER_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const tourObjectId = new ObjectId(tour_id)

    let updatedUser

    if (user.wishlist?.some((id) => id.equals(tourObjectId))) {
      // remove
      updatedUser = await databaseServices.users.findOneAndUpdate(
        { _id: new ObjectId(user_id) },
        { $pull: { wishlist: tourObjectId } },
        { returnDocument: 'after', projection: { wishlist: 1 } }
      )
    } else {
      // add
      updatedUser = await databaseServices.users.findOneAndUpdate(
        { _id: new ObjectId(user_id) },
        { $addToSet: { wishlist: tourObjectId } },
        { returnDocument: 'after', projection: { wishlist: 1 } }
      )
    }

    return {
      wishlist: updatedUser?.wishlist
    }
  }

  async getMyWishlist(user_id: string) {
    const result = await databaseServices.users
      .aggregate([
        {
          $match: {
            _id: new ObjectId(user_id)
          }
        },
        {
          $lookup: {
            from: 'tours',
            let: { wishlist: '$wishlist' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$_id', '$$wishlist']
                  }
                }
              },
              {
                $project: {
                  _id: 1,
                  name: 1,
                  slug: 1,
                  destination: 1,
                  duration_days: 1,
                  duration_nights: 1,
                  images: { $slice: ['$images', 1] },
                  flash_sale: 1
                }
              }
            ],
            as: 'tours'
          }
        },
        {
          $project: {
            _id: 0,
            tours: 1
          }
        }
      ])
      .toArray()

    if (!result.length) {
      throw new ErrorWithStatus({
        message: MESSAGES.USER_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    return {
      tours: result[0].tours
    }
  }
}

const usersService = new UsersService()
export default usersService
