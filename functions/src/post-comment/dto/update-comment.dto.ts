import Joi = require("joi");

export const updateCommentDTO = Joi.object({
  communityID: Joi.string().required(),
  postID: Joi.string().required(),
  commentID: Joi.string().required(),
  content: Joi.string().required(),
  downloadImage: Joi.array().items(Joi.string()),
});