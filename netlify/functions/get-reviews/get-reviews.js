// File: netlify/functions/get-reviews.js

const admin = require('firebase-admin');

let firebaseAdminApp;

// Funzione per inizializzare Firebase Admin (uguale a save-review.js)
function initializeFirebaseAdmin() {
    if (firebaseAdminApp) {
        return firebaseAdminApp;
    }
    const serviceAccountKeyBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
    if (!serviceAccountKeyBase64) {
        throw new Error('Variabile d\'ambiente FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 non impostata.');
    }
    const serviceAccountKeyJson = Buffer.from(serviceAccountKeyBase64, 'base64').toString('utf-8');
    const serviceAccount = JSON.parse(serviceAccountKeyJson);
    const projectId = process.env.FIREBASE_PROJECT_ID;
     if (!projectId) {
        throw new Error('Variabile d\'ambiente FIREBASE_PROJECT_ID non impostata.');
    }
    firebaseAdminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId
    });
    return firebaseAdminApp;
}

// Funzione principale (handler)
exports.handler = async (event, context) => {
    // 1. Controlla che sia una richiesta GET
     if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Metodo non permesso. Usa GET.' }),
            headers: { 'Allow': 'GET' }
        };
    }

    try {
        // 2. Inizializza Firebase Admin
        initializeFirebaseAdmin();
        const db = admin.firestore();

        // 3. Recupera tutte le recensioni dalla collezione "recensioni"
        // Ordiniamole per data di creazione, dalla più recente alla meno recente
        const reviewsSnapshot = await db.collection('recensioni').orderBy('createdAt', 'desc').get();

        // 4. Estrai i dati da ogni documento
        const reviews = [];
        reviewsSnapshot.forEach(doc => {
            reviews.push({
                id: doc.id, // Aggiunge l'ID del documento Firestore
                ...doc.data() // Aggiunge tutti gli altri campi (name, author, overall, ecc.)
            });
        });

        // 5. Rispondi al frontend con l'array di recensioni
        return {
            statusCode: 200, // OK
            body: JSON.stringify(reviews),
            // IMPORTANTE: Headers per CORS
             headers: {
                'Access-Control-Allow-Origin': '*', // O specifica il tuo dominio
                'Content-Type': 'application/json'
            }
        };

    } catch (error) {
        console.error('Errore nel recupero delle recensioni:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Errore interno del server durante il recupero.', error: error.message }),
             headers: { // Aggiungi header CORS anche per errori
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            }
        };
    }
};