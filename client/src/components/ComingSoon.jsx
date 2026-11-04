import { Card } from './ui/Card.jsx';
import { EmptyState } from './ui/EmptyState.jsx';
import { PageHeader } from './ui/PageHeader.jsx';

// Temporary placeholder for pages built in later steps of Phase 4.
export function ComingSoon({ title, icon, step, description }) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <EmptyState icon={icon} title={`Coming in step ${step}`} description={description} />
      </Card>
    </>
  );
}
