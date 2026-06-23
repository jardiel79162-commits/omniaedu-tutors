import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ReservedUsernamesCard } from "@/components/ReservedUsernamesCard";

export const Route = createFileRoute("/_authenticated/plus/reservados")({
  component: ReservedPage,
});

function ReservedPage() {
  return (
    <div className="flex flex-col h-dvh lg:h-full bg-background">
      <header className="shrink-0 backdrop-blur bg-background/85 border-b">
        <div className="flex items-center gap-2 p-3">
          <Link to="/plus" className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-base font-semibold">Usernames reservados</h1>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-2xl mx-auto p-4 lg:p-8 pb-32">
          <ReservedUsernamesCard />
        </div>
      </div>
    </div>
  );
}
