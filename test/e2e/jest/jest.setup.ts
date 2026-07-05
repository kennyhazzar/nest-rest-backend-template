jest.setTimeout(120000);

// Suppress expected teardown noise from BullMQ/ioredis closing connections
process.on('unhandledRejection', (reason) => {
  const msg = String(reason);
  if (msg.includes('Connection is closed') || msg.includes('Socket closed')) return;
  console.warn('[E2E] Unhandled rejection:', reason);
});

export {};
