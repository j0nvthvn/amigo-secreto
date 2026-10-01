import { parseInviteToken } from '@amigo/shared/links';
import { strings } from '@amigo/shared/strings';
import { lazy, Suspense } from 'react';
import { Layout } from './components/Layout';
import { DeleteAccountPage } from './pages/DeleteAccount';
import { LandingPage } from './pages/Landing';
import { NotFoundPage } from './pages/NotFound';
import { PrivacyPage } from './pages/Privacy';

// Supabase y zod solo se cargan en la vista del link personal
const InvitePage = lazy(() => import('./pages/Invite').then((m) => ({ default: m.InvitePage })));

/** Cuatro rutas fijas: no hace falta una librería de rutas. */
export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';

  if (path === '/') return <LandingPage />;
  if (path === '/privacidad') return <PrivacyPage />;
  if (path === '/eliminar-cuenta') return <DeleteAccountPage />;
  if (path.startsWith('/r/')) {
    const token = parseInviteToken(path);
    if (!token) return <NotFoundPage />;
    return (
      <Suspense
        fallback={
          <Layout>
            <p className="muted center">{strings.invite.opening}</p>
          </Layout>
        }
      >
        <InvitePage token={token} />
      </Suspense>
    );
  }
  return <NotFoundPage />;
}
