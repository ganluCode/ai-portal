import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash('admin123456', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ai-portal.local' },
    update: {},
    create: {
      email: 'admin@ai-portal.local',
      name: '管理员',
      password: hashedPassword,
      role: 'ADMIN'
    }
  });

  console.log('Seeded:', admin.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
