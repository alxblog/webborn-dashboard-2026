import { pb } from "@/lib/pocketbase";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AuthRecord = {
  id?: string;
  email?: string;
  username?: string;
  collectionName?: string;
};

type LoginParams = {
  collection: string;
  identity: string;
  password: string;
};

type AuthContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  authRecord: AuthRecord | null;
  token: string;
  login: (params: LoginParams) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [authRecord, setAuthRecord] = useState<AuthRecord | null>((pb.authStore.record as AuthRecord | null) ?? null);
  const [token, setToken] = useState(pb.authStore.token);

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((nextToken, nextRecord) => {
      setToken(nextToken);
      setAuthRecord((nextRecord as AuthRecord | null) ?? null);
    });

    async function bootstrap() {
      if (!pb.authStore.isValid || !pb.authStore.record?.collectionName) {
        setIsLoading(false);
        return;
      }

      try {
        await pb.collection(pb.authStore.record.collectionName).authRefresh();
      } catch {
        pb.authStore.clear();
      } finally {
        setIsLoading(false);
      }
    }

    void bootstrap();

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAuthenticated: pb.authStore.isValid,
      authRecord,
      token,
      async login({ collection, identity, password }) {
        if (collection === "_superusers") {
          throw new Error("Do not authenticate PocketBase superusers from the browser.");
        }

        await pb.collection(collection).authWithPassword(identity, password);
      },
      logout() {
        pb.authStore.clear();
      },
      async refresh() {
        const collectionName = pb.authStore.record?.collectionName;
        if (!collectionName) {
          throw new Error("No active auth collection to refresh.");
        }

        await pb.collection(collectionName).authRefresh();
      },
    }),
    [authRecord, isLoading, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
