import { Request, Response } from 'express'
import {
  ApplyBookingCouponReqBody,
  CreateCouponReqBody,
  GetCouponsQuery,
  UpdateCouponReqBody,
  ValidateCouponReqBody
} from '~/models/requests/Coupon.requests'
import { ParamsDictionary } from 'express-serve-static-core'
import { MESSAGES } from '~/constants/messages'
import couponsService from '~/services/coupons.services'

export const getPublicCouponsController = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 10
  const keyword = (req.query.keyword as string) || ''

  const result = await couponsService.getPublicCoupons({ page, limit, keyword })

  return res.json({
    message: MESSAGES.GET_COUPONS_SUCCESS,
    result
  })
}

export const createCouponController = async (
  req: Request<ParamsDictionary, any, CreateCouponReqBody>,
  res: Response
) => {
  const result = await couponsService.createCoupon(req.body)
  return res.status(201).json({
    message: MESSAGES.CREATE_COUPON_SUCCESS,
    result
  })
}

export const getCouponsController = async (
  req: Request<ParamsDictionary, any, any, GetCouponsQuery>,
  res: Response
) => {
  const result = await couponsService.getCoupons(req.query)
  return res.json({
    message: MESSAGES.GET_COUPONS_SUCCESS,
    result
  })
}

export const updateCouponController = async (
  req: Request<ParamsDictionary, any, UpdateCouponReqBody>,
  res: Response
) => {
  const { id } = req.params
  const result = await couponsService.updateCoupon(id as string, req.body)
  return res.json({
    message: MESSAGES.UPDATE_COUPON_SUCCESS,
    result
  })
}

export const toggleCouponController = async (req: Request, res: Response) => {
  const { id } = req.params
  const result = await couponsService.toggleCoupon(id as string)
  return res.json({
    message: MESSAGES.TOGGLE_COUPON_SUCCESS,
    result
  })
}

export const validateCouponController = async (
  req: Request<ParamsDictionary, any, ValidateCouponReqBody>,
  res: Response
) => {
  const user_id = req.decoded_authorization?.user_id as string
  const result = await couponsService.validateCoupon(req.body, user_id)
  return res.json({
    message: MESSAGES.VALIDATE_COUPON_SUCCESS,
    result
  })
}

export const applyBookingCouponController = async (
  req: Request<ParamsDictionary, any, ApplyBookingCouponReqBody>,
  res: Response
) => {
  const user_id = req.decoded_authorization?.user_id as string
  const { booking_id, coupon_code } = req.body
  const result = await couponsService.applyBookingCoupon(booking_id, user_id, coupon_code)
  return res.json({
    message: MESSAGES.APPLY_BOOKING_COUPON_SUCCESS,
    result
  })
}
