const { validationResult } = require('express-validator');
const { sendResponse } = require('../utils/response');
const { discardUpload } = require('./upload');

const validateRequest = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    await discardUpload(req);
    return sendResponse(res, 400, false, null, 'Validation failed', errors.array());
  }
  next();
};

// router.param() callback: rejects ids that are not positive integers
const requireNumericId = (req, res, next, value) => {
  if (!/^[1-9]\d{0,9}$/.test(value)) {
    return sendResponse(res, 400, false, null, 'Invalid id');
  }
  next();
};

module.exports = { validateRequest, requireNumericId };
