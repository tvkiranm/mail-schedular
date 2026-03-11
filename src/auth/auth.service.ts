import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { logger } from 'handlebars';

type JwtPayload = {
  sub: string;
  email: string;
  timezone?: string;
  iat: number;
  exp: number;
};

@Injectable()
export class AuthService {
  private readonly iterations = 100_000;
  private readonly keyLength = 64;
  private readonly digest = 'sha512';

  constructor(private readonly usersService: UsersService) {}

  private getJwtSecret(): string {
    const secret = (process.env.JWT_SECRET ?? '').trim();
    logger.log(33 ,secret)
    console.log("secretsecret" , secret)
    if (!secret) {
      throw new BadRequestException('JWT_SECRET is not set');
    }
    return secret;
  }

  private base64Url(input: Buffer | string): string {
    const buffer = typeof input === 'string' ? Buffer.from(input) : input;
    return buffer
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  private signJwt(payload: JwtPayload): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = this.base64Url(JSON.stringify(header));
    const encodedPayload = this.base64Url(JSON.stringify(payload));
    const data = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto
      .createHmac('sha256', this.getJwtSecret())
      .update(data)
      .digest();
    return `${data}.${this.base64Url(signature)}`;
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await new Promise<Buffer>((resolve, reject) => {
      crypto.pbkdf2(
        password,
        salt,
        this.iterations,
        this.keyLength,
        this.digest,
        (err, derivedKey) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(derivedKey);
        },
      );
    });
    return `pbkdf2$${this.iterations}$${salt}$${hash.toString('hex')}`;
  }

  private async verifyPassword(password: string, stored: string): Promise<boolean> {
    const parts = stored.split('$');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
      return false;
    }
    const iterations = Number.parseInt(parts[1], 10);
    const salt = parts[2];
    const expected = parts[3];
    const hash = await new Promise<Buffer>((resolve, reject) => {
      crypto.pbkdf2(
        password,
        salt,
        iterations,
        this.keyLength,
        this.digest,
        (err, derivedKey) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(derivedKey);
        },
      );
    });
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), hash);
  }

  async register(params: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    timezone?: string;
  }) {
    if (params.password !== params.confirmPassword) {
      throw new BadRequestException('Password and confirm password do not match');
    }
    const passwordHash = await this.hashPassword(params.password);
    const user = await this.usersService.createUser({
      fullName: params.fullName,
      email: params.email,
      passwordHash,
      timezone: params.timezone,
    });
    const token = this.buildToken(user._id.toString(), user.email, user.timezone);
    return {
      token,
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        timezone: user.timezone,
      },
    };
  }

  async login(params: { email: string; password: string }) {
    const user = await this.usersService.findByEmail(params.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const ok = await this.verifyPassword(params.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const token = this.buildToken(user._id.toString(), user.email, user.timezone);
    return {
      token,
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        timezone: user.timezone,
      },
    };
  }

  private buildToken(userId: string, email: string, timezone?: string): string {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = Number.parseInt(process.env.JWT_EXPIRES_IN ?? '604800', 10);
    const payload: JwtPayload = {
      sub: userId,
      email,
      timezone,
      iat: now,
      exp: now + (Number.isNaN(expiresIn) ? 604800 : expiresIn),
    };
    return this.signJwt(payload);
  }
}
