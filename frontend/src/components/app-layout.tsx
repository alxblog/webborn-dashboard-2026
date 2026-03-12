import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { pocketbaseUrl } from "@/lib/pocketbase";
import { ClipboardList, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router";

export function AppLayout() {
  const { authRecord, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(24,24,27,0.08),_transparent_35%),linear-gradient(180deg,_var(--background),color-mix(in_oklab,var(--muted)_60%,white))]">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="size-4" />
                Starter Kit
              </div>
              <p className="text-sm text-muted-foreground">
                Connected to <span className="font-mono">{pocketbaseUrl}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium">{authRecord?.email || authRecord?.username || "Authenticated user"}</p>
                <p className="text-xs text-muted-foreground">{authRecord?.collectionName || "PocketBase auth"}</p>
              </div>
              <Button type="button" variant="outline" onClick={logout}>
                <LogOut className="size-4" />
                Logout
              </Button>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2">
            <Button asChild variant={location.pathname === "/" ? "default" : "outline"}>
              <Link to="/">
                <LayoutDashboard className="size-4" />
                Dashboard
              </Link>
            </Button>
            <Button
              asChild
              variant={location.pathname.startsWith("/maintenance") ? "default" : "outline"}
            >
              <Link to="/maintenance">
                <ClipboardList className="size-4" />
                Maintenance
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
