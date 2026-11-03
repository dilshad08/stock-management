import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';
import { hashPassword, verifyPassword } from './password.util';
import { createToken, AuthPayload } from './token.util';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async onModuleInit() {
    await this.ensureAdminUserExists();
  }

  async ensureAdminUserExists(): Promise<void> {
    try {
      const adminUsername = (
        process.env.ADMIN_USERNAME ||
        process.env.ROOT_USERNAME ||
        'admin'
      )
        .trim()
        .toLowerCase();

      const existingAdmin = await this.userModel.findOne({ username: adminUsername });

      if (!existingAdmin) {
        const adminPassword =
          process.env.ADMIN_PASSWORD || process.env.ROOT_PASSWORD || 'admin123';
        const hashedPassword = hashPassword(adminPassword);

        await this.userModel.create({
          username: adminUsername,
          password: hashedPassword,
          name: 'Administrator',
          role: 'admin',
        });

        this.logger.log(`Created default admin user [${adminUsername}] with hashed password.`);
      }
    } catch (err: any) {
      this.logger.error('Failed to ensure admin user exists:', err.message);
    }
  }

  async validateUser(username: string, password: string): Promise<UserDocument | null> {
    if (!username || !password) {
      return null;
    }
    const normalizedUsername = username.trim().toLowerCase();
    const user = await this.userModel.findOne({ username: normalizedUsername });
    if (!user) {
      return null;
    }
    const isValid = verifyPassword(password, user.password);
    if (!isValid) {
      return null;
    }
    return user;
  }

  generateAuthToken(user: UserDocument): string {
    return createToken({
      userId: user._id.toString(),
      username: user.username,
      role: user.role || 'admin',
      name: user.name || 'Administrator',
    });
  }
}
