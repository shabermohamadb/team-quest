import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbManager } from '../server/database.js';
import { participantManager } from '../server/participantManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const PARTICIPANTS_FILE = path.join(DATA_DIR, 'participants.json');

const playerNames = [
  'Jeni',
  'Andrea',
  'Archana',
  'Harshini',
  'Sowmiya',
  'Ancy',
  'Amrutha',
  'Dharshan',
  'Vignesh',
  'Susmitha',
  'Haajira',
  'Ajisha',
  'Anjai',
  'Tharun Krishna',
  'Abishake',
  'Jagadeesh',
  'Aswathi',
  'Arock',
  'Vishal',
  'Beule',
  'Danu Peter',
  'Vishal',
  'Shaniya',
  'Anitus',
  'Naveen',
  'Gobika',
  'Aysha',
  'Algin Jerfiya',
  'Sibishah',
  'Aadhithya',
  'Hamdhan'
];

console.log(`Populating ${playerNames.length} tournament players...`);

// 1. Clear existing members
dbManager.clearMembers();

// 2. Add the 31 tournament players
const activeGame = dbManager.getActiveGame();
const gameId = activeGame?.id || 'QUEST_DEFAULT_GAME';
const teamCount = activeGame?.teamCount || 4;

const added = dbManager.addMembersBulk(gameId, playerNames);
console.log(`Inserted ${added.length} players into SQLite database for game: ${gameId}`);

// 3. Auto-assign teams evenly (delta <= 1)
const rosterData = dbManager.autoAssignMembers(gameId, teamCount);
console.log(`\nAuto-assigned roster across ${teamCount} teams:`);
for (let t = 1; t <= teamCount; t++) {
  const members = rosterData.rosters[t] || [];
  console.log(`Team ${t} (${members.length} members): ${members.map(m => m.name).join(', ')}`);
}

// 4. Update data/participants.json
const allMembers = dbManager.getMembers(gameId);
fs.writeFileSync(PARTICIPANTS_FILE, JSON.stringify(allMembers, null, 2), 'utf8');
console.log(`\nSuccessfully updated ${PARTICIPANTS_FILE} with ${allMembers.length} tournament members!`);
