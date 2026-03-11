import { useAuth } from "@/lib/auth";
import { Navigate, Outlet, useLocation } from "react-router";

export function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-6">
        <div className="rounded-xl border bg-card px-6 py-4 text-sm text-muted-foreground shadow-sm">
          Restoring PocketBase session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
