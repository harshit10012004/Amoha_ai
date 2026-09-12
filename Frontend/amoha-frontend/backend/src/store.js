import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, '..', 'data', 'db.json');
let queue = Promise.resolve();
export async function readDb(){ return JSON.parse(await fs.readFile(file, 'utf8')); }
export function writeDb(db){ queue = queue.then(()=>fs.writeFile(file, JSON.stringify(db,null,2))); return queue; }
export async function updateDb(fn){ const db=await readDb(); const result=await fn(db); await writeDb(db); return result; }
