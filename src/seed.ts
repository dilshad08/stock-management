import * as dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { UserSchema } from './auth/user.schema';
import { hashPassword } from './auth/password.util';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hardware_store';
const ADMIN_USERNAME = (
  process.env.ADMIN_USERNAME ||
  process.env.ROOT_USERNAME ||
  'admin'
)
  .trim()
  .toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.ROOT_PASSWORD || 'admin123';

async function seed() {
  console.log('----------------------------------------------------');
  console.log('Hardware Store Admin - User Seeder');
  console.log('Connecting to MongoDB at:', MONGODB_URI);
  console.log('----------------------------------------------------');

  await mongoose.connect(MONGODB_URI);

  const UserModel = mongoose.model('User', UserSchema);

  // Clear existing users to ensure clean admin setup
  const deleteResult = await UserModel.deleteMany({});
  console.log(`Cleared ${deleteResult.deletedCount} existing user(s) from database.`);

  // Hash password using crypto scrypt with random salt
  const hashedPassword = hashPassword(ADMIN_PASSWORD);

  // Create admin user
  const adminUser = await UserModel.create({
    username: ADMIN_USERNAME,
    password: hashedPassword,
    name: 'Administrator',
    role: 'admin',
  });

  console.log('----------------------------------------------------');
  console.log(' Admin user created successfully!');
  console.log(`   ID:       ${adminUser._id}`);
  console.log(`   Username: ${adminUser.username}`);
  console.log(`   Password: ${ADMIN_PASSWORD} (plaintext for login)`);
  console.log(`   Role:     ${adminUser.role}`);
  console.log(`   DB Hash:  ${adminUser.password}`);
  console.log('----------------------------------------------------');

  await mongoose.disconnect();
  console.log('Database disconnected. Seeding completed.');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
