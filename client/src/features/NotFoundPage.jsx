import { Compass } from 'lucide-react';
import { Link } from 'react-router';
import { buttonClasses } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <Card>
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The page you were looking for doesn't exist."
        action={
          <Link to="/" className={buttonClasses()}>
            Go to dashboard
          </Link>
        }
      />
    </Card>
  );
}
