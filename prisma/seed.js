const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  await prisma.user.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.createMany({
    data: [
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Bob', email: 'bob@example.com' },
      { name: 'Charlie', email: 'charlie@example.com' },
    ],
  });
  try {
    await prisma.room.create({
      data: { id: 'a' }
    });
    console.log('Room a created.');
  } catch (e) {
    console.error('Room insert error:', e);
  }
  console.log('Seed data created.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
