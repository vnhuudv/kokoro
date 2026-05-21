export function logRequest(action: string, metadata: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), action, ...metadata }));
}
