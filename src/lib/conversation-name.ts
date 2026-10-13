type ConversationTurn = { role: "user" | "assistant"; text: string };

/** Decide name use from this request only; never retain another person's name. */
export function conversationNameUsage(name: string | undefined, history: ConversationTurn[] = []) {
  const savedName = name?.trim() ?? "";
  if (!savedName) return { name: "", useName: false };
  const escaped = savedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const mention = new RegExp(`(^|[^\\p{L}])${escaped}($|[^\\p{L}])`, "iu");
  const recentlyUsed = history.filter((turn) => turn.role === "assistant").slice(-2)
    .some((turn) => mention.test(turn.text));
  return { name: savedName, useName: !recentlyUsed };
}