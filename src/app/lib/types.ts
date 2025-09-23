export type Role = "user" | "assistant" | "system";
export type Citation = { label: string; url?: string; note?: string };
export type Message = { id: string; role: Role; content: string; citations?: Citation[] };
