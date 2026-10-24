import { ActionCardType, CredentialType, ItemType, PrismaClient, Role } from '@prisma/client';
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
      lastSeenLevel: 1,
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
      lastSeenLevel: 1,
      hp: 100,
      maxHp: 100,
      gold: 0,
      merit: 0,
    } as any,
  });

  // 4. Seed Demo Players (Aria & Leon)
  // Levels follow merit (see src/progression/levels.ts): Aria 20 -> Lv2, Leon 50 -> Lv3
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
      level: 2,
      lastSeenLevel: 2,
      hp: 100,
      maxHp: 100,
      gold: 50,
      merit: 20,
    } as any,
    create: {
      userId: ariaUser.id,
      displayName: 'Aria',
      currentRankId: rankF.id,
      level: 2,
      lastSeenLevel: 2,
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
      level: 3,
      lastSeenLevel: 3,
      hp: 120,
      maxHp: 120,
      gold: 100,
      merit: 50,
    } as any,
    create: {
      userId: leonUser.id,
      displayName: 'Leon',
      currentRankId: rankF.id,
      level: 3,
      lastSeenLevel: 3,
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
      rewardMerit: 50,
      enabled: true,
    },
    create: {
      id: 'quest-starter-001',
      title: 'First Steps in the Guild',
      description: 'Register at the guild counter and verify your adventurer credential.',
      requiredRankId: rankF.id,
      meritReward: 50,
      rewardMerit: 50,
      enabled: true,
    },
  });

  // 7b. Vertical Slice Demo Quest: Defeat the Black Knight
  await prisma.quest.upsert({
    where: { id: 'quest-defeat-black-knight' },
    update: {
      title: '討伐黑騎士 (Defeat the Black Knight)',
      description: '前往 Boss 之間，擊敗作惡多端的黑騎士，證明冒險者的實力。',
      objectiveType: 'defeat_boss',
      targetId: 'boss-01',
      targetCount: 1,
      rewardGold: 200,
      rewardMerit: 20,
      meritReward: 20,
      requiredRankId: rankF.id,
      enabled: true,
    },
    create: {
      id: 'quest-defeat-black-knight',
      title: '討伐黑騎士 (Defeat the Black Knight)',
      description: '前往 Boss 之間，擊敗作惡多端的黑騎士，證明冒險者的實力。',
      objectiveType: 'defeat_boss',
      targetId: 'boss-01',
      targetCount: 1,
      rewardGold: 200,
      rewardMerit: 20,
      meritReward: 20,
      requiredRankId: rankF.id,
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

  // 9. Shop + Equipment Vertical Slice: shop-01 catalogue
  const rankE = createdRanks['E'];
  const shopItems = [
    {
      item: {
        id: 'item-wooden-sword',
        name: '木劍 (Wooden Sword)',
        description: '新手冒險者的第一把劍，輕巧好揮。',
        type: ItemType.WEAPON,
        attack: 3,
        defense: 0,
        iconKey: 'sword-wood',
      },
      price: 30,
      requiredRankId: null,
      sortOrder: 1,
    },
    {
      item: {
        id: 'item-iron-sword',
        name: '鐵劍 (Iron Sword)',
        description: '公會鐵匠打造的制式長劍，需 Rank E 以上才可購買。',
        type: ItemType.WEAPON,
        attack: 8,
        defense: 0,
        iconKey: 'sword-iron',
      },
      price: 100,
      requiredRankId: rankE.id,
      sortOrder: 2,
    },
    {
      item: {
        id: 'item-leather-armor',
        name: '皮甲 (Leather Armor)',
        description: '以鞣製皮革縫製的輕甲，能減輕敵人的攻擊。',
        type: ItemType.ARMOR,
        attack: 0,
        defense: 3,
        iconKey: 'armor-leather',
      },
      price: 40,
      requiredRankId: null,
      sortOrder: 3,
    },
    {
      item: {
        id: 'item-chain-mail',
        name: '鎖子甲 (Chain Mail)',
        description: '由鐵環編織而成的護甲，需 Rank E 以上才可購買。',
        type: ItemType.ARMOR,
        attack: 0,
        defense: 6,
        iconKey: 'armor-chain',
      },
      price: 120,
      requiredRankId: rankE.id,
      sortOrder: 4,
    },
  ];

  await prisma.shop.upsert({
    where: { id: 'shop-01' },
    update: { name: '冒險者商店 (Adventurer Shop)', enabled: true },
    create: { id: 'shop-01', name: '冒險者商店 (Adventurer Shop)', enabled: true },
  });

  for (const entry of shopItems) {
    const { id, ...itemData } = entry.item;
    await prisma.item.upsert({
      where: { id },
      update: { ...itemData, enabled: true },
      create: { id, ...itemData, enabled: true },
    });

    const shopItemData = {
      price: entry.price,
      requiredRankId: entry.requiredRankId,
      sortOrder: entry.sortOrder,
      enabled: true,
    };
    await prisma.shopItem.upsert({
      where: { shopId_itemId: { shopId: 'shop-01', itemId: id } },
      update: shopItemData,
      create: { shopId: 'shop-01', itemId: id, ...shopItemData },
    });
  }

  // 10. Action Card Battle Vertical Slice: shared venue action cards
  const actionCardLabels: Record<ActionCardType, string> = {
    [ActionCardType.STRIKE]: '攻擊卡',
    [ActionCardType.FIRE]: '火之卡',
    [ActionCardType.WATER]: '水之卡',
    [ActionCardType.WIND]: '風之卡',
  };

  for (const type of Object.values(ActionCardType)) {
    for (let n = 1; n <= 3; n++) {
      const value = `card-${type.toLowerCase()}-${String(n).padStart(3, '0')}`;
      const label = `${actionCardLabels[type]} #${n}`;
      await prisma.actionCard.upsert({
        where: { value },
        update: { type, label, enabled: true },
        create: { value, type, label, enabled: true },
      });
    }
  }

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
