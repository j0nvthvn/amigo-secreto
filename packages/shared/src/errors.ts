/**
 * Códigos de error de la API (RPC y Edge Functions) y su texto para la interfaz.
 * Las RPC los lanzan con `raise exception using errcode = 'P0001', message = '<codigo>'`.
 */
export const errorMessages = {
  not_authenticated: 'Tu sesión expiró. Vuelve a abrir tu link.',
  anonymous_not_allowed: 'Para crear un grupo tienes que iniciar sesión con Google.',
  not_owner: 'Solo quien organiza el grupo puede hacer esto.',
  not_member: 'No eres parte de este grupo.',
  not_found: 'No encontramos lo que buscas.',
  invalid_input: 'Revisa los datos e inténtalo de nuevo.',
  group_limit: 'Llegaste al máximo de 20 grupos.',
  member_limit: 'El grupo llegó al máximo de 100 participantes.',
  name_taken: 'Ya hay alguien con ese nombre en el grupo.',
  group_not_open: 'El sorteo ya se hizo. Para cambiar esto tienes que repetirlo.',
  group_not_drawn: 'Todavía no se hace el sorteo.',
  group_archived: 'El evento ya pasó y el grupo quedó en solo lectura.',
  too_few_members: 'Se necesitan al menos 4 participantes para hacer el sorteo.',
  draw_impossible: 'Con estas exclusiones no se puede hacer el sorteo.',
  invalid_token: 'Este link no es válido. Pídele uno nuevo a quien organiza.',
  claimed_by_other:
    'Este link ya se abrió en otro dispositivo. Ábrelo donde lo abriste primero o pídele a quien organiza que lo regenere.',
  already_member: 'Ya eres parte de este grupo con otro nombre.',
  rate_limited: 'Estás enviando mensajes muy rápido. Espera un momento.',
} as const;

export type ErrorCode = keyof typeof errorMessages;

export const unknownErrorMessage = 'Algo salió mal. Inténtalo de nuevo.';

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && Object.hasOwn(errorMessages, value);
}

/** Extrae el código de un error de RPC (PostgrestError) o de una respuesta de Edge Function. */
export function toErrorCode(error: unknown): ErrorCode | null {
  if (typeof error !== 'object' || error === null) return null;
  const { code, message } = error as { code?: unknown; message?: unknown };
  if (isErrorCode(message)) return message;
  if (isErrorCode(code)) return code;
  return null;
}

export function errorText(error: unknown): string {
  const code = toErrorCode(error);
  return code ? errorMessages[code] : unknownErrorMessage;
}
