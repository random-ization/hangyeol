/**
 * 临时脚本：将所有老用户的 isVerified 更新为 true
 * 
 * 运行命令：
 *   cd server
 *   npx ts-node prisma/update-existing-users.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 开始更新老用户...\n');

    // 查找所有 isVerified 为 false 的用户
    const unverifiedUsers = await prisma.user.findMany({
        where: { isVerified: false },
        select: { id: true, email: true, name: true },
    });

    console.log(`📋 找到 ${unverifiedUsers.length} 个未验证用户:\n`);
    unverifiedUsers.forEach((user, i) => {
        console.log(`   ${i + 1}. ${user.name} (${user.email})`);
    });

    if (unverifiedUsers.length === 0) {
        console.log('\n✅ 没有需要更新的用户。');
        return;
    }

    // 批量更新为已验证
    const result = await prisma.user.updateMany({
        where: { isVerified: false },
        data: { isVerified: true },
    });

    console.log(`\n✅ 成功更新了 ${result.count} 个用户的 isVerified 状态为 true`);
}

main()
    .catch((e) => {
        console.error('❌ 更新失败:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        console.log('\n🔌 数据库连接已断开');
    });
