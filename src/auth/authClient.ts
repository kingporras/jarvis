export interface AuthUser {
  id: "victor";
  name: "Victor";
}

interface AuthSuccess {
  ok: true;
  user: AuthUser;
}

interface AuthFailure {
  ok: false;
  error: string;
}

type AuthResponse = AuthSuccess | AuthFailure;

async function parseAuthResponse(response: Response): Promise<AuthResponse> {
  return response.json() as Promise<AuthResponse>;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch("/api/auth/me", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  const data = await parseAuthResponse(response);
  return data.ok ? data.user : null;
}

export async function loginWithPassword(password: string): Promise<AuthUser> {
  const response = await fetch("/api/auth/login", {
    body: JSON.stringify({ password }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const data = await parseAuthResponse(response);

  if (!response.ok || !data.ok) {
    throw new Error(data.ok ? "Invalid credentials" : data.error);
  }

  return data.user;
}

export async function logoutSession(): Promise<void> {
  await fetch("/api/auth/logout", {
    credentials: "include",
    method: "POST",
  });
}
