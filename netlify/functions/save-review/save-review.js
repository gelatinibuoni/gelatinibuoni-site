// File: netlify/functions/save-review.js

// Importa la libreria firebase-admin
const admin = require('firebase-admin');

// Variabile per inizializzare Firebase Admin solo una volta
let firebaseAdminApp;

// Funzione per inizializzare Firebase Admin (usa le variabili d'ambiente)
function initializeFirebaseAdmin() {
    if (firebaseAdminApp) {
        return firebaseAdminApp;
    }

    // --- SICUREZZA: Recupera le credenziali dall'ambiente ---
    // 1. Decodifica la chiave Base64
    const serviceAccountKeyBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
    if (!serviceAccountKeyBase64) {
        throw new Error('Variabile d\'ambiente FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 non impostata.');
    }
    const serviceAccountKeyJson = Buffer.from(serviceAccountKeyBase64, 'base64').toString('utf-8');
    const serviceAccount = JSON.parse(serviceAccountKeyJson);

    // 2. Recupera il Project ID (opzionale se già nella chiave, ma buona pratica)
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
        throw new Error('Variabile d\'ambiente FIREBASE_PROJECT_ID non impostata.');
    }

    // Inizializza l'app Firebase Admin
    firebaseAdminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId // Specifica il project ID
        // databaseURL: `https://${projectId}.firebaseio.com` // Aggiungi se usi Realtime Database, per Firestore non serve
    });

    return firebaseAdminApp;
}

// Funzione principale della Netlify Function (handler)
exports.handler = async (event, context) => {
    // 1. Controlla che sia una richiesta POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405, // Method Not Allowed
            body: JSON.stringify({ message: 'Metodo non permesso. Usa POST.' }),
            headers: { 'Allow': 'POST' }
        };
    }

    try {
        // 2. Inizializza Firebase Admin (se non già fatto)
        initializeFirebaseAdmin();
        const db = admin.firestore();

        // 3. Estrai i dati della recensione dal corpo della richiesta
        const reviewData = JSON.parse(event.body);

        // 4. Validazione molto basica dei dati (puoi espanderla)
        if (!reviewData.name || !reviewData.author || !reviewData.overall) {
             return {
                statusCode: 400, // Bad Request
                body: JSON.stringify({ message: 'Dati mancanti nella recensione (nome, autore, voto complessivo richiesti).' })
            };
        }

        // 5. Aggiungi un timestamp del server al momento del salvataggio
        reviewData.createdAt = admin.firestore.FieldValue.serverTimestamp();

        // 6. Salva la recensione nella collezione "recensioni"
        const docRef = await db.collection('recensioni').add(reviewData);

        console.log('Recensione salvata con ID: ', docRef.id);

        // 7. Rispondi al frontend con successo
        return {
            statusCode: 201, // Created
            body: JSON.stringify({ message: 'Recensione salvata con successo!', id: docRef.id }),
             // IMPORTANTE: Headers per CORS (permette al tuo frontend di chiamare la funzione)
             headers: {
                'Access-Control-Allow-Origin': '*', // O specifica il tuo dominio es: 'https://gelatinibuoni.it'
                'Access-Control-Allow-Headers': 'Content-Type',
                'Content-Type': 'application/json'
            }
        };

    } catch (error) {
        console.error('Errore nel salvataggio della recensione:', error);
        return {
            statusCode: 500, // Internal Server Error
            body: JSON.stringify({ message: 'Errore interno del server durante il salvataggio.', error: error.message }),
            headers: { // Aggiungi header CORS anche per errori
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Content-Type': 'application/json'
            }
        };
    }
};