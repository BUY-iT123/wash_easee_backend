import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './config/database.js';

const port = Number(process.env.PORT) || 4000;

try {
  await connectDatabase();
  app.listen(port, () => console.log(`WashEasee API listening on port ${port}.`));
} catch (error) {
  console.error('The API could not start:', error.message);
  process.exit(1);
}
