import { BuddyReadInvitations } from '@/components/features/social/BuddyReadInvitations';
import { PageHeader } from '@/components/layout/PageHeader';

export default function BuddyReadsPage() {
  return (
    <div>
      <PageHeader title="Buddy Reads" />
      <BuddyReadInvitations />
    </div>
  );
}
