import multer from 'multer'

const storage = multer.memoryStorage()

export const uploadAvatar = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Avatar must be jpg, png or webp'))
    }

    cb(null, true)
  }
})