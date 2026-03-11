import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    const normalized = email.trim().toLowerCase();
    return this.userModel.findOne({ email: normalized }).exec();
  }

  async findById(id: string): Promise<UserDocument> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid user id');
    }
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async createUser(params: {
    fullName: string;
    email: string;
    passwordHash: string;
    timezone?: string;
  }): Promise<UserDocument> {
    const normalized = params.email.trim().toLowerCase();
    const existing = await this.userModel.findOne({ email: normalized }).exec();
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    return this.userModel.create({
      fullName: params.fullName.trim(),
      email: normalized,
      passwordHash: params.passwordHash,
      timezone: params.timezone?.trim(),
    });
  }
}
