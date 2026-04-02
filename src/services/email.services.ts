import nodemailer from 'nodemailer'
import { config } from 'dotenv'

config()

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD
  }
})

const sendVerifyEmail = async (to: string, token: string) => {
  const verifyUrl = `${process.env.CLIENT_URL}/code%20du%20an/html/xac-thuc.html?token=${token}`

  await transporter.sendMail({
    from: `"Travel Web" <${process.env.MAIL_USER}>`,
    to,
    subject: 'Xác thực tài khoản của bạn',
    text: `Xin chào,\n\nVui lòng xác thực email của bạn bằng cách truy cập link sau:\n\n${verifyUrl}\n\nLink có hiệu lực trong 24 giờ.\n\nNếu bạn không thực hiện đăng ký này, hãy bỏ qua email này.\n\nTrân trọng,\nTravel Web`
  })
}

const sendForgotPasswordEmail = async (to: string, forgot_password_token: string) => {
  const resetUrl = `${process.env.CLIENT_URL}/code%20du%20an/html/quen-mat-khau.html?token=${forgot_password_token}`

  await transporter.sendMail({
    from: `"Travel Web" <${process.env.MAIL_USER}>`,
    to,
    subject: 'Đặt lại mật khẩu',
    text: `Xin chào,\n\nChúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.\n\nTruy cập link sau để đặt lại mật khẩu:\n\n${resetUrl}\n\nLink có hiệu lực trong 15 phút.\n\nNếu không phải bạn yêu cầu, hãy bỏ qua email này.\n\nTrân trọng,\nTravel Web`
  })
}

const emailService = { sendVerifyEmail, sendForgotPasswordEmail }
export default emailService
