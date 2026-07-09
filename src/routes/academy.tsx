import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";

export const Route = createFileRoute("/academy")({
  component: () => (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  ),
});
