/**
 * Widget Data Contract — Phase 5 Prep
 * Defines the data shape that watchOS, WidgetKit, and menu bar will consume
 */

export interface TimingWidgetData {
  engineId: string;
  title: string;
  primaryValue: string;      // e.g. "Shukla 3" or "78/45/92"
  secondaryValue?: string;   // e.g. "Ashwini Nakshatra"
  icon?: string;             // Lucide icon name
  updatedAt: string;         // ISO 8601
  expiresAt: string;         // When this data becomes stale
}

export interface TimingWidgetCollection {
  panchanga?: TimingWidgetData;
  vedicClock?: TimingWidgetData;
  biorhythm?: TimingWidgetData;
  numerology?: TimingWidgetData;
  fetchedAt: string;
}
