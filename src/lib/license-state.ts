



export type LicenseCache = {
  hub_status: "active" | "revoked" | "in_use_elsewhere";
  buyer_name?: string;
  latest_version?: string;   
  club_incluso_ate?: string; 
  entitled?: boolean;        
  last_ok_at: string;        
  hard_block?: boolean;      
  
  firehose_reason?: string;
} | null;

export type LicenseState = "never_verified" | "revoked" | "in_use_elsewhere" | "expired" | "active" | "unverified";

export const GRACE_MS = 5 * 24 * 60 * 60 * 1000;

export function getLicenseState(cache: LicenseCache, now: number): LicenseState {
  if (!cache) return "never_verified";
  if (cache.hub_status === "revoked") return "revoked";
  if (cache.hub_status === "in_use_elsewhere") return "in_use_elsewhere"; 
  
  
  
  
  
  
  if (cache.entitled === false) return "expired";
  if (!cache.club_incluso_ate || Date.parse(cache.club_incluso_ate) <= now) return "expired";
  if (now - Date.parse(cache.last_ok_at) <= GRACE_MS) return "active";
  return "unverified";
}

export function firehoseOn(s: LicenseState): boolean {
  return s === "active";
}


export function firehoseGraced(s: LicenseState): s is "active" | "unverified" {
  return s === "active" || s === "unverified";
}


export function lojaLiberada(s: LicenseState): s is "active" | "unverified" {
  return firehoseGraced(s);
}




















export const YOUNG_MS = 14 * 24 * 60 * 60 * 1000;

export const FRESH_STALE_MS = 3 * 24 * 60 * 60 * 1000;

export type EngineBlockReason = "hard" | "stale";


export function engineBlockReason(
  cache: LicenseCache,
  firstActivatedAt: number | null,
  now: number,
): EngineBlockReason | null {
  if (cache?.hard_block === true) return "hard"; 
  
  if (
    firstActivatedAt != null &&
    now - firstActivatedAt <= YOUNG_MS &&
    cache != null &&
    now - Date.parse(cache.last_ok_at) > FRESH_STALE_MS
  ) {
    return "stale";
  }
  return null;
}


export function engineBlocked(
  cache: LicenseCache,
  firstActivatedAt: number | null,
  now: number,
): boolean {
  return engineBlockReason(cache, firstActivatedAt, now) !== null;
}
