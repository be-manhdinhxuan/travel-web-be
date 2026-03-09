import { JwtPayload } from 'jsonwebtoken'
import { TokenType, UserRole, UserVerifyStatus } from '~/constants/enums'
import { ParamsDictionary } from 'express-serve-static-core'

export interface TokenPayload extends JwtPayload {
  user_id: string
  token_type: TokenType
  verify: UserVerifyStatus
  role: UserRole
}

export interface RegisterReqBody {
  full_name: string
  email: string
  password: string
  confirm_password: string
  date_of_birth: string
}

export interface VerifyEmailReqBody {
  email_verify_token: string
}

export interface LoginReqBody {
  email: string
  password: string
}

export interface LogoutReqBody {
  refresh_token: string
}

export interface RefreshTokenReqBody {
  refresh_token: string
}
