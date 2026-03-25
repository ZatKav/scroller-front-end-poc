import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import users from '../../data/users.json';

const JWT_SECRET = process.env.JWT_SECRET_KEY || 'fallback-secret-key';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET_KEY) {
  console.warn('WARNING: JWT_SECRET_KEY is not set in production. Using fallback secret.');
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface AuthenticatedUser extends User {
  token: string;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function verifyToken(token: string): User | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as User;
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function authenticateUser(username: string, password: string): Promise<AuthenticatedUser | null> {
  const user = (users as any)[username];

  if (!user) {
    return null;
  }

  const isValidPassword = await bcrypt.compare(password, user.password);

  if (!isValidPassword) {
    return null;
  }

  const token = generateToken(user);

  return {
    ...user,
    token,
  };
}

export function getUserByUsername(username: string): User | null {
  const user = (users as any)[username];
  return user || null;
}
