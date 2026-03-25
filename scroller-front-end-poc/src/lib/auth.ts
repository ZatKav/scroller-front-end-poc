import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import users from '../../data/users.json';

export const AUTH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface AuthenticatedUser extends User {
  token: string;
}

interface StoredUser extends User {
  password: string;
}

const userStore = users as Record<string, StoredUser>;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET_KEY;

  if (!secret) {
    throw new Error('JWT_SECRET_KEY must be set before using authentication routes.');
  }

  return secret;
}

function toPublicUser(user: StoredUser): User {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  };
}

function isUserPayload(payload: jwt.JwtPayload | string): payload is jwt.JwtPayload & User {
  return typeof payload !== 'string'
    && typeof payload.id === 'number'
    && typeof payload.username === 'string'
    && typeof payload.email === 'string'
    && typeof payload.role === 'string';
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: AUTH_TOKEN_MAX_AGE_SECONDS }
  );
}

export function verifyToken(token: string): User | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret());

    if (!isUserPayload(decoded)) {
      return null;
    }

    return {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
    };
  } catch {
    return null;
  }
}

export async function authenticateUser(username: string, password: string): Promise<AuthenticatedUser | null> {
  const user = userStore[username];

  if (!user) {
    return null;
  }

  const isValidPassword = await bcrypt.compare(password, user.password);

  if (!isValidPassword) {
    return null;
  }

  const token = generateToken(toPublicUser(user));

  return {
    ...toPublicUser(user),
    token,
  };
}

export function getUserByUsername(username: string): User | null {
  const user = userStore[username];
  return user ? toPublicUser(user) : null;
}
