import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pb, pocketbaseUrl } from "@/lib/pocketbase";
import { useEffect, useState, type FormEvent } from "react";

type AuthRecord = {
  id?: string;
  email?: string;
  username?: string;
  collectionName?: string;
};

function getAuthSummary(record: AuthRecord | null) {
  if (!record) {
    return "No active session";
  }

  return record.email || record.username || record.id || "Authenticated";
}

export function PocketBasePanel() {
  const [healthStatus, setHealthStatus] = useState("Idle");
  const [healthPayload, setHealthPayload] = useState("");
  const [authRecord, setAuthRecord] = useState<AuthRecord | null>((pb.authStore.record as AuthRecord | null) ?? null);
  const [authToken, setAuthToken] = useState(pb.authStore.token);
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((token, record) => {
      setAuthToken(token);
      setAuthRecord((record as AuthRecord | null) ?? null);
    });

    return unsubscribe;
  }, []);

  async function checkHealth() {
    setHealthStatus("Checking...");
    setHealthPayload("");

    try {
      const payload = await pb.send("/api/health", { method: "GET" });
      setHealthStatus("Connected");
      setHealthPayload(JSON.stringify(payload, null, 2));
    } catch (error) {
      setHealthStatus("Connection failed");
      setHealthPayload(String(error));
    }
  }

  async function refreshAuth() {
    const collectionName = authRecord?.collectionName;

    if (!collectionName) {
      setAuthError("No auth collection available to refresh.");
      return;
    }

    setAuthError("");

    try {
      await pb.collection(collectionName).authRefresh();
    } catch (error) {
      pb.authStore.clear();
      setAuthError(String(error));
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setAuthError("");

    try {
      const formData = new FormData(event.currentTarget);
      const collection = String(formData.get("collection") || "users");
      const identity = String(formData.get("identity") || "");
      const password = String(formData.get("password") || "");

      if (collection === "_superusers") {
        throw new Error("Do not authenticate PocketBase superusers from the browser. Use a regular auth collection.");
      }

      await pb.collection(collection).authWithPassword(identity, password);
      await checkHealth();
    } catch (error) {
      setAuthError(String(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogout() {
    pb.authStore.clear();
    setAuthError("");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="text-left">
        <CardHeader>
          <CardTitle>PocketBase Connection</CardTitle>
          <CardDescription>Single shared SDK instance, browser auth store, and API health check.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>PocketBase URL</Label>
            <Input value={pocketbaseUrl} readOnly />
          </div>

          <div className="space-y-2">
            <Label>Connection status</Label>
            <Input value={healthStatus} readOnly />
          </div>

          <div className="space-y-2">
            <Label>Health payload</Label>
            <textarea
              value={healthPayload}
              readOnly
              className="flex min-h-40 w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm shadow-xs"
              placeholder="Run the health check to verify the PocketBase connection."
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={checkHealth} type="button">
              Check PocketBase
            </Button>
            <Button onClick={refreshAuth} type="button" variant="secondary" disabled={!authToken}>
              Refresh session
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="text-left">
        <CardHeader>
          <CardTitle>Auth Demo</CardTitle>
          <CardDescription>Authenticate against any PocketBase auth collection, then inspect the persisted session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="collection">Auth collection</Label>
              <Input id="collection" name="collection" defaultValue="users" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="identity">Email or username</Label>
              <Input id="identity" name="identity" autoComplete="username" placeholder="user@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
              <Button type="button" variant="outline" onClick={handleLogout} disabled={!authToken}>
                Sign out
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            <Label>Current session</Label>
            <Input value={getAuthSummary(authRecord)} readOnly />
          </div>

          <div className="space-y-2">
            <Label>Stored token</Label>
            <Input value={authToken || "No token"} readOnly />
          </div>

          {authError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {authError}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
