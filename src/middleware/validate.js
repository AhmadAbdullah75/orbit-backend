import { validationResult } from 'express-validator';
import AppError from '../utils/AppError.js';

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const extractedErrors = [];
  errors.array().map(err => extractedErrors.push({ [err.path]: err.msg }));

  throw new AppError(extractedErrors[0][Object.keys(extractedErrors[0])[0]], 400);
};

export default validate;
