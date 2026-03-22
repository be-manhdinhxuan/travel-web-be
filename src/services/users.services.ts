import { ObjectId } from 'mongodb'
import databaseServices from './database.services'
import { GetUsersReqQuery, UpdateMeReqBody } from '~/models/requests/User.requests'
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

    if ((await hashPassword(password)) !== user.password) {
      throw new ErrorWithStatus({
        message: MESSAGES.PASSWORD_IS_INCORRECT,
        status: HTTP_STATUS.UNAUTHORIZED
      })
    }

    if ((await hashPassword(new_password)) === user.password) {
      throw new ErrorWithStatus({
        message: MESSAGES.NEW_PASSWORD_MUST_BE_DIFFERENT,
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    await databaseServices.users.updateOne(
      { _id: new ObjectId(user_id) },
      {
        $set: {
          password: await hashPassword(new_password)
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

  async getUsers(query: GetUsersReqQuery) {
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 20
    const keyword = query.keyword || ''
    const role = query.role ? Number(query.role) : null
    const status = query.status ? Number(query.status) : null

    const skip = (page - 1) * limit

    const filter: any = {}

    if (keyword) {
      filter.$or = [{ full_name: { $regex: keyword, $options: 'i' } }, { email: { $regex: keyword, $options: 'i' } }]
    }

    if (role !== null) {
      filter.role = role
    }

    if (status !== null) {
      filter.verify = status
    }

    const [users, total] = await Promise.all([
      databaseServices.users
        .find(filter, {
          projection: {
            password: 0,
            email_verify_token: 0,
            forgot_password_token: 0
          }
        })
        .skip(skip)
        .limit(limit)
        .toArray(),

      databaseServices.users.countDocuments(filter)
    ])

    const total_pages = Math.ceil(total / limit)

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        total_pages
      }
    }
  }

  async getUserDetail(user_id: string) {
    const result = await databaseServices.users
      .aggregate([
        {
          $match: {
            _id: new ObjectId(user_id)
          }
        },

        {
          $lookup: {
            from: 'bookings',
            let: { userId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$user_id', '$$userId']
                  }
                }
              },

              {
                $sort: {
                  created_at: -1
                }
              },

              {
                $limit: 5
              },

              {
                $lookup: {
                  from: 'tours',
                  localField: 'tour_id',
                  foreignField: '_id',
                  as: 'tour'
                }
              },

              {
                $unwind: {
                  path: '$tour',
                  preserveNullAndEmptyArrays: true
                }
              },

              {
                $project: {
                  _id: 1,
                  tour_id: 1,
                  price: 1,
                  created_at: 1,
                  'tour._id': 1,
                  'tour.name': 1,
                  'tour.slug': 1,
                  'tour.images': { $slice: ['$tour.images', 1] }
                }
              }
            ],
            as: 'recent_bookings'
          }
        },

        {
          $project: {
            password: 0,
            email_verify_token: 0,
            forgot_password_token: 0
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

    const user = result[0]

    return {
      user: {
        _id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        verify: user.verify,
        created_at: user.created_at
      },
      recent_bookings: user.recent_bookings
    }
  }

  async updateUserRole(admin_id: string, user_id: string, role: number) {
    if (admin_id === user_id) {
      throw new ErrorWithStatus({
        message: MESSAGES.CANNOT_UPDATE_OWN_ROLE,
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const user = await databaseServices.users.findOne({
      _id: new ObjectId(user_id)
    })

    if (!user) {
      throw new ErrorWithStatus({
        message: MESSAGES.USER_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const updatedUser = await databaseServices.users.findOneAndUpdate(
      { _id: new ObjectId(user_id) },
      {
        $set: {
          role
        },
        $currentDate: {
          updated_at: true
        }
      },
      {
        returnDocument: 'after',
        projection: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0
        }
      }
    )

    await databaseServices.refreshTokens.deleteMany({
      user_id: new ObjectId(user_id)
    })

    return {
      user: updatedUser
    }
  }

  async updateUserStatus(admin_id: string, user_id: string, status: number) {
    if (admin_id === user_id) {
      throw new ErrorWithStatus({
        message: MESSAGES.CANNOT_DISABLE_OWN_ACCOUNT,
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const user = await databaseServices.users.findOne({
      _id: new ObjectId(user_id)
    })

    if (!user) {
      throw new ErrorWithStatus({
        message: MESSAGES.USER_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const updatedUser = await databaseServices.users.findOneAndUpdate(
      { _id: new ObjectId(user_id) },
      {
        $set: {
          status
        },
        $currentDate: {
          updated_at: true
        }
      },
      {
        returnDocument: 'after',
        projection: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0
        }
      }
    )

    await databaseServices.refreshTokens.deleteMany({
      user_id: new ObjectId(user_id)
    })

    return {
      user: updatedUser
    }
  }
}

const usersService = new UsersService()
export default usersService
