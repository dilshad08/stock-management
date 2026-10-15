import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Expose shopName to all EJS templates dynamically from environment variable
  app.use((req: any, res: any, next: any) => {
    res.locals.shopName = process.env.SHOP_NAME || 'HARDWARE HUB';
    next();
  });

  // Serve static files from /public
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Configure EJS view engine and views directory
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('ejs');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Hardware Shop Admin Panel is running at: http://localhost:${port}`);
}
bootstrap();
