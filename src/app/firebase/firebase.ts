import { initializeApp } from 'firebase/app';

/**
 * Configurazione del progetto Firebase. Non è un segreto: identifica il progetto e finisce comunque nel browser;
 * a proteggere i dati saranno le regole di Firestore e di Auth.
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyBesDDUfpVoVkrJQhJUV6fSRg1weBNFZz8',
  authDomain: 'deaddrop-2026.firebaseapp.com',
  projectId: 'deaddrop-2026',
  storageBucket: 'deaddrop-2026.firebasestorage.app',
  messagingSenderId: '320095604864',
  appId: '1:320095604864:web:9f5a25adaf1fd9ae245665',
};

/** L'app Firebase, una sola per tutta l'applicazione. Auth e Firestore si agganciano qui, dietro le interfacce già esistenti. */
export const firebaseApp = initializeApp(firebaseConfig);
