
import { ResumeData, Participant, CustomTemplate } from './types';

const DB_NAME = 'AventusCV_DB';
const RESUMES_STORE = 'resumes';
const PARTICIPANTS_STORE = 'participants';
const CUSTOM_TEMPLATES_STORE = 'custom_templates';
const DB_VERSION = 4;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject('Kunde inte öppna databasen');

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(RESUMES_STORE)) {
        db.createObjectStore(RESUMES_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PARTICIPANTS_STORE)) {
        db.createObjectStore(PARTICIPANTS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(CUSTOM_TEMPLATES_STORE)) {
        db.createObjectStore(CUSTOM_TEMPLATES_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event: any) => resolve(event.target.result);
  });
};

// --- CUSTOM TEMPLATES ---
export const saveCustomTemplateToDB = async (template: CustomTemplate): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CUSTOM_TEMPLATES_STORE, 'readwrite');
    const store = transaction.objectStore(CUSTOM_TEMPLATES_STORE);
    store.put(template).onsuccess = () => resolve();
  });
};

export const getAllCustomTemplatesFromDB = async (): Promise<CustomTemplate[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CUSTOM_TEMPLATES_STORE, 'readonly');
    const store = transaction.objectStore(CUSTOM_TEMPLATES_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
  });
};

export const deleteCustomTemplateFromDB = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CUSTOM_TEMPLATES_STORE, 'readwrite');
    const store = transaction.objectStore(CUSTOM_TEMPLATES_STORE);
    store.delete(id).onsuccess = () => resolve();
  });
};

// --- RESUMES ---
export const saveResumeToDB = async (resume: ResumeData): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(RESUMES_STORE, 'readwrite');
    const store = transaction.objectStore(RESUMES_STORE);
    const request = store.put(resume);
    request.onsuccess = () => resolve();
    request.onerror = () => reject('Kunde inte spara CV');
  });
};

export const getAllResumesFromDB = async (): Promise<ResumeData[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(RESUMES_STORE, 'readonly');
    const store = transaction.objectStore(RESUMES_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject('Kunde inte hämta CV:n');
  });
};

export const deleteResumeFromDB = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(RESUMES_STORE, 'readwrite');
    const store = transaction.objectStore(RESUMES_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject('Kunde inte radera CV');
  });
};

// --- PARTICIPANTS ---
export const saveParticipantToDB = async (participant: Participant): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PARTICIPANTS_STORE, 'readwrite');
    const store = transaction.objectStore(PARTICIPANTS_STORE);
    const request = store.put(participant);
    request.onsuccess = () => resolve();
    request.onerror = () => reject('Kunde inte spara deltagare');
  });
};

export const getAllParticipantsFromDB = async (): Promise<Participant[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PARTICIPANTS_STORE, 'readonly');
    const store = transaction.objectStore(PARTICIPANTS_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject('Kunde inte hämta deltagare');
  });
};

export const deleteParticipantFromDB = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PARTICIPANTS_STORE, 'readwrite');
    const store = transaction.objectStore(PARTICIPANTS_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject('Kunde inte radera deltagare');
  });
};

