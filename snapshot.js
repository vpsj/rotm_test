// snapshot.js
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('serviceAccountKey.json', 'utf8'));
// OR if using GitHub Action: the action will write serviceAccountKey.json for you

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const links = JSON.parse(fs.readFileSync('links.json','utf8')); // array of reddit URLs
const FORCE = process.argv.includes('--force');

function redditIdFromUrl(url){
  const m = url.match(/comments\/([^\/]+)/);
  return m ? m[1] : Buffer.from(url).toString('base64').slice(0,20);
}

async function processLink(url){
  const id = redditIdFromUrl(url);
  const docRef = db.collection('videos').doc(id);
  const doc = await docRef.get();
  if (doc.exists && !FORCE){
    console.log(`Skipping ${id} (exists). Run with --force to overwrite redditScore.`);
    return;
  }

  console.log(`Fetching ${url}`);
  const res = await fetch(url + '.json', { headers: { 'User-Agent': 'rotm-snapshot/1.0 (+youremail)' }});
  if (!res.ok) throw new Error(`Reddit fetch failed ${res.status}`);
  const json = await res.json();
  const data = json[0].data.children[0].data;
  const title = data.title || url;
  const redditScore = data.ups || data.score || 0;

  await docRef.set({
    url,
    title,
    redditScore,
    top1Count: 0,
    top2Count: 0,
    top3Count: 0,
    voteScore: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  console.log(`Saved ${id} (${redditScore})`);
}

(async ()=>{
  for (const url of links){
    try { await processLink(url); }
    catch(err){ console.error('Error for', url, err.message || err); }
  }
  console.log('Snapshot done');
  process.exit(0);
})();
