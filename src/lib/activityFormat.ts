// Shared, serializable shape + phrasing for activity-feed events, used by both
// the server (initial render) and the client polling component.

export type ActivityItem = {
  id: string;
  type: string;
  payload: unknown;
  createdAt: string;
  user: { displayName: string; username: string };
  book: { title: string } | null;
};

function readKey<T extends string>(payload: unknown, key: string): T | undefined {
  return payload && typeof payload === "object" && key in payload
    ? ((payload as Record<string, unknown>)[key] as T | undefined)
    : undefined;
}

function formatShelfChange(payload: unknown): string {
  switch (readKey<string>(payload, "to")) {
    case "WANT_TO_READ":
      return "wants to read";
    case "CURRENTLY_READING":
      return "started reading";
    case "FINISHED":
      return "finished";
    case "DNF":
      return "set aside";
    default:
      return "updated a shelf";
  }
}

function formatMilestone(payload: unknown): string {
  switch (readKey<string>(payload, "kind")) {
    case "started":
      return "started reading";
    case "halfway":
      return "is halfway through";
    case "finished":
      return "finished";
    default:
      return "hit a reading milestone";
  }
}

export function formatActivity(type: string, payload: unknown): string {
  switch (type) {
    case "SHELF_CHANGE":
      return formatShelfChange(payload);
    case "MILESTONE":
      return formatMilestone(payload);
    case "COMMENT":
      return "posted in a discussion";
    default:
      return "did something";
  }
}
