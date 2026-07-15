import type { TimelineDoc } from '@/domain/timelineTypes';
import { parseTimelineDocJson, serializeDoc } from '@/persistence/docIo';

const DB_NAME = 'chronicles-soi-next-db';
const DB_VERSION = 1;
const STORE = 'kv';
const DOC_KEY = 'timeline-doc-v1';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error('indexedDB open'));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

export async function loadDocFromIdb(): Promise<TimelineDoc | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const st = tx.objectStore(STORE);
    const r = st.get(DOC_KEY);
    r.onerror = () => {
      db.close();
      reject(r.error ?? new Error('get'));
    };
    r.onsuccess = () => {
      const raw = r.result;
      db.close();
      if (typeof raw !== 'string') {
        resolve(null);
        return;
      }
      resolve(parseTimelineDocJson(raw));
    };
  });
}

export async function saveDocToIdb(doc: TimelineDoc): Promise<void> {
  const db = await openDb();
  const payload = serializeDoc(doc);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const st = tx.objectStore(STORE);
    st.put(payload, DOC_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('put'));
    };
  });
}
