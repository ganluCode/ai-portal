import PageContainer from '@/components/layout/page-container';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { BadgeCheck } from 'lucide-react';

export default function ExclusivePage() {
  return (
    <PageContainer>
      <div className='space-y-6'>
        <h1 className='flex items-center gap-2 text-3xl font-bold tracking-tight'>
          <BadgeCheck className='h-7 w-7 text-green-600' />
          Exclusive Area
        </h1>
        <Card>
          <CardHeader>
            <CardTitle>Exclusive Features</CardTitle>
            <CardDescription>
              This area is reserved for authorized users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className='text-lg'>Have a wonderful day!</p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
