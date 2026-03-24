export enum UserVerifyStatus {
  Unverified, // = 0
  Verified // = 1
}

export enum UserStatus {
  Active, // = 0
  Banned // = 1
}

export enum UserRole {
  User, // = 0
  Admin, // = 1
  Employee // = 2
}

export enum TourStatus {
  Inactive, // = 0
  Active, // = 1
  Cancelled // = 2
}

export enum ScheduleStatus {
  Cancelled, // = 0
  Available, // = 1
  Full // = 2
}

export enum BookingStatus {
  Pending, // = 0
  Confirmed, // = 1
  Completed, // = 2
  Cancelled // = 3
}

export enum PaymentProvider {
  Momo, // = 0
  VNPay // = 1
}

export enum PaymentStatus {
  Pending, // = 0
  Success, // = 1
  Failed, // = 2
  Refunded // = 3
}

export enum TokenType {
  AccessToken,
  RefreshToken,
  ForgotPasswordToken,
  EmailVerifyToken
}

export enum TourSort {
  NEWEST = 'newest',
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
  DURATION_ASC = 'duration_asc',
  DURATION_DESC = 'duration_desc',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc'
}
