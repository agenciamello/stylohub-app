import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SignIn, SignUp, useAuth } from "@clerk/clerk-react";

import { DashboardPage } from "./components/DashboardPage";
import { OnboardingQuiz } from "./components/onboarding/OnboardingQuiz";
import NotFoundPage from "./pages/NotFoundPage";

// 🔒 Garante que o usuário está logado
function RequireAuth({ children }: { children: JSX.Element }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// 🏠 Decide rota inicial com segurança
function HomeGate() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;

  return <Navigate to={isSignedIn ? "/app" : "/login"} replace />;
}

// 🧠 Decide onboarding pelo SERVIDOR (/api/me)
function RequireOnboarding({ children }: { children: JSX.Element }) {
  const { isLoaded, getToken } = useAuth();
  const [status, setStatus] = useState<"loading" | "needs" | "done">("loading");

  useEffect(() => {
    const run = async () => {
      if (!isLoaded) return;

      try {
        const token = await getToken();
        if (!token) {
          setStatus("done");
          return;
        }

        const resp = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!resp.ok) {
          setStatus("done");
          return;
        }

        const data = await resp.json();
        setStatus(data?.barber ? "done" : "needs");
      } catch {
        setStatus("done");
      }
    };

    run();
  }, [isLoaded, getToken]);

  if (!isLoaded || status === "loading") return null;

  if (status === "needs") {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

// 🚫 Bloqueia onboarding se já existir perfil
function BlockOnboardingIfDone({ children }: { children: JSX.Element }) {
  const { isLoaded, getToken } = useAuth();
  const [status, setStatus] = useState<"loading" | "needs" | "done">("loading");

  useEffect(() => {
    const run = async () => {
      if (!isLoaded) return;

      try {
        const token = await getToken();
        if (!token) {
          setStatus("needs");
          return;
        }

        const resp = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!resp.ok) {
          setStatus("needs");
          return;
        }

        const data = await resp.json();
        setStatus(data?.barber ? "done" : "needs");
      } catch {
        setStatus("needs");
      }
    };

    run();
  }, [isLoaded, getToken]);

  if (!isLoaded || status === "loading") return null;

  if (status === "done") {
    return <Navigate to="/app" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* HOME */}
        <Route path="/" element={<HomeGate />} />

        {/* AUTH */}
        <Route path="/login" element={<SignIn routing="path" path="/login" />} />
        <Route
          path="/cadastro"
          element={<SignUp routing="path" path="/cadastro" />}
        />

        {/* ONBOARDING */}
        <Route
          path="/onboarding"
          element={
            <RequireAuth>
              <BlockOnboardingIfDone>
                <OnboardingQuiz />
              </BlockOnboardingIfDone>
            </RequireAuth>
          }
        />

        {/* DASHBOARD */}
        <Route
          path="/app"
          element={
            <RequireAuth>
              <RequireOnboarding>
                <DashboardPage />
              </RequireOnboarding>
            </RequireAuth>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
