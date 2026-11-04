import { Budget } from '../models/Budget.js';
import { Category } from '../models/Category.js';
import { Transaction } from '../models/Transaction.js';
import { User } from '../models/User.js';
import { defaultCategoriesFor } from '../services/defaultCategories.js';
import { AppError } from '../utils/AppError.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { endSession, startSession } from '../utils/session.js';

export async function register(req, res) {
  const { name, email, password } = req.valid.body;

  if (await User.exists({ email })) {
    throw new AppError(409, 'An account with this email already exists.');
  }

  const user = await User.create({ name, email, passwordHash: await hashPassword(password) });
  try {
    await Category.insertMany(defaultCategoriesFor(user._id));
  } catch (err) {
    // Don't leave a half-created account behind.
    await User.deleteOne({ _id: user._id });
    throw err;
  }

  startSession(res, user);
  res.status(201).json({ user });
}

export async function login(req, res) {
  const { email, password } = req.valid.body;
  const user = await User.findOne({ email }).select('+passwordHash +tokenVersion');
  const passwordMatches = await verifyPassword(password, user?.passwordHash);

  // Same message for "no such email" and "wrong password".
  if (!user || !passwordMatches) {
    throw new AppError(401, 'Incorrect email or password.');
  }

  startSession(res, user);
  res.json({ user });
}

export function logout(req, res) {
  endSession(res);
  res.status(204).end();
}

export async function logoutAllDevices(req, res) {
  await User.updateOne({ _id: req.userId }, { $inc: { tokenVersion: 1 } });
  endSession(res);
  res.status(204).end();
}

export function getMe(req, res) {
  res.json({ user: req.user });
}

export async function updateMe(req, res) {
  Object.assign(req.user, req.valid.body);
  await req.user.save();
  res.json({ user: req.user });
}

export async function deleteMe(req, res) {
  const user = await User.findById(req.userId).select('+passwordHash');
  if (!(await verifyPassword(req.valid.body.password, user.passwordHash))) {
    throw new AppError(401, 'Incorrect password. Your account was not deleted.');
  }

  await Transaction.deleteMany({ userId: req.userId });
  await Budget.deleteMany({ userId: req.userId });
  await Category.deleteMany({ userId: req.userId });
  await User.deleteOne({ _id: req.userId });

  endSession(res);
  res.status(204).end();
}
