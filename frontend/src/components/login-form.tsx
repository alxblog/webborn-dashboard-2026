import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  FieldError,
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { MaskedInputOTP } from "@/components/ui/masked-input-otp"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth"
import { notifyError, notifySuccess } from "@/lib/notifications"
import { pb } from "@/lib/pocketbase"
import { useEffect, useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import type { ClientResponseError } from "pocketbase"

type AuthMethodsList = {
  mfa: {
    enabled: boolean
    duration: number
  }
  otp: {
    enabled: boolean
    duration: number
  }
  password: {
    enabled: boolean
    identityFields: string[]
  }
  oauth2: {
    enabled: boolean
    providers: Array<{
      name: string
      displayName?: string
    }>
  }
}

function getErrorMessage(error: unknown) {
  if (!error) {
    return "Erreur inconnue"
  }

  if (typeof error === "string") {
    return error
  }

  if (error instanceof Error) {
    const clientError = error as ClientResponseError & {
      response?: Record<string, unknown>
      originalError?: unknown
      url?: string
      status?: number
    }

    const details = [
      clientError.message,
      typeof clientError.status === "number" ? `status ${clientError.status}` : "",
      clientError.url ? `url ${clientError.url}` : "",
      clientError.response && Object.keys(clientError.response).length
        ? JSON.stringify(clientError.response)
        : "",
    ].filter(Boolean)

    return details.join(" | ")
  }

  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingMethods, setIsLoadingMethods] = useState(true)
  const [methods, setMethods] = useState<AuthMethodsList | null>(null)
  const [otpEmail, setOtpEmail] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [otpId, setOtpId] = useState("")
  const [otpMessage, setOtpMessage] = useState("")
  const [selectedMethod, setSelectedMethod] = useState<"password" | "otp">("password")
  const redirectTo = location.state?.from?.pathname || "/"
  const collection = "users"

  useEffect(() => {
    let isMounted = true

    async function loadAuthMethods() {
      try {
        const result = await pb.collection(collection).listAuthMethods()
        if (!isMounted) {
          return
        }

        setMethods(result as AuthMethodsList)
      } catch (err) {
        if (!isMounted) {
          return
        }

        setError(getErrorMessage(err))
      } finally {
        if (isMounted) {
          setIsLoadingMethods(false)
        }
      }
    }

    void loadAuthMethods()

    return () => {
      isMounted = false
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setOtpMessage("")
    setIsSubmitting(true)

    try {
      const formData = new FormData(event.currentTarget)
      const identity = String(formData.get("identity") || "")
      const password = String(formData.get("password") || "")

      await login({
        collection,
        identity,
        password,
      })

      notifySuccess("Connexion reussie.")
      navigate(redirectTo, { replace: true })
    } catch (err) {
      console.error("PocketBase password auth error", err)
      const message = getErrorMessage(err)
      setError(message)
      notifyError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleOAuthLogin(provider: string) {
    setError("")
    setOtpMessage("")
    setIsSubmitting(true)

    try {
      await pb.collection(collection).authWithOAuth2({ provider })
      notifySuccess(`Connexion avec ${provider} reussie.`)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      console.error("PocketBase OAuth2 auth error", err)
      const message = getErrorMessage(err)
      setError(message)
      notifyError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRequestOtp() {
    setError("")
    setOtpMessage("")
    setOtpCode("")
    setIsSubmitting(true)

    try {
      const result = await pb.collection(collection).requestOTP(otpEmail)
      setOtpId(result.otpId)
      setOtpMessage("Un code de connexion a ete envoye par email. Saisissez-le pour continuer.")
      notifySuccess("Un code de connexion a ete envoye par email.")
    } catch (err) {
      console.error("PocketBase OTP request error", err)
      const message = getErrorMessage(err)
      setError(message)
      notifyError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleOtpLogin() {
    setError("")
    setOtpMessage("")
    setIsSubmitting(true)

    try {
      await pb.collection(collection).authWithOTP(otpId, otpCode)
      notifySuccess("Connexion reussie.")
      navigate(redirectTo, { replace: true })
    } catch (err) {
      console.error("PocketBase OTP auth error", err)
      const message = getErrorMessage(err)
      setError(message)
      notifyError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const passwordEnabled = methods?.password.enabled ?? true
  const oauthProviders = methods?.oauth2.providers ?? []
  const identityLabel = methods?.password.identityFields.length
    ? methods.password.identityFields.join(" / ")
    : "email ou nom d'utilisateur"
  const showOauth = Boolean(methods?.oauth2.enabled && oauthProviders.length)
  const showOtp = Boolean(methods?.otp.enabled)
  const activeMethodCount =
    (passwordEnabled ? 1 : 0) +
    (showOtp ? 1 : 0) +
    (showOauth ? 1 : 0)
  const hasSingleMethod = activeMethodCount === 1
  const showPasswordSection = passwordEnabled && (hasSingleMethod || selectedMethod === "password")
  const showOtpSection = showOtp && (hasSingleMethod || selectedMethod === "otp")
  const showMethodSwitcher = !hasSingleMethod && passwordEnabled && showOtp

  useEffect(() => {
    if (hasSingleMethod) {
      if (passwordEnabled) {
        setSelectedMethod("password")
        return
      }

      if (showOtp) {
        setSelectedMethod("otp")
      }
      return
    }

    if (!passwordEnabled && showOtp) {
      setSelectedMethod("otp")
      return
    }

    setSelectedMethod("password")
  }, [hasSingleMethod, passwordEnabled, showOtp])

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-border/60 bg-card/90 shadow-xl backdrop-blur">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Bienvenue</CardTitle>
          <CardDescription>
            Connectez-vous a votre espace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {isLoadingMethods ? (
                <FieldDescription className="text-center">Chargement des methodes de connexion disponibles...</FieldDescription>
              ) : null}

              {showOauth ? (
                <>
                  <Field>
                    {oauthProviders.map((provider) => (
                      <Button
                        key={provider.name}
                        variant="outline"
                        type="button"
                        onClick={() => handleOAuthLogin(provider.name)}
                        disabled={isSubmitting}
                      >
                        Se connecter avec {provider.displayName || provider.name}
                      </Button>
                    ))}
                  </Field>
                  {(passwordEnabled || showOtp) ? (
                    <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                      Ou utiliser une autre methode de connexion
                    </FieldSeparator>
                  ) : null}
                </>
              ) : null}

              {showMethodSwitcher ? (
                <Field>
                  <Tabs value={selectedMethod} onValueChange={(value) => setSelectedMethod(value as "password" | "otp")}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="password" disabled={isSubmitting}>
                        Email / mot de passe
                      </TabsTrigger>
                      <TabsTrigger value="otp" disabled={isSubmitting}>
                        Code recu par email
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </Field>
              ) : null}

              {showPasswordSection ? (
                <>
                  <Field>
                    <FieldLabel htmlFor="identity">Identifiant ({identityLabel})</FieldLabel>
                    <Input
                      id="identity"
                      name="identity"
                      type="text"
                      placeholder="m@example.com"
                      required
                      disabled={!passwordEnabled || isSubmitting}
                    />
                  </Field>
                  <Field>
                    <div className="flex items-center">
                      <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                      <span className="ml-auto text-sm text-muted-foreground">Connexion par identifiant et mot de passe</span>
                    </div>
                    <Input id="password" name="password" type="password" required disabled={!passwordEnabled || isSubmitting} />
                  </Field>
                </>
              ) : null}

              <FieldError>{error}</FieldError>

              {showPasswordSection ? (
                <Field>
                  <Button type="submit" disabled={!passwordEnabled || isSubmitting}>
                    {isSubmitting ? "Connexion..." : "Se connecter"}
                  </Button>
                  <FieldDescription className="text-center">
                    Les routes protegees redirigent automatiquement ici lorsqu'aucune session PocketBase valide n'est active.
                  </FieldDescription>
                </Field>
              ) : null}

              {showOtpSection ? (
                <>
                  <Field>
                    <FieldLabel htmlFor="otp-email">Email pour recevoir un code</FieldLabel>
                    <Input
                      id="otp-email"
                      type="email"
                      value={otpEmail}
                      onChange={(event) => setOtpEmail(event.target.value)}
                      placeholder="m@example.com"
                      disabled={Boolean(otpId) || isSubmitting}
                    />
                  </Field>
                  <Field>
                    {!otpId ? (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleRequestOtp}
                          disabled={!otpEmail || isSubmitting}
                        >
                          Envoyer un code par email
                        </Button>
                        <FieldDescription>
                          {otpMessage || `Validite du code de connexion : environ ${Math.ceil((methods?.otp.duration || 0) / 60)} min.`}
                        </FieldDescription>
                      </>
                    ) : (
                      <>
                        <FieldDescription>
                          {otpMessage || "Le code a ete envoye. Saisissez-le pour finaliser votre connexion."}
                        </FieldDescription>
                        <div className="flex justify-center">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setOtpId("")
                              setOtpCode("")
                              setOtpMessage("")
                            }}
                            disabled={isSubmitting}
                          >
                            Modifier l'adresse email
                          </Button>
                        </div>
                      </>
                    )}
                  </Field>
                  {otpId ? (
                    <>
                      <Field>
                        <FieldLabel htmlFor="otp-code">Code recu par email</FieldLabel>
                        <MaskedInputOTP
                          id="otp-code"
                          value={otpCode}
                          onChange={setOtpCode}
                          pattern="****-****"
                          disabled={!otpId || isSubmitting}
                        />
                        <FieldDescription>
                          Saisissez le code recu par email.
                        </FieldDescription>
                      </Field>
                      <Field>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleOtpLogin}
                          disabled={!otpId || !otpCode || isSubmitting}
                        >
                          Se connecter avec le code
                        </Button>
                        {methods?.mfa.enabled ? (
                          <FieldDescription>
                            L'authentification multifacteur est active sur cette collection. Une verification supplementaire peut etre demandee.
                          </FieldDescription>
                        ) : null}
                      </Field>
                    </>
                  ) : null}
                </>
              ) : methods?.mfa.enabled ? (
                <FieldDescription className="text-center">
                  L'authentification multifacteur est active pour cette collection et s'applique aux methodes de connexion principales configurees.
                </FieldDescription>
              ) : null}
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        Besoin d'une collection d'authentification ? Creez-la dans l'administration PocketBase, puis revenez vous connecter.
        {" "}
        <Link to="/" className="underline underline-offset-4">
          Accueil protege
        </Link>
      </FieldDescription>
    </div>
  )
}
