/** Links personales: `<WEB_ORIGIN>/r/<token>`, con 22 caracteres base64url (R9). */
const TOKEN = /^[A-Za-z0-9_-]{22}$/;
const IN_URL = /\/r\/([A-Za-z0-9_-]{22})(?:[/?#]|$)/;

export function inviteUrl(webOrigin: string, token: string): string {
  return `${webOrigin.replace(/\/+$/, '')}/r/${token}`;
}

/** Acepta un link completo o el token solo. Devuelve null si no hay un token válido. */
export function parseInviteToken(text: string): string | null {
  const trimmed = text.trim();
  if (TOKEN.test(trimmed)) return trimmed;
  return IN_URL.exec(trimmed)?.[1] ?? null;
}
