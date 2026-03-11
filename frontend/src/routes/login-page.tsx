import { LoginForm } from "@/components/login-form";

export function LoginPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,_color-mix(in_oklab,var(--background)_70%,white),_color-mix(in_oklab,var(--secondary)_65%,white)_45%,_color-mix(in_oklab,var(--accent)_45%,white))] px-6 py-10">
      {/* <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-5">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted-foreground">PocketBase Auth</p>
          <h1 className="max-w-xl text-5xl leading-none font-semibold tracking-tight text-balance">
            Protect your React Router app with a persistent PocketBase session.
          </h1>
          <p className="max-w-xl text-base leading-7 text-muted-foreground">
            The login route authenticates against a PocketBase auth collection, stores the session in the browser, and
            redirects authenticated users into the protected layout.
          </p>
        </section>

        <LoginForm className="mx-auto w-full max-w-md" />
      </div> */}
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 ">
        <LoginForm className="mx-auto w-full max-w-md" />
      </div>
    </div>
  );
}
