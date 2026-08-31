export function buildRoomInviteUrl(origin: string, roomCode: string) {
  return `${origin.replace(/\/+$/, "")}/room/${encodeURIComponent(roomCode)}`;
}

export async function copyTextToClipboard(text: string) {
  if (!navigator.clipboard?.writeText) return false;

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
