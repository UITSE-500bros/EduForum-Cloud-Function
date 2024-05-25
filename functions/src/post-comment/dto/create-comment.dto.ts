import Joi = require("joi");
import { creatorDTO } from "./nested.dto";

export const createCommentDTO = Joi.object({
  commentID: Joi.string().required(),
  postID: Joi.string().required(),
  communityID: Joi.string().required(),
  replyCommentID: Joi.string(),
  creator: creatorDTO.required(),
  content: Joi.string().required(),
  downloadImage: Joi.array().items(Joi.string()),
});