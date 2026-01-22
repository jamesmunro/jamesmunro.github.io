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

export const decodeSegment = (segment: string): string => {
  if (!segment) {
    throw new Error("Missing segment");
  }

  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(padded)) {
    throw new Error("Invalid Base64");
  }

  let decoded: string;
  if (typeof atob === "function") {
    decoded = atob(padded);
  } else if (typeof Buffer !== "undefined") {
    decoded = Buffer.from(padded, "base64").toString("binary");
  } else {
    throw new Error("No Base64 decoder available");
  }

  return decodeURIComponent(
    decoded
      .split("")
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
      .join("")
  );
};

export const decodeToken = (token: string): DecodedToken => {
  if (!token) {
    throw new Error("Missing token");
  }

  const normalizedToken = token.replace(/\s+/g, "");
  const parts = normalizedToken.split(".");
  if (parts.length < 2 || parts.length > 3) {
    throw new Error("Token must have two or three sections");
  }

  return {
    header: JSON.parse(decodeSegment(parts[0])) as JwtHeader,
    payload: JSON.parse(decodeSegment(parts[1])) as JwtPayload,
  };
};
