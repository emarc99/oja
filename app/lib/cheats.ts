export const CHEATS = {
  "self-pay": "Pay my own shop to fake sales",
  "fake-token": "Pay with a worthless token",
  "double-pay": "Reuse a paid invoice",
  "skip-lender": "Pay without repaying the advance",
  "redirect-repayment": "Send the lender's share to me",
  "advance-too-big": "Borrow more than my record allows",
} as const;

export type Cheat = keyof typeof CHEATS;

export type CheatResult = {
  title?: string;
  blocked?: boolean;
  reason?: { code: string; message: string } | null;
  needs?: string;
};
