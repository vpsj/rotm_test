// fetch_upvotes.js
const fetch = require("node-fetch");
const admin = require("firebase-admin");
const fs = require("fs");

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
  })
});

const db = admin.firestore();
const links = JSON.parse(fs.readFileSync("links.json"));

async function main() {
  for (const url of links) {
    try {
      const res = await fetch(url + ".json");
      const json = await res.json();
      const post = json[0].data.children[0].data;
      const docId = post.id;

      await db.collection("videos").doc(docId).set({
        title: post.title,
        url: "https://redd.it/" + docId,
        upvotes: post.ups,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      console.log("Saved:", post.title, post.ups);
    } catch (err) {
      console.error("Failed for", url, err);
    }
  }
}

main();
