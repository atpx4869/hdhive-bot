export type BotRole = 'ADMIN' | 'USER';

export type BotIdentity = {
  telegramUserId: string;
  role: BotRole;
};

export type BotUser = {
  id: number;
  telegramUserId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AddBotUserInput = {
  telegramUserId: string;
  username?: string | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
};

export type AddBotUserResult =
  | { success: true; user: BotUser }
  | { success: false; reason: 'already_exists' };

export type RemoveBotUserResult =
  | { success: true }
  | { success: false; reason: 'not_found' };
