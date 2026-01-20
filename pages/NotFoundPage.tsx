import React from "react";
import { useNavigate } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-6">
      <div className="max-w-xl w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 mb-6">
          <span className="text-2xl font-bold">404</span>
        </div>

        <h1 className="text-3xl font-bold mb-3">Página não encontrada</h1>
        <p className="text-zinc-400 mb-8">
          A rota que você tentou acessar não existe, foi movida ou você digitou
          errado.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition"
          >
            Voltar
          </button>

          <SignedIn>
            <button
              onClick={() => navigate("/app", { replace: true })}
              className="px-4 py-2 rounded-xl bg-amber-500 text-black font-semibold hover:brightness-110 transition"
            >
              Ir para o Dashboard
            </button>
          </SignedIn>

          <SignedOut>
            <button
              onClick={() => navigate("/login", { replace: true })}
              className="px-4 py-2 rounded-xl bg-amber-500 text-black font-semibold hover:brightness-110 transition"
            >
              Fazer login
            </button>
          </SignedOut>
        </div>

        <div className="mt-8 text-xs text-zinc-600">
          Dica: se você abriu um link antigo, tente voltar para a página inicial.
        </div>
      </div>
    </div>
  );
}
