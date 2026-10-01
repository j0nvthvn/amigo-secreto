import { strings } from '@amigo/shared/strings';
import { Layout } from '../components/Layout';

export function NotFoundPage() {
  return (
    <Layout>
      <p className="lead">{strings.web.notFound}</p>
      <a className="button secondary" href="/">
        {strings.common.goHome}
      </a>
    </Layout>
  );
}
