import nodemailer from 'nodemailer'

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

const sendBookingSuccessEmail = async (to: string, booking: any) => {
  const { booking_code, tour_snapshot, passengers, final_price, contact_info } = booking

  const text = `
Xin chào ${contact_info.full_name},

Cảm ơn bạn đã đặt tour tại Travel Web 🎉

📌 Mã booking: ${booking_code}
🏝 Tour: ${tour_snapshot.tour_name}
📅 Khởi hành: ${new Date(tour_snapshot.departure_date).toLocaleDateString('vi-VN')}
📅 Kết thúc: ${new Date(tour_snapshot.return_date).toLocaleDateString('vi-VN')}

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

  await transporter.sendMail({
    from: `"Travel Web" <${process.env.MAIL_USER}>`,
    to,
    subject: `Xác nhận đặt tour & Thanh toán thành công - ${booking_code}`,
    text
  })
}

const emailService = { sendVerifyEmail, sendForgotPasswordEmail, sendBookingSuccessEmail }
export default emailService
