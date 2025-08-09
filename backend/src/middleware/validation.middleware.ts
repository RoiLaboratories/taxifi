import { body, param } from 'express-validator';

export const authValidation = {
  register: [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('phone').matches(/^\+?[1-9]\d{1,14}$/).withMessage('Invalid phone number'),
    body('full_name').trim().isLength({ min: 2 }),
    body('user_role').isIn(['driver', 'rider'])
  ],
  login: [
    body('email').isEmail().normalizeEmail(),
    body('password').exists()
  ]
};

export const rideValidation = {
  create: [
    body('pickup_location').isObject()
      .custom((value) => {
        return value.lat && value.lng && value.address;
      }),
    body('destination_location').isObject()
      .custom((value) => {
        return value.lat && value.lng && value.address;
      })
  ],
  updateStatus: [
    param('rideId').isUUID(),
    body('status').isIn(['accepted', 'in_progress', 'completed', 'cancelled'])
  ]
};

export const chatValidation = {
  sendMessage: [
    body('ride_id').isUUID(),
    body('sender_id').isUUID(),
    body('receiver_id').isUUID(),
    body('message').if(body('message_type').equals('text')).notEmpty(),
    body('message_type').isIn(['text', 'image', 'location']),
    body('location').if(body('message_type').equals('location')).isObject()
      .custom((value) => {
        return value.latitude && value.longitude;
      })
  ]
};
