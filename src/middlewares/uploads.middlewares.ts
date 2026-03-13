import multer from 'multer'

const storage = multer.memoryStorage()

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']

export const uploadImage = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('File must be jpg, png or webp'))
    }

    cb(null, true)
  }
})
