import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const username = process.argv[2];
const password = process.argv[3];
const mongoUri = process.argv[4];

if (!username || !password || !mongoUri) {
  console.log('Usage: node migrate.js <username> <password> <mongodb_uri>');
  console.log('Example: node migrate.js myuser mypassword "mongodb+srv://..."');
  process.exit(1);
}

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
}, { timestamps: true });

const trackerDataSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  curriculum: { type: String, enum: ['dsa', 'hld', 'lld'], required: true },
  problems: { type: mongoose.Schema.Types.Mixed },
  contests: { type: mongoose.Schema.Types.Mixed },
  settings: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const TrackerData = mongoose.model('TrackerData', trackerDataSchema);

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected successfully.');

    // 1. Handle User
    let user = await User.findOne({ username });
    if (user) {
      console.log(`User '${username}' already exists. Data will be merged/overwritten for this user.`);
    } else {
      console.log(`Creating new user '${username}'...`);
      const hashedPassword = await bcrypt.hash(password, 10);
      user = new User({ username, password: hashedPassword });
      await user.save();
    }

    // 2. Migrate Data
    const curriculums = ['dsa', 'hld', 'lld'];
    for (const curriculum of curriculums) {
      const fileName = path.join(__dirname, `${curriculum}_tracker_data.json`);
      try {
        await fs.access(fileName);
        console.log(`Found local data for ${curriculum.toUpperCase()}, reading...`);
        const rawData = await fs.readFile(fileName, 'utf-8');
        const data = JSON.parse(rawData);

        console.log(`Migrating ${curriculum.toUpperCase()} data to MongoDB...`);
        await TrackerData.findOneAndUpdate(
          { userId: user._id, curriculum },
          { 
            $set: {
              problems: data.problems || [],
              contests: data.contests || [],
              settings: data.settings || {}
            }
          },
          { upsert: true, new: true }
        );
        console.log(`Successfully migrated ${curriculum.toUpperCase()}!`);
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.log(`No local data found for ${curriculum.toUpperCase()}, skipping.`);
        } else {
          console.error(`Error reading ${curriculum} data:`, err.message);
        }
      }
    }

    console.log('\n✅ All local data successfully migrated to MongoDB!');
    console.log(`You can now log in to the app with username: ${username}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
