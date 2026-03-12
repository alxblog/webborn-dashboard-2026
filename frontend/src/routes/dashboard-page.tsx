import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PocketBasePanel } from "@/PocketBasePanel";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-3">
          <CardTitle className="text-3xl">Protected Area</CardTitle>
          <CardDescription>
            This route is rendered only when the PocketBase auth store contains a valid authenticated user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Use this layout as the parent for the rest of your authenticated application. Nested routes will inherit the
            same guard and the same session state from the shared PocketBase client.
          </p>
          <div className="mt-4">
            <Button asChild>
              <Link to="/maintenance">Open maintenance service</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <PocketBasePanel />
    </div>
  );
}
