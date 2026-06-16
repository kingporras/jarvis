import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { Button } from "../components/ui/Button";

function sanitizeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

function navigateTo(path: string) {
  window.history.replaceState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function LoginPage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextPath = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return sanitizeNext(params.get("next"));
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigateTo(nextPath);
    }
  }, [isAuthenticated, isLoading, nextPath]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const didLogin = await login(password);
    setIsSubmitting(false);

    if (didLogin) {
      navigateTo(nextPath);
      return;
    }

    setPassword("");
    setError("Credenciales no validas");
  }

  return (
    <main className="auth-screen">
      <section className="auth-card card" aria-labelledby="login-title">
        <div className="auth-card__brand">
          <span className="brand-mark" aria-hidden="true">
            J
          </span>
          <div>
            <span className="topbar__kicker">Sistema privado</span>
            <h1 id="login-title">Entrar en JARVIS</h1>
          </div>
        </div>

        <p>
          Acceso privado de Victor. La sesion se protege con cookie HttpOnly y no se guarda ningun token en el navegador.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="password">Contrasena</label>
          <input
            autoComplete="current-password"
            autoFocus
            id="password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />

          {error ? <p className="login-form__error">{error}</p> : null}

          <Button disabled={isSubmitting} type="submit" variant="primary">
            {isSubmitting ? "Verificando" : "Entrar"}
          </Button>
        </form>
      </section>
    </main>
  );
}
