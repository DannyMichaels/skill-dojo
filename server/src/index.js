import app from './app.js';
import connectDB from './config/db.js';
import env from './config/env.js';

await connectDB();

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});
