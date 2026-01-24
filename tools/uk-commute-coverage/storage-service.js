/**
 * Unified Storage Service for IndexedDB operations
 * Manages both tile cache and settings storage
 */
import { INDEXED_DB } from './constants.js';
/**
 * Storage service providing IndexedDB access for tiles and settings
 */
export class StorageService {
    dbPromise = null;
    openDB() {
        if (this.dbPromise)
            return this.dbPromise;
        this.dbPromise = new Promise((resolve, reject) => {
            if (typeof window === 'undefined' || !window.indexedDB) {
                reject(new Error('IndexedDB not available'));
                return;
            }
            const request = indexedDB.open(INDEXED_DB.DATABASE_NAME, INDEXED_DB.DATABASE_VERSION);
            request.onerror = () => reject(request.error);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                // Create tiles store if not exists
                if (!db.objectStoreNames.contains(INDEXED_DB.TILES_STORE)) {
                    db.createObjectStore(INDEXED_DB.TILES_STORE, { keyPath: 'key' });
                }
                // Create settings store if not exists
                if (!db.objectStoreNames.contains(INDEXED_DB.SETTINGS_STORE)) {
                    db.createObjectStore(INDEXED_DB.SETTINGS_STORE, { keyPath: 'key' });
                }
            };
            request.onsuccess = () => resolve(request.result);
        });
        return this.dbPromise;
    }
    // Settings methods
    async getSetting(key) {
        try {
            const db = await this.openDB();
            return new Promise((resolve) => {
                const tx = db.transaction([INDEXED_DB.SETTINGS_STORE], 'readonly');
                const store = tx.objectStore(INDEXED_DB.SETTINGS_STORE);
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result?.value ?? null);
                request.onerror = () => resolve(null);
            });
        }
        catch {
            return null;
        }
    }
    async setSetting(key, value) {
        try {
            const db = await this.openDB();
            return new Promise((resolve) => {
                const tx = db.transaction([INDEXED_DB.SETTINGS_STORE], 'readwrite');
                const store = tx.objectStore(INDEXED_DB.SETTINGS_STORE);
                store.put({ key, value });
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        }
        catch {
            // Silently fail if IndexedDB not available
        }
    }
    // Tile methods
    async getTile(key) {
        try {
            const db = await this.openDB();
            return new Promise((resolve) => {
                const tx = db.transaction([INDEXED_DB.TILES_STORE], 'readonly');
                const store = tx.objectStore(INDEXED_DB.TILES_STORE);
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result?.blob ?? null);
                request.onerror = () => resolve(null);
            });
        }
        catch {
            return null;
        }
    }
    async setTile(key, blob) {
        try {
            const db = await this.openDB();
            return new Promise((resolve) => {
                const tx = db.transaction([INDEXED_DB.TILES_STORE], 'readwrite');
                const store = tx.objectStore(INDEXED_DB.TILES_STORE);
                store.put({ key, blob });
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        }
        catch {
            // Silently fail if IndexedDB not available
        }
    }
    async getTileCount() {
        try {
            const db = await this.openDB();
            return new Promise((resolve) => {
                const tx = db.transaction([INDEXED_DB.TILES_STORE], 'readonly');
                const store = tx.objectStore(INDEXED_DB.TILES_STORE);
                const request = store.count();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => resolve(0);
            });
        }
        catch {
            return 0;
        }
    }
    async clearTiles() {
        try {
            const db = await this.openDB();
            return new Promise((resolve) => {
                const tx = db.transaction([INDEXED_DB.TILES_STORE], 'readwrite');
                const store = tx.objectStore(INDEXED_DB.TILES_STORE);
                store.clear();
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        }
        catch {
            // Silently fail if IndexedDB not available
        }
    }
}
// Singleton instance
export const storage = new StorageService();
//# sourceMappingURL=storage-service.js.map