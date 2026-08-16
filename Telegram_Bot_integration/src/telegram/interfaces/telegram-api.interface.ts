export interface TelegramApiEnvelope<T> {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
}

export interface TelegramChatInviteLink {
  invite_link: string;
  creator: unknown;
  creates_join_request: boolean;
  is_primary: boolean;
  is_revoked: boolean;
  name?: string;
  expire_date?: number;
  member_limit?: number;
}

export interface TelegramMessage {
  message_id: number;
  date: number;
  chat: { id: number };
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    date: number;
    text?: string;
    from?: { id: number; username?: string; is_bot: boolean };
    chat: { id: number; type: string };
  };
  my_chat_member?: {
    chat: { id: number; type: string; title?: string };
    from: { id: number; username?: string };
    new_chat_member: { status: string };
  };
}
