import { PrismaClient } from '@prisma/client';
import { hashPassword } from 'better-auth/crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  const allowDestructive = process.env.ALLOW_DESTRUCTIVE_SEED === 'true';

  if (allowDestructive) {
    console.log('⚠️ ALLOW_DESTRUCTIVE_SEED is true. Clearing existing records...');
    await prisma.auditLog.deleteMany({});
    await prisma.organizationFeature.deleteMany({});
    await prisma.invitation.deleteMany({});
    await prisma.member.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.organization.deleteMany({});
    await prisma.user.deleteMany({});
    console.log('🧹 Cleaned existing database tables.');
  } else {
    console.log('🛡️ Non-destructive mode. Check and insert missing records only.');
  }

  // 1. Resolve passwords
  let rawOperatorPassword = process.env.SEED_OPERATOR_PASSWORD;
  let isOpPasswordRandom = false;
  if (!rawOperatorPassword) {
    rawOperatorPassword = Math.random().toString(36).substring(2, 12) + 'O1!';
    isOpPasswordRandom = true;
  }
  const hashedPassword = await hashPassword(rawOperatorPassword);

  let rawClientPassword = process.env.SEED_CLIENT_PASSWORD || (isOpPasswordRandom ? null : rawOperatorPassword);
  let isClientPasswordRandom = false;
  if (!rawClientPassword) {
    rawClientPassword = Math.random().toString(36).substring(2, 12) + 'C1!';
    isClientPasswordRandom = true;
  }
  const hashedPasswordClient = await hashPassword(rawClientPassword);

  // 2. Platform Admin Organization
  let adminOrg = await prisma.organization.findUnique({
    where: { slug: 'nv-hub-admin' }
  });
  if (!adminOrg) {
    adminOrg = await prisma.organization.create({
      data: {
        name: 'NV Hub Admin',
        slug: 'nv-hub-admin',
        planId: 'enterprise',
        isActive: true,
        features: {
          create: {
            leads: true,
            clients: true,
            proposals: true,
            contracts: true,
            charges: true,
            onboarding: true,
            publications: true,
            tasks: true,
            history: true,
            team: true,
            financial: true
          }
        }
      }
    });
    console.log('✅ Created organization: NV Hub Admin');
  }

  // 3. Platform Operator User
  let operatorUser = await prisma.user.findUnique({
    where: { email: 'operator@nvhub.com.br' }
  });
  if (!operatorUser) {
    operatorUser = await prisma.user.create({
      data: {
        name: 'Operador NV Hub',
        email: 'operator@nvhub.com.br',
        emailVerified: true,
        platformRole: 'operator',
        accounts: {
          create: {
            providerId: 'credential',
            accountId: 'operator@nvhub.com.br',
            password: hashedPassword
          }
        },
        memberships: {
          create: {
            organizationId: adminOrg.id,
            role: 'owner'
          }
        }
      }
    });
    console.log('✅ Created Operator User: operator@nvhub.com.br');
    if (isOpPasswordRandom) {
      console.log(`🔑 PASSWORD FOR operator@nvhub.com.br GENERATED: ${rawOperatorPassword}`);
    } else {
      console.log('🔑 PASSWORD FOR operator@nvhub.com.br configured via SEED_OPERATOR_PASSWORD');
    }
  } else {
    console.log('ℹ️ Operator User already exists, skipping user creation.');
  }

  // 4. Power & Ponto Organization
  let clientOrg = await prisma.organization.findUnique({
    where: { slug: 'power-ponto' }
  });
  if (!clientOrg) {
    clientOrg = await prisma.organization.create({
      data: {
        name: 'Power & Ponto',
        slug: 'power-ponto',
        planId: 'pro',
        isActive: true,
        features: {
          create: {
            leads: true,
            clients: true,
            proposals: true,
            contracts: true,
            charges: true,
            onboarding: true,
            publications: true,
            tasks: true,
            history: true,
            team: true,
            financial: true
          }
        }
      }
    });
    console.log('✅ Created organization: Power & Ponto');
  }

  // 5. Client Admin User
  let clientUser = await prisma.user.findUnique({
    where: { email: 'admin@demo.nvhub.com.br' }
  });
  if (!clientUser) {
    clientUser = await prisma.user.create({
      data: {
        name: 'Admin Power & Ponto',
        email: 'admin@demo.nvhub.com.br',
        emailVerified: true,
        accounts: {
          create: {
            providerId: 'credential',
            accountId: 'admin@demo.nvhub.com.br',
            password: hashedPasswordClient
          }
        },
        memberships: {
          create: {
            organizationId: clientOrg.id,
            role: 'owner'
          }
        }
      }
    });
    console.log('✅ Created Client User: admin@demo.nvhub.com.br');
    if (isClientPasswordRandom) {
      console.log(`🔑 PASSWORD FOR admin@demo.nvhub.com.br GENERATED: ${rawClientPassword}`);
    } else {
      console.log('🔑 PASSWORD FOR admin@demo.nvhub.com.br configured via environment');
    }
  } else {
    console.log('ℹ️ Client User already exists, skipping user creation.');
  }

  console.log('🌱 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
