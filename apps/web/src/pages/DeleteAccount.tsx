import { strings } from '@amigo/shared/strings';
import { Layout } from '../components/Layout';
import { env } from '../lib/env';

/** El botón para eliminar la cuenta desde la web llega con la Edge Function delete-account (M7). */
export function DeleteAccountPage() {
  const d = strings.deleteAccount;
  return (
    <Layout>
      <h1>{d.title}</h1>
      <section className="prose">
        <p>{d.intro}</p>
        <ul>
          {d.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>{d.howApp}</p>
        <p>{d.howEmail(env.contactEmail)}</p>
      </section>
    </Layout>
  );
}
