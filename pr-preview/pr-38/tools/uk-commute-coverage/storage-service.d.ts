/**
 * Storage service providing IndexedDB access for tiles and settings
 */
export declare class StorageService {
    private dbPromise;
    private openDB;
    getSetting(key: string): Promise<string | null>;
    setSetting(key: string, value: string): Promise<void>;
    getTile(key: string): Promise<Blob | null>;
    setTile(key: string, blob: Blob): Promise<void>;
    getTileCount(): Promise<number>;
    clearTiles(): Promise<void>;
}
export declare const storage: StorageService;
