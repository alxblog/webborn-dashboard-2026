import { AppLayout } from "@/components/app-layout";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/lib/auth";
import { DashboardPage } from "@/routes/dashboard-page";
import { LoginPage } from "@/routes/login-page";
import { createBrowserRouter, Navigate } from "react-router";

function LoginRouteGate() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <LoginPage />;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginRouteGate,
  },
  {
    Component: AuthGuard,
    children: [
      {
        path: "/",
        Component: AppLayout,
        children: [
          {
            index: true,
            Component: DashboardPage,
          },
        ],
      },
    ],
  },
]);
