import { Redirect } from 'expo-router';

/**
 * Destino de la redirección de OAuth (`tetoco://auth/callback`). El código se canjea en
 * lib/google.ts con el resultado del navegador; esta ruta solo evita una pantalla "no encontrada".
 */
export default function AuthCallback() {
  return <Redirect href="/" />;
}
