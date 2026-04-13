import { checkSchema, ParamSchema } from 'express-validator'
import { Filter, ObjectId } from 'mongodb'
import HTTP_STATUS from '~/constants/httpStatus'
import { MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { ItineraryDayType } from '~/models/schemas/Tour.schema'
import databaseServices from '~/services/database.services'
import { validate } from '~/utils/validation'
import { Request } from 'express'
import { TourSort, TourStatus } from '~/constants/enums'

export const idTourValidator: ParamSchema = {
  notEmpty: {
    errorMessage: MESSAGES.TOUR_ID_IS_REQUIRED
  },
  isMongoId: {
    errorMessage: MESSAGES.TOUR_ID_INVALID
  },
  custom: {
    options: async (value: string) => {
      const tour = await databaseServices.tours.findOne({
        _id: new ObjectId(value)
      })
      if (!tour) {
        throw new ErrorWithStatus({
          message: MESSAGES.TOUR_NOT_FOUND,
          status: HTTP_STATUS.NOT_FOUND
        })
      }
      return true
    }
  }
}

export const createTourValidator = validate(
  checkSchema(
    {
      category_id: {
        notEmpty: {
          errorMessage: MESSAGES.CATEGORY_ID_IS_REQUIRED
        },
        isString: {
          errorMessage: MESSAGES.CATEGORY_ID_MUST_BE_A_STRING
        },
        custom: {
          options: async (value: string) => {
            if (!ObjectId.isValid(value)) {
              throw new Error(MESSAGES.CATEGORY_ID_IS_INVALID)
            }
            const category = await databaseServices.categories.findOne({
              _id: new ObjectId(value),
              is_active: true
            })
            if (!category) {
              throw new Error(MESSAGES.CATEGORY_NOT_FOUND)
            }
            return true
          }
        }
      },
      name: {
        notEmpty: {
          errorMessage: MESSAGES.TOUR_NAME_IS_REQUIRED
        },
        isString: {
          errorMessage: MESSAGES.TOUR_NAME_MUST_BE_A_STRING
        },
        isLength: {
          options: { min: 5, max: 200 },
          errorMessage: MESSAGES.TOUR_NAME_LENGTH
        },
        trim: true
      },
      description: {
        optional: true,
        isString: {
          errorMessage: MESSAGES.TOUR_DESCRIPTION_MUST_BE_A_STRING
        },
        trim: true
      },
      highlights: {
        optional: true,
        customSanitizer: {
          options: (value: string) => {
            try {
              return typeof value === 'string' ? JSON.parse(value) : value
            } catch {
              return value
            }
          }
        },
        isArray: {
          errorMessage: MESSAGES.TOUR_HIGHLIGHTS_MUST_BE_AN_ARRAY
        },
        custom: {
          options: (value: string[]) => {
            if (!value.every((item) => typeof item === 'string')) {
              throw new Error(MESSAGES.TOUR_HIGHLIGHTS_MUST_BE_ARRAY_OF_STRING)
            }
            return true
          }
        }
      },
      destination: {
        notEmpty: {
          errorMessage: MESSAGES.TOUR_DESTINATION_IS_REQUIRED
        },
        isString: {
          errorMessage: MESSAGES.TOUR_DESTINATION_MUST_BE_A_STRING
        },
        trim: true
      },
      departure_city: {
        notEmpty: {
          errorMessage: MESSAGES.TOUR_DEPARTURE_CITY_IS_REQUIRED
        },
        isString: {
          errorMessage: MESSAGES.TOUR_DEPARTURE_CITY_MUST_BE_A_STRING
        },
        trim: true
      },
      duration_days: {
        notEmpty: {
          errorMessage: MESSAGES.TOUR_DURATION_DAYS_IS_REQUIRED
        },
        isInt: {
          options: { min: 1 },
          errorMessage: MESSAGES.TOUR_DURATION_DAYS_MUST_BE_A_POSITIVE_INTEGER
        },
        toInt: true
      },
      duration_nights: {
        notEmpty: {
          errorMessage: MESSAGES.TOUR_DURATION_NIGHTS_IS_REQUIRED
        },
        isInt: {
          options: { min: 0 },
          errorMessage: MESSAGES.TOUR_DURATION_NIGHTS_MUST_BE_A_NON_NEGATIVE_INTEGER
        },
        toInt: true
      },
      itinerary: {
        optional: true,
        customSanitizer: {
          options: (value: string) => {
            try {
              return typeof value === 'string' ? JSON.parse(value) : value
            } catch {
              return value
            }
          }
        },
        isArray: {
          errorMessage: MESSAGES.TOUR_ITINERARY_MUST_BE_AN_ARRAY
        },
        custom: {
          options: (value: ItineraryDayType[]) => {
            for (const item of value) {
              if (typeof item.day !== 'number' || item.day < 1) {
                throw new Error(MESSAGES.TOUR_ITINERARY_DAY_IS_INVALID)
              }
              if (!item.title || typeof item.title !== 'string') {
                throw new Error(MESSAGES.TOUR_ITINERARY_TITLE_IS_REQUIRED)
              }
              if (!item.description || typeof item.description !== 'string') {
                throw new Error(MESSAGES.TOUR_ITINERARY_DESCRIPTION_IS_REQUIRED)
              }
            }
            return true
          }
        }
      },
      includes: {
        optional: true,
        customSanitizer: {
          options: (value: string) => {
            try {
              return typeof value === 'string' ? JSON.parse(value) : value
            } catch {
              return value
            }
          }
        },
        isArray: {
          errorMessage: MESSAGES.TOUR_INCLUDES_MUST_BE_AN_ARRAY
        },
        custom: {
          options: (value: string[]) => {
            if (!value.every((item) => typeof item === 'string')) {
              throw new Error(MESSAGES.TOUR_INCLUDES_MUST_BE_ARRAY_OF_STRING)
            }
            return true
          }
        }
      },
      excludes: {
        optional: true,
        customSanitizer: {
          options: (value: string) => {
            try {
              return typeof value === 'string' ? JSON.parse(value) : value
            } catch {
              return value
            }
          }
        },
        isArray: {
          errorMessage: MESSAGES.TOUR_EXCLUDES_MUST_BE_AN_ARRAY
        },
        custom: {
          options: (value: string[]) => {
            if (!value.every((item) => typeof item === 'string')) {
              throw new Error(MESSAGES.TOUR_EXCLUDES_MUST_BE_ARRAY_OF_STRING)
            }
            return true
          }
        }
      }
    },
    ['body']
  )
)

export const getToursValidator = validate(
  checkSchema(
    {
      page: {
        optional: true,
        isInt: {
          options: { min: 1 },
          errorMessage: MESSAGES.PAGE_MUST_BE_A_POSITIVE_INTEGER
        },
        toInt: true
      },
      limit: {
        optional: true,
        isInt: {
          options: { min: 1, max: 100 },
          errorMessage: MESSAGES.LIMIT_MUST_BE_FROM_1_TO_100
        },
        toInt: true
      },
      keyword: {
        optional: true,
        isString: {
          errorMessage: MESSAGES.KEYWORD_MUST_BE_A_STRING
        },
        trim: true
      },
      status: {
        optional: true,
        isIn: {
          options: [[TourStatus.Inactive, TourStatus.Active, TourStatus.Cancelled]],
          errorMessage: MESSAGES.TOUR_STATUS_IS_INVALID
        },
        toInt: true
      },
      category_id: {
        optional: true,
        custom: {
          options: (value: string) => {
            if (!ObjectId.isValid(value)) {
              throw new Error(MESSAGES.CATEGORY_ID_IS_INVALID)
            }
            return true
          }
        }
      },
      destination: {
        optional: true,
        isString: {
          errorMessage: MESSAGES.TOUR_DESTINATION_MUST_BE_A_STRING
        },
        trim: true
      },
      departure_date: {
        optional: true,
        isDate: {
          options: { format: 'YYYY-MM-DD' },
          errorMessage: MESSAGES.DEPARTURE_DATE_IS_INVALID
        }
      },
      num_adults: {
        optional: true,
        isInt: {
          options: { min: 1 },
          errorMessage: MESSAGES.NUM_ADULTS_MUST_BE_A_POSITIVE_INTEGER
        },
        toInt: true
      },
      num_children: {
        optional: true,
        isInt: {
          options: { min: 0 },
          errorMessage: MESSAGES.NUM_CHILDREN_MUST_BE_NON_NEGATIVE
        },
        toInt: true
      },
      min_price: {
        optional: true,
        isInt: {
          options: { min: 0 },
          errorMessage: MESSAGES.MIN_PRICE_MUST_BE_NON_NEGATIVE
        },
        toInt: true
      },
      max_price: {
        optional: true,
        isInt: {
          options: { min: 0 },
          errorMessage: MESSAGES.MAX_PRICE_MUST_BE_NON_NEGATIVE
        },
        toInt: true
      },
      sort: {
        optional: true,
        trim: true,
        customSanitizer: {
          options: (value: any) => (typeof value === 'string' ? value.trim().toLowerCase() : value)
        },
        custom: {
          options: (value: string) => {
            const allowed = [
              'newest',
              'name_asc',
              'name_desc',
              'duration_asc',
              'duration_desc',
              'price_asc',
              'price_desc'
            ]
            if (!allowed.includes(value)) {
              throw new Error(MESSAGES.SORT_IS_INVALID)
            }
            return true
          }
        }
      }
    },
    ['query']
  )
)

export const getDetailTourValidator = validate(
  checkSchema(
    {
      slug: {
        trim: true,
        custom: {
          options: async (value: string, { req }) => {
            const tour = await databaseServices.tours.findOne({ slug: value })

            if (!tour) {
              throw new ErrorWithStatus({
                message: MESSAGES.TOUR_NOT_FOUND,
                status: HTTP_STATUS.NOT_FOUND
              })
            }
            return true
          }
        }
      }
    },
    ['params']
  )
)

export const updateTourValidator = validate(
  checkSchema(
    {
      id: idTourValidator,
      name: {
        optional: true,
        isString: {
          errorMessage: MESSAGES.TOUR_NAME_MUST_BE_A_STRING
        },
        trim: true,
        isLength: {
          options: { min: 5, max: 200 },
          errorMessage: MESSAGES.TOUR_NAME_LENGTH
        }
      },
      description: {
        optional: true,
        isString: {
          errorMessage: MESSAGES.TOUR_DESCRIPTION_MUST_BE_A_STRING
        },
        trim: true
      },
      highlights: {
        optional: true,
        customSanitizer: {
          options: (value: string) => {
            try {
              return typeof value === 'string' ? JSON.parse(value) : value
            } catch {
              return value
            }
          }
        },
        isArray: {
          errorMessage: MESSAGES.TOUR_HIGHLIGHTS_MUST_BE_AN_ARRAY
        },
        custom: {
          options: (value: string[]) => {
            if (!value.every((item) => typeof item === 'string')) {
              throw new Error(MESSAGES.TOUR_HIGHLIGHTS_MUST_BE_ARRAY_OF_STRING)
            }
            return true
          }
        }
      },
      destination: {
        optional: true,
        isString: {
          errorMessage: MESSAGES.TOUR_DESTINATION_MUST_BE_A_STRING
        },
        trim: true
      },
      departure_city: {
        optional: true,
        isString: {
          errorMessage: MESSAGES.TOUR_DEPARTURE_CITY_MUST_BE_A_STRING
        },
        trim: true
      },
      duration_days: {
        optional: true,
        isInt: {
          options: { min: 1 },
          errorMessage: MESSAGES.TOUR_DURATION_DAYS_MUST_BE_A_POSITIVE_INTEGER
        },
        toInt: true
      },
      duration_nights: {
        optional: true,
        isInt: {
          options: { min: 0 },
          errorMessage: MESSAGES.TOUR_DURATION_NIGHTS_MUST_BE_A_NON_NEGATIVE_INTEGER
        },
        toInt: true
      },
      itinerary: {
        optional: true,
        customSanitizer: {
          options: (value: string) => {
            try {
              return typeof value === 'string' ? JSON.parse(value) : value
            } catch {
              return value
            }
          }
        },
        isArray: {
          errorMessage: MESSAGES.TOUR_ITINERARY_MUST_BE_AN_ARRAY
        },
        custom: {
          options: (value: ItineraryDayType[]) => {
            for (const item of value) {
              if (typeof item.day !== 'number' || item.day < 1) {
                throw new Error(MESSAGES.TOUR_ITINERARY_DAY_IS_INVALID)
              }
              if (!item.title || typeof item.title !== 'string') {
                throw new Error(MESSAGES.TOUR_ITINERARY_TITLE_IS_REQUIRED)
              }
              if (!item.description || typeof item.description !== 'string') {
                throw new Error(MESSAGES.TOUR_ITINERARY_DESCRIPTION_IS_REQUIRED)
              }
            }
            return true
          }
        }
      },
      includes: {
        optional: true,
        customSanitizer: {
          options: (value: string) => {
            try {
              return typeof value === 'string' ? JSON.parse(value) : value
            } catch {
              return value
            }
          }
        },
        isArray: {
          errorMessage: MESSAGES.TOUR_INCLUDES_MUST_BE_AN_ARRAY
        },
        custom: {
          options: (value: string[]) => {
            if (!value.every((item) => typeof item === 'string')) {
              throw new Error(MESSAGES.TOUR_INCLUDES_MUST_BE_ARRAY_OF_STRING)
            }
            return true
          }
        }
      },
      excludes: {
        optional: true,
        customSanitizer: {
          options: (value: string) => {
            try {
              return typeof value === 'string' ? JSON.parse(value) : value
            } catch {
              return value
            }
          }
        },
        isArray: {
          errorMessage: MESSAGES.TOUR_EXCLUDES_MUST_BE_AN_ARRAY
        },
        custom: {
          options: (value: string[]) => {
            if (!value.every((item) => typeof item === 'string')) {
              throw new Error(MESSAGES.TOUR_EXCLUDES_MUST_BE_ARRAY_OF_STRING)
            }
            return true
          }
        }
      },
      status: {
        optional: true,
        isIn: {
          options: [[TourStatus.Inactive, TourStatus.Active, TourStatus.Cancelled]],
          errorMessage: MESSAGES.TOUR_STATUS_IS_INVALID
        },
        toInt: true
      }
    },
    ['body', 'params']
  )
)

export const updateTourStatusValidator = validate(
  checkSchema(
    {
      id: idTourValidator,
      status: {
        notEmpty: {
          errorMessage: MESSAGES.TOUR_STATUS_IS_REQUIRED
        },
        isIn: {
          options: [[TourStatus.Inactive, TourStatus.Active, TourStatus.Cancelled]],
          errorMessage: MESSAGES.TOUR_STATUS_IS_INVALID
        },
        toInt: true
      }
    },
    ['body', 'params']
  )
)

export const deleteTourValidator = validate(
  checkSchema(
    {
      id: idTourValidator
    },
    ['params']
  )
)
