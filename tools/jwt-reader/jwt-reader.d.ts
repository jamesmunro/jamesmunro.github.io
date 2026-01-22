/** JWT header structure */
export interface JwtHeader {
    alg: string;
    typ?: string;
    [key: string]: unknown;
}
/** JWT payload structure */
export interface JwtPayload {
    sub?: string;
    name?: string;
    iat?: number;
    exp?: number;
    [key: string]: unknown;
}
/** Decoded JWT result */
export interface DecodedToken {
    header: JwtHeader;
    payload: JwtPayload;
}
export declare const decodeSegment: (segment: string) => string;
export declare const decodeToken: (token: string) => DecodedToken;
