import mongoose from 'mongoose';

const TEST_URI = 'mongodb://localhost:27017/code-dojo-test';

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
});

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});
