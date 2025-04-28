// netlify/functions/update-review.js
const admin = require('firebase-admin');
let app;
function init() {
  if (app) return app;
  const svc = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64, 'base64').toString());
  app = admin.initializeApp({ credential: admin.credential.cert(svc), projectId: process.env.FIREBASE_PROJECT_ID });
  return app;
}
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    init();
    const db = admin.firestore();
    const { id, ...data } = JSON.parse(event.body);
    await db.collection('recensioni').doc(id).update(data);
    return { statusCode: 200, body: JSON.stringify({ message: 'Aggiornata!' }), headers:{ 'Access-Control-Allow-Origin':'*' } };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }), headers:{ 'Access-Control-Allow-Origin':'*' } };
  }
};
