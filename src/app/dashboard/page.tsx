import { redirect } from 'next/navigation';

export default async function Dashboard() {
  // TODO(step-5): add real auth check via JWT cookie
  redirect('/dashboard/overview');
}
