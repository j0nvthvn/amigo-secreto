import { strings } from '@amigo/shared/strings';
import type { ReactNode } from 'react';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="page">
      <header className="topbar">
        <a href="/" className="brand">
          {strings.appName}
        </a>
      </header>
      <main className="content">{children}</main>
      <footer className="footer">
        <a href="/privacidad">{strings.web.privacyLink}</a>
        <a href="/eliminar-cuenta">{strings.web.deleteAccountLink}</a>
      </footer>
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className ?? ''}`}>{children}</section>;
}

export function ErrorBox({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <p className="error" role="alert">
      {message}
    </p>
  );
}
