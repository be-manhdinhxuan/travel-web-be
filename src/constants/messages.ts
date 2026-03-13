export const MESSAGES = {
  VALIDATION_ERROR: 'Validation error',

  NAME_IS_REQUIRED: 'Name is required',
  NAME_MUST_BE_A_STRING: 'Name must be a string',
  NAME_LENGTH_MUST_BE_FROM_1_TO_100: 'Name length must be from 1 to 100',

  EMAIL_ALREADY_EXISTS: 'Email đã tồn tại',
  EMAIL_IS_REQUIRED: 'Email là bắt buộc',
  EMAIL_IS_INVALID: 'Email không đúng định dạng',
  EMAIL_OR_PASSWORD_INCORRECT: 'Email hoặc password không đúng',

  PASSWORD_IS_REQUIRED: 'Mật khẩu là bắt buộc',
  PASSWORD_MUST_BE_A_STRING: 'Mật khẩu phải là chuỗi',
  PASSWORD_LENGTH_MUST_BE_FROM_6_TO_50: 'Mật khẩu phải có độ dài từ 6 đến 50 ký tự',
  PASSWORD_MUST_BE_STRONG:
    'Mật khẩu phải có 6–50 ký tự và chứa ít nhất 1 chữ thường, 1 chữ hoa, 1 số và 1 ký tự đặc biệt',
  CONFIRM_PASSWORD_IS_REQUIRED: 'Xác nhận mật khẩu là bắt buộc',
  CONFIRM_PASSWORD_MUST_BE_A_STRING: 'Xác nhận mật khẩu phải là chuỗi',
  CONFIRM_PASSWORD_LENGTH_MUST_BE_FROM_6_TO_50: 'Xác nhận mật khẩu phải có độ dài từ 6 đến 50 ký tự',
  CONFIRM_PASSWORD_MUST_BE_STRONG:
    'Xác nhận mật khẩu phải có 6–50 ký tự và chứa ít nhất 1 chữ thường, 1 chữ hoa, 1 số và 1 ký tự đặc biệt',
  CONFIRM_PASSWORD_NOT_MATCH: 'Xác nhận mật khẩu không khớp',
  OLD_PASSOWRD_NOT_MATCH: 'Old password is not match',
  CHANGE_PASSWORD_SUCCESS: 'Change password success',
  FORGOT_PASSWORD_SUCCESS: 'Forgot password success',
  CHECK_EMAIL_TO_RESET_PASSWORD: 'Check email to reset password',
  INVALID_FORGOT_PASSWORD_TOKEN: 'Invalid forgot password token',
  FORGOT_PASSWORD_TOKEN_IS_REQUIRED: 'Forgot password token is required',
  VERIFY_FORGOT_PASSWORD_SUCCESS: 'Verify forgot password success',
  RESET_PASSWORD_SUCCESS: 'Reset password success',
  PASSWORD_IS_INCORRECT: 'Password is incorrect',
  NEW_PASSWORD_MUST_BE_DIFFERENT: 'New password must be different',

  DATE_OF_BIRTH_MUST_BE_ISO8601: 'Ngày sinh phải tuân theo tiêu chuẩn ISO8601',

  REGISTER_SUCCESS: 'Register success',

  RESEND_EMAIL_VERIFY_SUCCESS: 'Resend email verify success',
  EMAIL_VERIFY_TOKEN_IS_REQUIRED: 'Email verify token is required',
  USER_NOT_FOUND: 'User not found',
  EMAIL_ALREADY_VERIFIED_BEFORE: 'Email already verified before',
  EMAIL_VERIFY_SUCCESS: 'Email verify success',

  ACCESS_TOKEN_IS_REQUIRED: 'Access token is required',
  REFRESH_TOKEN_IS_REQUIRED: 'Refresh token is required',
  USED_REFRESH_TOKEN_OR_NOT_EXISTS: 'Used refresh token or not exists',
  REFRESH_TOKEN_SUCCESS: 'Refresh token success',

  LOGIN_SUCCESS: 'Login success',
  LOGOUT_SUCCESS: 'Logout success',

  GET_ME_SUCCESS: 'Get me success',
  UPDATE_ME_SUCCESS: 'Update me success',
  USER_NOT_VERIFIED: 'User not verified',
  UPLOAD_AVATAR_SUCCESS: 'Upload avatar success',
  AVATAR_IS_REQUIRED: 'Avatar is required',

  PHONE_MUST_BE_STRING: 'Phone must be string',
  PHONE_IS_INVALID: 'Phone is invalid',
  PHONE_EXISTED: 'Phone existed',
  ADDRESS_MUST_BE_STRING: 'Address must be string',
  ADDRESS_LENGTH_MUST_BE_FROM_1_TO_300: 'Address length must be from 1 to 300',

  TOUR_ID_IS_REQUIRED: 'Tour id is required',
  TOUR_ID_IS_INVALID: 'Tour id is invalid',
  TOUR_NOT_FOUND: 'Tour not found',

  GET_MY_WISHLIST_SUCCESS: 'Get my wishlist success',

  NOT_AUTHORIZED: 'Not authorized',

  USER_ID_IS_REQUIRED: 'User id is required',
  USER_ID_IS_INVALID: 'User id is invalid',
  GET_USER_DETAIL_SUCCESS: 'Get user detail success',
  USER_ID_INVALID: 'User id is invalid',
  UPDATE_USER_ROLE_SUCCESS: 'Update user role success',
  ROLE_IS_INVALID: 'Role is invalid',
  ROLE_IS_REQUIRED: 'Role is required',
  CANNOT_UPDATE_OWN_ROLE: 'Cannot update own role',
  STATUS_IS_REQUIRED: 'Status is required',
  STATUS_IS_INVALID: 'Status is invalid',
  UPDATE_USER_STATUS_SUCCESS: 'Update user status success',
  CANNOT_DISABLE_OWN_ACCOUNT: 'Cannot disable own account',
  ACCOUNT_BANNED: 'Account is banned',

  CATEGORY_NAME_IS_REQUIRED: 'Category name is required',
  CATEGORY_NAME_MUST_BE_STRING: 'Category name must be a string',
  CATEGORY_NAME_LENGTH_INVALID: 'Category name length must be from 1 to 200',
  DESCRIPTION_MUST_BE_STRING: 'Description must be a string',
  CREATE_CATEGORY_SUCCESS: 'Create category success',
  CATEGORY_ALREADY_EXISTS: 'Category already exists',
  GET_CATEGORIES_SUCCESS: 'Get categories success',
  CATEGORY_ID_IS_REQUIRED: 'Category id is required',
  CATEGORY_ID_INVALID: 'Category id is invalid',
  GET_DETAIL_CATEGORY_SUCCESS: 'Get detail category success',
  CATEGORY_NOT_FOUND: 'Category not found'
} as const
