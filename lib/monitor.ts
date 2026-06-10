// WATCH (brief §7 Step 5 / §10.6): a pre-created Exa Monitor config + a sample
// webhook payload, shown STATICALLY. There is no live-firing monitor and no
// webhook receiver — this panel illustrates how Compass would stay current.

export interface MonitorConfig {
  id: string;
  name: string;
  query: string;
  includeDomains: string[];
  category: "news";
  cadence: string;
  createdAt: string;
  webhookUrl: string;
}

/** The pre-created monitor (configuration only — not live-firing). */
export const MONITOR_CONFIG: MonitorConfig = {
  id: "mon_eu_ai_act_delta",
  name: "EU AI Act / GDPR — chatbot obligations delta",
  query:
    "EU AI Act GDPR generative AI chatbot transparency automated decision obligations update guidance",
  includeDomains: ["digital-strategy.ec.europa.eu", "eur-lex.europa.eu"],
  category: "news",
  cadence: "daily",
  createdAt: "2026-05-20T09:00:00.000Z",
  webhookUrl: "https://compass.example/api/exa-webhook",
};

/** A representative webhook payload Exa would POST when a new result appears. */
export const SAMPLE_WEBHOOK_PAYLOAD = {
  monitorId: "mon_eu_ai_act_delta",
  event: "monitor.results",
  triggeredAt: "2026-06-08T09:00:12.441Z",
  newResults: [
    {
      url: "https://digital-strategy.ec.europa.eu/en/news/ai-act-gpai-transparency-guidance",
      title:
        "Commission publishes guidance on transparency obligations for chatbots and GPAI",
      publishedDate: "2026-06-08T06:30:00.000Z",
      highlights: [
        "New guidance clarifies that providers must label AI interactions at the start of every session, including for embedded customer-service chatbots.",
        "The guidance takes effect immediately and applies to providers established outside the Union whose systems serve EU users.",
      ],
      score: 0.79,
    },
  ],
} as const;
