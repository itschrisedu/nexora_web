import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://094d4c94366907325a9d334d266428a4@o4512144445603840.ingest.us.sentry.io/4512144457990144",
  tracesSampleRate: 1.0,
  debug: false,
});
