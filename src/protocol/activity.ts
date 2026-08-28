export const ACTIVITY_KEYS = [
  'street',
  'console',
  'comms',
  'staff',
  'deck',
  'sheet',
  'inventory',
  'market',
] as const;

export type ActivityKey = (typeof ACTIVITY_KEYS)[number];

export type ActivityMap = Record<ActivityKey, number>;

export function emptyActivity(): ActivityMap {
  return {
    street: 0,
    console: 0,
    comms: 0,
    staff: 0,
    deck: 0,
    sheet: 0,
    inventory: 0,
    market: 0,
  };
}

export function activityKeyFor(path: string): ActivityKey | null {
  if (['/play', '/combat', '/roll'].some((prefix) => path.startsWith(prefix))) return 'street';
  if (path.startsWith('/console')) return 'console';
  if (path.startsWith('/comms')) return 'comms';
  if (path.startsWith('/staff')) return 'staff';
  if (path.startsWith('/deck') || path.startsWith('/hack')) return 'deck';
  if (path.startsWith('/sheet')) return 'sheet';
  if (path.startsWith('/inventory') || path.startsWith('/gear')) return 'inventory';
  if (path.startsWith('/market')) return 'market';
  return null;
}

export function tabActivity(to: string, activity: ActivityMap): number {
  if (to === '/play') return activity.street;
  if (to === '/console') return activity.console;
  if (to === '/comms') return activity.comms;
  if (to === '/staff') return activity.staff;
  if (to === '/deck') return activity.deck;
  if (to === '/sheet' || to === '/chargen') return activity.sheet;
  if (to === '/inventory') return activity.inventory;
  if (to === '/market') return activity.market;
  return 0;
}

export function markActivity(activity: ActivityMap, key: ActivityKey): ActivityMap {
  return { ...activity, [key]: activity[key] + 1 };
}

export function clearActivity(activity: ActivityMap, key: ActivityKey): ActivityMap {
  if (!activity[key]) return activity;
  return { ...activity, [key]: 0 };
}

export function markIfAway(activity: ActivityMap, key: ActivityKey, path: string): ActivityMap {
  if (activityKeyFor(path) === key) return activity;
  return markActivity(activity, key);
}

export function activityTotal(activity: ActivityMap): number {
  return ACTIVITY_KEYS.reduce((sum, key) => sum + activity[key], 0);
}

/** Dock light: unseen activity on a screen that is not open. */
export function awayActivity(activity: ActivityMap, path: string): number {
  const here = activityKeyFor(path);
  return ACTIVITY_KEYS.reduce(
    (sum, key) => (key === here ? sum : sum + activity[key]),
    0,
  );
}

export function activityHint(base: string, count: number): string {
  if (count <= 0) return base;
  return count > 9 ? '9+' : String(count);
}
