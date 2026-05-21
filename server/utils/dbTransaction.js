import mongoose from 'mongoose';

const TRANSACTION_UNSUPPORTED_MESSAGES = [
  'Transaction numbers are only allowed on a replica set member or mongos',
  'replica set',
  'Transaction support is not available',
  'transactions are not supported',
];

export const runInTransaction = async (work) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (error) {
    const message = String(error?.message || '');
    const unsupported = TRANSACTION_UNSUPPORTED_MESSAGES.some((part) => message.toLowerCase().includes(part.toLowerCase()));
    if (!unsupported) throw error;
    return work(null);
  } finally {
    await session.endSession().catch(() => {});
  }
};
