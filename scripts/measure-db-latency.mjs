import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const samples = [];

  for (let index = 0; index < 5; index += 1) {
    const startedAt = performance.now();
    await prisma.$queryRawUnsafe('SELECT 1');
    samples.push(performance.now() - startedAt);
  }

  const average = samples.reduce((total, sample) => total + sample, 0) / samples.length;

  console.log(JSON.stringify({
    event: 'nvhub.db-connectivity',
    samplesMs: samples.map(sample => Number(sample.toFixed(1))),
    averageMs: Number(average.toFixed(1)),
    minMs: Number(Math.min(...samples).toFixed(1)),
    maxMs: Number(Math.max(...samples).toFixed(1)),
  }));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Database latency check failed.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
