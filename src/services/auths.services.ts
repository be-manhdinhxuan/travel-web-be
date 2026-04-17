import { TokenType, UserRole, UserStatus, UserVerifyStatus } from '~/constants/enums'
import User from '~/models/schemas/User.schema'
import { signToken } from '~/utils/jwt'
import { StringValue } from 'ms'
import { RegisterReqBody } from '~/models/requests/Auth.requests'
import { ObjectId } from 'mongodb'
import databaseServices from './database.services'
import RefreshToken from '~/models/schemas/RefreshToken.schema'
import { comparePassword, hashPassword } from '~/utils/crypto'
import emailService from './email.services'
import { MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
import axios from 'axios'
import qs from 'qs'

class AuthService {
  private signAccessToken({
    user_id,
    role,
    verify,
    status
  }: {
    user_id: string
    role: UserRole
    verify: UserVerifyStatus
    status: UserStatus
  }) {
    return signToken({
      payload: {
        user_id,
        role,
        verify,
        status,
        token_type: TokenType.AccessToken
      },
      privateKey: process.env.JWT_SECRET_ACCESS_TOKEN as string,
      options: {
        expiresIn: process.env.JWT_ACCESS_EXPIRES as StringValue
      }
    })
  }

  private signRefreshToken({
    user_id,
    role,
    verify,
    status
  }: {
    user_id: string
    role: UserRole
    verify: UserVerifyStatus
    status: UserStatus
  }) {
    return signToken({
      payload: {
        user_id,
        role,
        verify,
        status,
        token_type: TokenType.RefreshToken
      },
      privateKey: process.env.JWT_SECRET_REFRESH_TOKEN as string,
      options: {
        expiresIn: process.env.JWT_REFRESH_EXPIRES as StringValue
      }
    })
  }

  private signEmailVerifyToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    return signToken({
      payload: {
        user_id,
        token_type: TokenType.EmailVerifyToken,
        verify
      },
      privateKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string,
      options: {
        expiresIn: process.env.JWT_EMAIL_VERIFY_EXPIRES as StringValue
      }
    })
  }

  private signForgotPasswordToken({
    user_id,
    verify,
    status
  }: {
    user_id: string
    verify: UserVerifyStatus
    status: UserStatus
  }) {
    return signToken({
      payload: {
        user_id,
        token_type: TokenType.ForgotPasswordToken,
        verify,
        status
      },
      privateKey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string,
      options: {
        expiresIn: process.env.JWT_FORGOT_PASSWORD_EXPIRES as StringValue
      }
    })
  }

  private signAccessAndRefreshToken({
    user_id,
    role,
    verify,
    status
  }: {
    user_id: string
    role: UserRole
    verify: UserVerifyStatus
    status: UserStatus
  }) {
    return Promise.all([
      this.signAccessToken({ user_id, role, verify, status }),
      this.signRefreshToken({ user_id, role, verify, status })
    ])
  }

  async register(payload: RegisterReqBody) {
    const user_id = new ObjectId()
    const email_verify_token = await this.signEmailVerifyToken({
      user_id: user_id.toString(),
      verify: UserVerifyStatus.Unverified
    })
    await databaseServices.users.insertOne(
      new User({
        ...payload,
        _id: user_id,
        full_name: payload.full_name,
        email_verify_token,
        date_of_birth: new Date(payload.date_of_birth),
        password: await hashPassword(payload.password)
      })
    )

    // gửi email xác thực
    try {
      emailService.sendVerifyEmail(payload.email, email_verify_token)
    } catch (error) {
      console.log('Send verify email error:', error)
    }

    const [access_token, refresh_token] = await this.signAccessAndRefreshToken({
      user_id: user_id.toString(),
      role: UserRole.User,
      verify: UserVerifyStatus.Unverified,
      status: UserStatus.Active
    })
    await databaseServices.refreshTokens.insertOne(
      new RefreshToken({ user_id: new ObjectId(user_id), token: refresh_token })
    )
    return {
      access_token,
      refresh_token
    }
  }

  async checkEmailExist(email: string) {
    const user = await databaseServices.users.findOne({ email })
    return Boolean(user)
  }

  async verifyEmail(user_id: string) {
    const result = await databaseServices.users.findOneAndUpdate(
      {
        _id: new ObjectId(user_id)
      },
      {
        $set: {
          email_verify_token: '',
          verify: UserVerifyStatus.Verified
        },
        $currentDate: {
          updated_at: true
        }
      },
      {
        returnDocument: 'before'
      }
    )

    if (!result) {
      throw new ErrorWithStatus({
        message: MESSAGES.USER_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (result.verify === UserVerifyStatus.Verified) {
      return {
        message: MESSAGES.EMAIL_ALREADY_VERIFIED_BEFORE
      }
    }

    const [access_token, refresh_token] = await this.signAccessAndRefreshToken({
      user_id,
      role: UserRole.User,
      verify: UserVerifyStatus.Verified,
      status: UserStatus.Active
    })

    await databaseServices.refreshTokens.insertOne(
      new RefreshToken({
        user_id: new ObjectId(user_id),
        token: refresh_token
      })
    )

    return {
      access_token,
      refresh_token
    }
  }

  async resendEmailVerify(user_id: string) {
    const user = await databaseServices.users.findOne({
      _id: new ObjectId(user_id)
    })

    if (!user) {
      throw new ErrorWithStatus({
        message: MESSAGES.USER_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (user.verify === UserVerifyStatus.Verified) {
      return {
        message: MESSAGES.EMAIL_ALREADY_VERIFIED_BEFORE
      }
    }

    const email_verify_token = await this.signEmailVerifyToken({
      user_id,
      verify: UserVerifyStatus.Unverified
    })

    await databaseServices.users.updateOne(
      { _id: new ObjectId(user_id) },
      {
        $set: {
          email_verify_token
        },
        $currentDate: {
          updated_at: true
        }
      }
    )

    // gửi email lại
    emailService.sendVerifyEmail(user.email, email_verify_token)

    return {
      message: MESSAGES.RESEND_EMAIL_VERIFY_SUCCESS
    }
  }

  async login({
    user_id,
    email,
    name,
    role,
    verify,
    status,
    avatar
  }: {
    user_id: string
    email: string
    name: string
    role: UserRole
    verify: UserVerifyStatus
    status: UserStatus
    avatar: string
  }) {
    const [access_token, refresh_token] = await this.signAccessAndRefreshToken({
      user_id,
      role,
      verify,
      status
    })
    await databaseServices.refreshTokens.insertOne(
      new RefreshToken({ user_id: new ObjectId(user_id), token: refresh_token })
    )
    return {
      access_token,
      refresh_token,
      user: {
        id: user_id,
        email,
        name,
        role,
        verify,
        status,
        avatar
      }
    }
  }

  async logout(refresh_token: string) {
    const result = await databaseServices.refreshTokens.deleteOne({ token: refresh_token })
    console.log(result)
    return {
      message: MESSAGES.LOGOUT_SUCCESS
    }
  }

  async refreshToken({
    user_id,
    role,
    verify,
    status,
    refresh_token
  }: {
    user_id: string
    role: UserRole
    verify: UserVerifyStatus
    status: UserStatus
    refresh_token: string
  }) {
    const [new_access_token, new_refresh_token] = await Promise.all([
      this.signAccessToken({ user_id, role, verify, status }),
      this.signRefreshToken({ user_id, role, verify, status })
    ])
    await databaseServices.refreshTokens.deleteOne({ token: refresh_token })

    await databaseServices.refreshTokens.insertOne(
      new RefreshToken({ user_id: new ObjectId(user_id), token: new_refresh_token })
    )
    return {
      access_token: new_access_token,
      refresh_token: new_refresh_token
    }
  }

  async forgotPassword({ user_id, verify, status }: { user_id: string; verify: UserVerifyStatus; status: UserStatus }) {
    const forgot_password_token = await this.signForgotPasswordToken({
      user_id,
      verify,
      status
    })

    const user = await databaseServices.users.findOneAndUpdate(
      { _id: new ObjectId(user_id) },
      {
        $set: { forgot_password_token },
        $currentDate: { updated_at: true }
      }
    )

    if (!user) return

    emailService.sendForgotPasswordEmail(user.email, forgot_password_token).catch(console.error)

    return {
      message: MESSAGES.CHECK_EMAIL_TO_RESET_PASSWORD
    }
  }

  async resetPassword(user_id: string, password: string, confirm_password: string) {
    const user = await databaseServices.users.findOne({ _id: new ObjectId(user_id) })

    if (!user) {
      throw new ErrorWithStatus({
        message: MESSAGES.USER_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // không cho dùng lại mật khẩu cũ
    const isSameOldPassword = await comparePassword(password, user.password)

    if (isSameOldPassword) {
      throw new ErrorWithStatus({
        message: MESSAGES.NEW_PASSWORD_MUST_BE_DIFFERENT,
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    await databaseServices.users.updateOne(
      { _id: new ObjectId(user_id) },
      {
        $set: {
          forgot_password_token: '',
          password: await hashPassword(password)
        },
        $currentDate: {
          updated_at: true
        }
      }
    )

    return {
      message: MESSAGES.RESET_PASSWORD_SUCCESS
    }
  }

  async loginWithGoogle(code: string) {
    const tokenRes = await axios.post(
      'https://oauth2.googleapis.com/token',
      qs.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )

    const { access_token } = tokenRes.data

    const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    })

    const { email, name, picture, id } = userInfoRes.data

    if (!email) {
      throw new ErrorWithStatus({
        message: 'Không lấy được email từ Google',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const normalizedEmail = email.toLowerCase()

    // tìm theo provider_id trước
    let user = await databaseServices.users.findOne({ provider: 'google', provider_id: id })

    // nếu chưa có -> tìm theo email
    if (!user) {
      user = await databaseServices.users.findOne({ email: normalizedEmail })
    }

    // check nếu bị banned
    if (user?.status === UserStatus.Banned) {
      throw new ErrorWithStatus({
        message: MESSAGES.ACCOUNT_BANNED,
        status: HTTP_STATUS.FORBIDDEN
      })
    }

    // nếu user tồn tại nhưng chưa liên kết với google thì update để liên kết
    if (user && user.provider !== 'google') {
      await databaseServices.users.updateOne(
        { _id: user._id },
        {
          $set: { provider: 'google', provider_id: id },
          $currentDate: { updated_at: true }
        }
      )
    }

    // nếu chưa có user nào cả thì tạo mới
    if (!user) {
      const newUser = new User({
        email: normalizedEmail,
        full_name: name,
        password: await hashPassword(Math.random().toString()),
        date_of_birth: new Date(),
        verify: UserVerifyStatus.Verified,
        avatar: picture,
        provider: 'google',
        provider_id: id
      })

      const result = await databaseServices.users.insertOne(newUser)

      user = {
        ...newUser,
        _id: result.insertedId
      }
    }

    if (!user) {
      throw new Error('User creation failed')
    }

    const access_token_app = await this.signAccessToken({
      user_id: user._id!.toString(),
      role: user.role,
      verify: user.verify,
      status: user.status
    })

    const refresh_token_app = await this.signRefreshToken({
      user_id: user._id!.toString(),
      role: user.role,
      verify: user.verify,
      status: user.status
    })

    return {
      access_token: access_token_app,
      refresh_token: refresh_token_app
    }
  }

  async loginWithFacebook(code: string) {
    // 1. đổi code → access token
    const tokenRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: process.env.FACEBOOK_CLIENT_ID,
        client_secret: process.env.FACEBOOK_CLIENT_SECRET,
        redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
        code
      }
    })

    const access_token = tokenRes.data.access_token

    // 2. lấy user info
    const userRes = await axios.get('https://graph.facebook.com/me', {
      params: {
        fields: 'id,name,email,picture',
        access_token
      }
    })

    const { email, name, picture, id } = userRes.data

    // 🔥 tìm theo facebook id trước
    let user = await databaseServices.users.findOne({
      provider: 'facebook',
      provider_id: id
    })

    // 🔥 nếu chưa có → tìm theo email
    if (!user && email) {
      const normalizedEmail = email.toLowerCase()
      user = await databaseServices.users.findOne({ email: normalizedEmail })
    }

    // 🔒 check banned
    if (user?.status === UserStatus.Banned) {
      throw new ErrorWithStatus({
        message: MESSAGES.ACCOUNT_BANNED,
        status: HTTP_STATUS.FORBIDDEN
      })
    }

    // 🔗 link account nếu cần
    if (user && user.provider !== 'facebook') {
      await databaseServices.users.updateOne(
        { _id: user._id },
        {
          $set: {
            provider: 'facebook',
            provider_id: id
          },
          $currentDate: { updated_at: true }
        }
      )
    }

    // 🔥 CASE QUAN TRỌNG: KHÔNG CÓ EMAIL
    if (!user && !email) {
      throw Object.assign(new Error('EMAIL_REQUIRED'), {
        provider_id: id
      })
    }

    // 🆕 create nếu có email
    if (!user && email) {
      const normalizedEmail = email.toLowerCase()

      const newUser = new User({
        email: normalizedEmail,
        full_name: name,
        password: await hashPassword(Math.random().toString()),
        date_of_birth: new Date(),
        verify: UserVerifyStatus.Verified,
        avatar: picture?.data?.url || '',
        provider: 'facebook',
        provider_id: id
      })

      const result = await databaseServices.users.insertOne(newUser)

      user = {
        ...newUser,
        _id: result.insertedId
      }
    }

    if (!user) {
      throw new Error('User creation failed')
    }

    // 🔐 token
    const access_token_app = await this.signAccessToken({
      user_id: user._id!.toString(),
      role: user.role,
      verify: user.verify,
      status: user.status
    })

    const refresh_token_app = await this.signRefreshToken({
      user_id: user._id!.toString(),
      role: user.role,
      verify: user.verify,
      status: user.status
    })

    return {
      access_token: access_token_app,
      refresh_token: refresh_token_app
    }
  }

  async completeFacebook(email: string, provider_id: string) {
    const normalizedEmail = email.toLowerCase()

    // tìm user theo email
    let user = await databaseServices.users.findOne({ email: normalizedEmail })

    // nếu user tồn tại nhưng bị khóa
    if (user?.status === UserStatus.Banned) {
      throw new ErrorWithStatus({
        message: MESSAGES.ACCOUNT_BANNED,
        status: HTTP_STATUS.FORBIDDEN
      })
    }

    // nếu user tồn tại → link facebook
    if (user) {
      await databaseServices.users.updateOne(
        { _id: user._id },
        {
          $set: {
            provider: 'facebook',
            provider_id,
            updated_at: new Date()
          }
        }
      )
    } else {
      // tạo user mới
      const newUser = new User({
        email: normalizedEmail,
        full_name: '', // FE có thể bổ sung sau
        password: await hashPassword(Math.random().toString()),
        date_of_birth: new Date(),
        verify: UserVerifyStatus.Verified,
        provider: 'facebook',
        provider_id
      })

      const result = await databaseServices.users.insertOne(newUser)

      user = {
        ...newUser,
        _id: result.insertedId
      }
    }

    if (!user) {
      throw new Error('User creation failed')
    }

    // generate token
    const access_token = await this.signAccessToken({
      user_id: user._id!.toString(),
      role: user.role,
      verify: user.verify,
      status: user.status
    })

    const refresh_token = await this.signRefreshToken({
      user_id: user._id!.toString(),
      role: user.role,
      verify: user.verify,
      status: user.status
    })

    return {
      access_token,
      refresh_token
    }
  }
}

const authsService = new AuthService()
export default authsService
