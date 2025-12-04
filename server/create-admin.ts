
// @ts-ignore
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'ssunhr@gmail.com';
  
  // 使用固定密码，方便您登录
  const password = 'admin123'; 
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log('正在更新管理员账号...');

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'ADMIN',
      tier: 'PAID',
      password: hashedPassword // 更新为新密码
    },
    create: {
      email,
      name: 'Super Admin',
      password: hashedPassword,
      role: 'ADMIN',
      tier: 'PAID'
    },
  });

  console.log('\n=============================================');
  console.log('管理员账号已更新 (Admin Updated)');
  console.log('---------------------------------------------');
  console.log(`账号 (Email)   : ${email}`);
  console.log(`密码 (Password): ${password}`);
  console.log('=============================================\n');
}

main()
  .catch((e) => {
    console.error(e);
    (process as any).exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
