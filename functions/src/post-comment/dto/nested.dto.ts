import Joi = require("joi");

export const creatorDTO = Joi.object({
  creatorID: Joi.string().required(),
  name: Joi.string().required(),
  department: Joi.string().required(),
  profilePicture: Joi.string().required(),
});

export const categoryDTO = Joi.object({
  categoryID: Joi.string().required(),
  title: Joi.string().required(),
});
