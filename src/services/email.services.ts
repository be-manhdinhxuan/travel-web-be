import nodemailer from 'nodemailer'
import { toVNDate } from '~/utils/time'

export const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 2525,
  secure: false,
  requireTLS: true,

  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_KEY
  },

  pool: true,
  maxConnections: 3,
  maxMessages: 100,

  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,

  tls: {
    rejectUnauthorized: false
  },

  logger: true,
  debug: true
})

if (process.env.NODE_ENV === 'development') {
  transporter.verify((error) => {
    if (error) {
      console.error('SMTP VERIFY ERROR:', error)
    } else {
      console.log('SMTP SERVER READY')
    }
  })
}

const sendMailSafe = async (options: nodemailer.SendMailOptions) => {
  try {
    const info = await transporter.sendMail(options)

    console.log('[EMAIL] Sent:', info.messageId)

    return info
  } catch (error) {
    console.error('[EMAIL] Send failed:', error)

    return null
  }
}

const buildClientUrl = (path: string, params?: Record<string, string>) => {
  const url = new URL(path, process.env.CLIENT_URL)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })
  }

  return url.toString()
}

const sendVerifyEmail = async (to: string, token: string) => {
  const verifyUrl = buildClientUrl(process.env.VERIFY_EMAIL_URL!, { token })

  await sendMailSafe({
    from: `"Travel Web" <${process.env.MAIL_FROM}>`,
    to,
    subject: 'Xác thực tài khoản của bạn',
    text: `Xin chào,\n\nVui lòng xác thực email của bạn bằng cách truy cập link sau:\n\n${verifyUrl}\n\nLink có hiệu lực trong 24 giờ.\n\nNếu bạn không thực hiện đăng ký này, hãy bỏ qua email này.\n\nTrân trọng,\nTravel Web`
  })
}

const sendForgotPasswordEmail = async (to: string, forgot_password_token: string) => {
  const resetUrl = buildClientUrl(process.env.FORGOT_PASSWORD_URL!, { token: forgot_password_token })

  await sendMailSafe({
    from: `"Travel Web" <${process.env.MAIL_FROM}>`,
    to,
    subject: 'Đặt lại mật khẩu',
    text: `Xin chào,\n\nChúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.\n\nTruy cập link sau để đặt lại mật khẩu:\n\n${resetUrl}\n\nLink có hiệu lực trong 15 phút.\n\nNếu không phải bạn yêu cầu, hãy bỏ qua email này.\n\nTrân trọng,\nTravel Web`
  })
}

const sendBookingSuccessEmail = async (to: string, booking: any) => {
  const { booking_code, tour_snapshot, passengers, final_price, contact_info } = booking

  const text = `
Xin chào ${contact_info.full_name},

Cảm ơn bạn đã đặt tour tại Travel Web 🎉

📌 Mã booking: ${booking_code}
🏝 Tour: ${tour_snapshot.tour_name}
📅 Khởi hành: ${toVNDate(tour_snapshot.departure_date).toLocaleDateString('vi-VN')}
📅 Kết thúc: ${toVNDate(tour_snapshot.return_date).toLocaleDateString('vi-VN')}

👨‍👩‍👧‍👦 Số lượng:
- Người lớn: ${passengers.adults}
- Trẻ em: ${passengers.children}
- Em bé: ${passengers.babies}

💰 Tổng tiền: ${final_price.toLocaleString('vi-VN')} VND

📞 Liên hệ:
- Email: ${contact_info.email}
- SĐT: ${contact_info.phone}

Chúng tôi sẽ liên hệ với bạn sớm để xác nhận chi tiết.

Trân trọng,
Travel Web
  `

  await sendMailSafe({
    from: `"Travel Web" <${process.env.MAIL_FROM}>`,
    to,
    subject: `Xác nhận đặt tour & Thanh toán thành công - ${booking_code}`,
    text
  })
}

const sendTourReminderEmail = async (to: string, booking: any) => {
  const { booking_code, tour_snapshot, contact_info } = booking

  const text = `
    Xin chào ${contact_info.full_name},

    ⏰ Đây là email nhắc nhở chuyến đi của bạn sắp diễn ra!

    📌 Mã booking: ${booking_code}
    🏝 Tour: ${tour_snapshot.tour_name}
    📅 Khởi hành: ${toVNDate(tour_snapshot.departure_date).toLocaleDateString('vi-VN')}

    🎒 Hãy chuẩn bị hành lý và sẵn sàng cho chuyến đi nhé!

    Nếu bạn cần hỗ trợ, hãy liên hệ với chúng tôi.

    Chúc bạn có chuyến đi tuyệt vời 🌟

    Trân trọng,
    Travel Web
      `

  await sendMailSafe({
    from: `"Travel Web" <${process.env.MAIL_FROM}>`,
    to,
    subject: `Nhắc nhở chuyến đi sắp tới - ${booking_code}`,
    text
  })
}

const emailService = { sendVerifyEmail, sendForgotPasswordEmail, sendBookingSuccessEmail, sendTourReminderEmail }
export default emailService
