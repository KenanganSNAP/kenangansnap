import { createFileRoute, Outlet } from "@tanstack/react-router";
import { HeaderControls } from "@/components/header-controls";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: () => (
    <>
      <div className="flex justify-end px-4 pt-3"><HeaderControls /></div>
      <Outlet />
    </>
  ),
});
