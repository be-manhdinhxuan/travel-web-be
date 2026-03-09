import { config } from 'dotenv'
import { TokenType, UserRole, UserVerifyStatus } from '~/constants/enums'
import User from '~/models/schemas/User.schema'
import { signToken } from '~/utils/jwt'
import { StringValue } from 'ms'
import { RegisterReqBody } from '~/models/requests/Auth.requests'
import { ObjectId } from 'mongodb'
import databaseServices from './database.services'
import RefreshToken from '~/models/schemas/RefreshToken.schema'
import { hashPassword } from '~/utils/crypto'
import emailService from './email.services'
import { MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'

config()

class AuthService {
  private signAccessToken({ user_id, role, verify }: { user_id: string; role: UserRole; verify: UserVerifyStatus }) {
    return signToken({
      payload: {
        user_id,
        role,
        verify,
        token_type: TokenType.AccessToken,
      },
      privateKey: process.env.JWT_SECRET_ACCESS_TOKEN as string,
      options: {
        expiresIn: process.env.JWT_ACCESS_EXPIRES as StringValue
      }
    })
  }

  private signRefreshToken({ user_id, role, verify }: { user_id: string; role: UserRole; verify: UserVerifyStatus }) {
    return signToken({
      payload: {
        user_id,
        role,
        verify,
        token_type: TokenType.RefreshToken,
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

  private signForgotPasswordToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    return signToken({
      payload: {
        user_id,
        token_type: TokenType.ForgotPasswordToken,
        verify
      },
      privateKey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string,
      options: {
        expiresIn: process.env.JWT_FORGOT_PASSWORD_EXPIRES as StringValue
      }
    })
  }

  private signAccessAndRefreshToken({ user_id, role, verify }: { user_id: string; role: UserRole; verify: UserVerifyStatus }) {
    return Promise.all([this.signAccessToken({ user_id, role, verify }), this.signRefreshToken({ user_id, role, verify })])
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
        password: hashPassword(payload.password)
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
      verify: UserVerifyStatus.Unverified
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
      verify: UserVerifyStatus.Verified
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

  async login({ user_id, role, verify }: { user_id: string; role: UserRole; verify: UserVerifyStatus }) {
    const [access_token, refresh_token] = await this.signAccessAndRefreshToken({
      user_id,
      role,
      verify
    })
    await databaseServices.refreshTokens.insertOne(
      new RefreshToken({ user_id: new ObjectId(user_id), token: refresh_token })
    )
    return {
      access_token,
      refresh_token
    }
  }

  async logout(refresh_token: string) {
    const result = await databaseServices.refreshTokens.deleteOne({ token: refresh_token })
    console.log(result)
    return {
      message: MESSAGES.LOGOUT_SUCCESS
    }
  }
}

const authsService = new AuthService()
export default authsService
