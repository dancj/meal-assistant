export function parseRecipients(envVar: string | undefined): string[] {
  if (!envVar || !envVar.trim()) {
    throw new Error("EMAIL_RECIPIENTS environment variable is required");
  }
  const recipients = envVar
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
  if (recipients.length === 0) {
    throw new Error("EMAIL_RECIPIENTS environment variable is required");
  }
  return recipients;
}
