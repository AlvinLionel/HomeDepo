export type TrendEventType = "search" | "view";

const AREA_STORAGE_KEY = "homexTrendArea";
const VISITOR_STORAGE_KEY = "homexTrendVisitor";

export function getTrendArea(): string {
  return localStorage.getItem(AREA_STORAGE_KEY)?.trim() ?? "";
}

export function saveTrendArea(area: string): void {
  localStorage.setItem(AREA_STORAGE_KEY, area.trim());
}

function getTrendVisitorId(): string {
  let visitorId = localStorage.getItem(VISITOR_STORAGE_KEY);
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem(VISITOR_STORAGE_KEY, visitorId);
  }
  return visitorId;
}

export async function trackProductTrend(productId: number, eventType: TrendEventType): Promise<void> {
  const response = await fetch("/api/trends/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productId,
      eventType,
      area: getTrendArea(),
      visitorId: getTrendVisitorId(),
    }),
  });

  if (!response.ok) throw new Error("Unable to record product interest.");
}
