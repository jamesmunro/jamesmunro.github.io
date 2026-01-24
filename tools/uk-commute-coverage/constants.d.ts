export declare const STANDARD_ZOOM = 8;
export declare const TILE_VERSION = "42";
export declare const ROUTE_SAMPLE_COUNT = 500;
export declare const COLOR_TOLERANCE = 10;
export declare const TILE_API_BASE: string;
export declare const INDEXED_DB: {
    readonly DATABASE_NAME: "tile-cache";
    readonly DATABASE_VERSION: 2;
    readonly TILES_STORE: "tiles";
    readonly SETTINGS_STORE: "settings";
};
export declare const SETTINGS_KEYS: {
    readonly ROUTE_START: "route-start";
    readonly ROUTE_END: "route-end";
    readonly GOOGLE_MAPS_API_KEY: "google-maps-api-key";
    readonly ROUTE_PROFILE: "route-profile";
    readonly TILE_NETWORK: "tile-network";
};
export declare const COVERAGE_COLORS: Record<number, string>;
export declare const NETWORK_COLORS: Record<string, string>;
export type MnoId = 'mno1' | 'mno2' | 'mno3' | 'mno4';
export type OperatorName = 'Vodafone' | 'O2' | 'EE' | 'Three';
export declare const MNO_MAP: Record<MnoId, OperatorName>;
export declare const MNO_IDS: MnoId[];
export declare const NETWORKS: readonly OperatorName[];
