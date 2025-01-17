import express from 'express';
import {StatusCodes} from 'http-status-codes';
import {ResolvedUser, User} from '../../types/user.js';
import {assertRequestType} from '../../utils/assertRequestType.js';
import {getUser, saveUser} from '../../utils/database.js';
import {getProfilePictureUrl} from '../../utils/getProfilePictureUrl.js';
import {getTopStarredRepositories} from '../../utils/getTopStarredRepositories.js';
import {validateEmail} from '../../utils/validators/validateEmail.js';
import {validateRequired} from '../../utils/validators/validateRequired.js';

export const postUser = express.Router();

interface ErrorBody {
  id?: string;
  username?: string;
  email?: string;
}

postUser.post('/', async (req, res) => {
  if (
    !assertRequestType(req, res, {
      accept: ['application/json'],
      contentType: ['application/json'],
    })
  ) {
    return;
  }

  /**
   * Validate input.
   */

  let {id = '', username = '', email = ''} = req.body;

  id = id.trim();
  username = username.trim();
  email = email.trim();

  // TODO: Validate string format of "id".
  const idError = validateRequired(id);
  // TODO: Validate string format of "username".
  const usernameError = validateRequired(username);
  const emailError = validateEmail(email);

  if (idError || usernameError || emailError) {
    const body: ErrorBody = {};
    if (idError) body.id = idError.message;
    if (usernameError) body.username = usernameError.message;
    if (emailError) body.email = emailError.message;
    res.status(StatusCodes.UNPROCESSABLE_ENTITY).send(body);
    return;
  }

  /**
   * Check if user already exists.
   */

  const existingUser = await getUser(id);

  if (existingUser) {
    const body: ErrorBody = {
      id: `A user with ID "${id}" already exists`,
    };
    res.status(StatusCodes.BAD_REQUEST).send(body);
    return;
  }

  /**
   * Save user.
   */

  const newUser: User = {
    id,
    username,
    email,
  };

  await saveUser(newUser);

  /**
   * Return user.
   */

  const resolvedUser: ResolvedUser = {
    ...newUser,
    profilePictureUrl: getProfilePictureUrl(email),
    topStarredRepositories: await getTopStarredRepositories(username),
  };

  res.send(resolvedUser);
});
