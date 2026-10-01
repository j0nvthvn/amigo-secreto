import { strings } from '@amigo/shared/strings';
import { Layout } from '../components/Layout';
import { env } from '../lib/env';

export function PrivacyPage() {
  const p = strings.privacy;
  return (
    <Layout>
      <h1>{p.title}</h1>
      <p className="muted">{p.updated}</p>
      {p.sections.map((section) => (
        <section key={section.title} className="prose">
          <h2>{section.title}</h2>
          <ul>
            {section.body.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ))}
      <p>{p.contact(env.contactEmail)}</p>
    </Layout>
  );
}
