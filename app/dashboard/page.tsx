import { Suspense } from "react";
import { DashboardContent } from "@/components/dashboard-content";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-neutral-100" />
      <div className="h-40 animate-pulse rounded-xl border border-neutral-200 bg-white" />
      <div className="h-64 animate-pulse rounded-xl border border-neutral-200 bg-white" />
    </div>
  );
}
