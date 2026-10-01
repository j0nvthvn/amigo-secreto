import { strings } from '@amigo/shared/strings';
import { Card, Layout } from '../components/Layout';

export function LandingPage() {
  return (
    <Layout>
      <h1 className="hero-title">{strings.appName}</h1>
      <p className="lead">{strings.web.tagline}</p>
      <Card>
        <ul className="features">
          {strings.web.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </Card>
      <p className="muted center">{strings.web.playSoon}</p>
    </Layout>
  );
}
