import { CredentialType, PrismaClient, Role } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial adventurer ranks (F through S)...');

  const defaultRanks = [
    { code: 'F', name: 'Rank F', order: 1, promotionThreshold: 0 },
    { code: 'E', name: 'Rank E', order: 2, promotionThreshold: 100 },
    { code: 'D', name: 'Rank D', order: 3, promotionThreshold: 300 },
    { code: 'C', name: 'Rank C', order: 4, promotionThreshold: 600 },
    { code: 'B', name: 'Rank B', order: 5, promotionThreshold: 1000 },
    { code: 'A', name: 'Rank A', order: 6, promotionThreshold: 1500 },
    { code: 'S', name: 'Rank S', order: 7, promotionThreshold: 2500 },
  ];

  const createdRanks: Record<string, { id: string; code: string }> = {};

  for (const rankData of defaultRanks) {
    const rank = await prisma.rank.upsert({
      where: { code: rankData.code },
      update: {
        name: rankData.name,
        order: rankData.order,
        promotionThreshold: rankData.promotionThreshold,
      },
      create: rankData,
    });
    createdRanks[rank.code] = rank;
  }

  console.log('Seeding development test accounts and adventurer profile...');
  // Note: These credentials and profiles are strictly for development only.
  const adminPasswordHash = bcryptjs.hashSync('admin123', 10);
  const userPasswordHash = bcryptjs.hashSync('adventurer123', 10);

  // 1. Test ADMIN
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
    create: {
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  // 2. Test USER
  const testUser = await prisma.user.upsert({
    where: { username: 'adventurer' },
    update: {
      passwordHash: userPasswordHash,
      role: Role.USER,
    },
    create: {
      username: 'adventurer',
      passwordHash: userPasswordHash,
      role: Role.USER,
    },
  });

  // 3. Adventurer Profile referencing Rank F
  const rankF = createdRanks['F'];
  const testProfile = await prisma.adventurerProfile.upsert({
    where: { userId: testUser.id },
    update: {
      displayName: 'Rookie Adventurer',
      currentRankId: rankF.id,
      level: 1,
      hp: 100,
      maxHp: 100,
      gold: 0,
      merit: 0,
    } as any,
    create: {
      userId: testUser.id,
      displayName: 'Rookie Adventurer',
      currentRankId: rankF.id,
      level: 1,
      hp: 100,
      maxHp: 100,
      gold: 0,
      merit: 0,
    } as any,
  });

  // 4. Seed Demo Players (Aria & Leon)
  const ariaUser = await prisma.user.upsert({
    where: { username: 'aria' },
    update: {
      passwordHash: userPasswordHash,
      role: Role.USER,
    },
    create: {
      username: 'aria',
      passwordHash: userPasswordHash,
      role: Role.USER,
    },
  });

  const ariaProfile = await prisma.adventurerProfile.upsert({
    where: { userId: ariaUser.id },
    update: {
      displayName: 'Aria',
      currentRankId: rankF.id,
      level: 1,
      hp: 100,
      maxHp: 100,
      gold: 50,
      merit: 20,
    } as any,
    create: {
      userId: ariaUser.id,
      displayName: 'Aria',
      currentRankId: rankF.id,
      level: 1,
      hp: 100,
      maxHp: 100,
      gold: 50,
      merit: 20,
    } as any,
  });

  const leonUser = await prisma.user.upsert({
    where: { username: 'leon' },
    update: {
      passwordHash: userPasswordHash,
      role: Role.USER,
    },
    create: {
      username: 'leon',
      passwordHash: userPasswordHash,
      role: Role.USER,
    },
  });

  const leonProfile = await prisma.adventurerProfile.upsert({
    where: { userId: leonUser.id },
    update: {
      displayName: 'Leon',
      currentRankId: rankF.id,
      level: 2,
      hp: 120,
      maxHp: 120,
      gold: 100,
      merit: 50,
    } as any,
    create: {
      userId: leonUser.id,
      displayName: 'Leon',
      currentRankId: rankF.id,
      level: 2,
      hp: 120,
      maxHp: 120,
      gold: 100,
      merit: 50,
    } as any,
  });

  // 5. Test Credentials (QRCODE, RFID, NFC)
  const testCredentials = [
    {
      adventurerId: ariaProfile.id,
      type: CredentialType.QRCODE,
      value: 'cred-demo-001',
      enabled: true,
    },
    {
      adventurerId: leonProfile.id,
      type: CredentialType.QRCODE,
      value: 'cred-demo-002',
      enabled: true,
    },
    {
      adventurerId: testProfile.id,
      type: CredentialType.QRCODE,
      value: 'ADV-DEV-001-QR',
      enabled: true,
    },
    {
      adventurerId: testProfile.id,
      type: CredentialType.NFC,
      value: 'ADV-DEV-001-NFC',
      enabled: true,
    },
  ];

  for (const cred of testCredentials) {
    await prisma.credential.upsert({
      where: { value: cred.value },
      update: {
        adventurerId: cred.adventurerId,
        type: cred.type,
        enabled: cred.enabled,
      },
      create: cred,
    });
  }

  // 6. Test Boss: Black Knight
  if ((prisma as any).boss) {
    await (prisma as any).boss.upsert({
      where: { id: 'boss-01' },
      update: {
        name: 'Black Knight',
        hp: 150,
        maxHp: 150,
        attackPower: 15,
      },
      create: {
        id: 'boss-01',
        name: 'Black Knight',
        hp: 150,
        maxHp: 150,
        attackPower: 15,
      },
    });
  }

  // 7. Starter Quest Skeleton (Rank F)
  await prisma.quest.upsert({
    where: { id: 'quest-starter-001' },
    update: {
      title: 'First Steps in the Guild',
      description: 'Register at the guild counter and verify your adventurer credential.',
      requiredRankId: rankF.id,
      meritReward: 50,
      enabled: true,
    },
    create: {
      id: 'quest-starter-001',
      title: 'First Steps in the Guild',
      description: 'Register at the guild counter and verify your adventurer credential.',
      requiredRankId: rankF.id,
      meritReward: 50,
      enabled: true,
    },
  });

  // 8. Reward Skeleton (Extensible demonstration, no execution logic)
  await prisma.reward.upsert({
    where: { id: 'reward-starter-001' },
    update: {
      name: 'Guild Welcome Badge',
      description: 'A starter commemorative badge presented to newly registered guild adventurers.',
      type: 'virtual_item',
      config: { icon: 'badge-bronze', rarity: 'common' },
      enabled: true,
    },
    create: {
      id: 'reward-starter-001',
      name: 'Guild Welcome Badge',
      description: 'A starter commemorative badge presented to newly registered guild adventurers.',
      type: 'virtual_item',
      config: { icon: 'badge-bronze', rarity: 'common' },
      enabled: true,
    },
  });

  console.log('Development seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('Failed to run seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
