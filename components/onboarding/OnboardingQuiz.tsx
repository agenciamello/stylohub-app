import React, { useMemo, useState } from 'react';
import { Button, Card, CardContent } from '../ui/Primitives';
import { Icons } from '../ui/Icons';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';

export const OnboardingQuiz: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();

  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const [answers, setAnswers] = useState({
    avgPrice: 40,
    clientsPerDay: 5,
    daysPerWeek: 5,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const dashboardPath = '/app'; // <-- TROQUE AQUI se seu dashboard for /app

  const storageKey = useMemo(() => {
    // flag por usuário (não “global”)
    const id = user?.id ?? 'anonymous';
    return `stylohub:onboarding_completed:${id}`;
  }, [user?.id]);

  const handleNext = async () => {
    setSaveError(null);

    if (step < totalSteps) {
      setStep(step + 1);
      return;
    }

    // Finalizar: salva no banco primeiro (evita loop no dashboard)
    try {
      setIsSaving(true);

      const token = await getToken();
      if (!token) {
        throw new Error('Sem token de autenticação. Faça login novamente.');
      }

      const payload = {
        avgPrice: answers.avgPrice,
        clientsPerDay: answers.clientsPerDay,
        daysPerWeek: answers.daysPerWeek,
        firstName: user?.firstName ?? '',
        fullName: user?.fullName ?? '',
        email: user?.primaryEmailAddress?.emailAddress ?? '',
      };

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Falha ao salvar onboarding (${res.status}). ${text}`);
      }

      // Só depois que o backend confirmar, marca localmente
      localStorage.setItem(storageKey, 'true');

      // (opcional) também salvar as respostas localmente
      localStorage.setItem(
        `stylohub:onboarding_answers:${user?.id ?? 'anonymous'}`,
        JSON.stringify(answers)
      );

      // navega de verdade
      navigate(dashboardPath, { replace: true });
    } catch (err: any) {
      setSaveError(err?.message ?? 'Erro ao salvar onboarding.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-zinc-400">
        Carregando...
      </div>
    );
  }

  // Se por algum motivo caiu aqui sem login
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-zinc-400">
        Você precisa estar logado para continuar.
      </div>
    );
  }

  const firstName = user?.firstName || user?.fullName?.split(' ')?.[0] || 'bem-vindo';

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Progress top bar */}
      <div className="absolute top-0 left-0 w-full h-2 bg-zinc-900">
        <div
          className="h-full bg-amber-500 transition-all duration-500"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-amber-500/5 blur-[80px]" />
      </div>

      <Card className="w-full max-w-xl bg-zinc-900 border-zinc-800 shadow-2xl relative z-10 animate-slide-in">
        <CardContent className="p-8 md:p-12">
          <div className="mb-8">
            <span className="text-amber-500 font-mono text-xs tracking-wider uppercase mb-2 block">
              Passo {step} de {totalSteps}
            </span>

            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {step === 1 && `Olá, ${firstName}!`}
              {step === 2 && 'Sua rotina'}
              {step === 3 && 'Metas Financeiras'}
            </h2>

            <p className="text-zinc-400 text-lg">
              {step === 1 &&
                'Vamos configurar o StyloHub para a sua realidade. Qual é o preço médio do seu corte hoje?'}
              {step === 2 && 'Quantos dias por semana você costuma trabalhar na barbearia?'}
              {step === 3 && 'Em média, quantos clientes você atende por dia?'}
            </p>

            {saveError && (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200">
                {saveError}
              </div>
            )}
          </div>

          <div className="space-y-8 min-h-[120px]">
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-4">
                  <span className="text-4xl font-bold text-white">R$ {answers.avgPrice}</span>
                </div>

                <input
                  type="range"
                  min="10"
                  max="150"
                  step="5"
                  value={answers.avgPrice}
                  onChange={(e) => setAnswers({ ...answers, avgPrice: Number(e.target.value) })}
                  className="w-full h-3 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />

                <div className="flex justify-between text-zinc-500 text-sm">
                  <span>R$ 10</span>
                  <span>R$ 150+</span>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-7 gap-2 animate-fade-in">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <button
                    key={day}
                    onClick={() => setAnswers({ ...answers, daysPerWeek: day })}
                    className={`h-14 rounded-xl font-bold text-lg transition-all ${
                      answers.daysPerWeek === day
                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 scale-110'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {day}
                  </button>
                ))}
                <p className="col-span-7 text-center text-zinc-500 text-sm mt-2">Dias por semana</p>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setAnswers((p) => ({ ...p, clientsPerDay: Math.max(1, p.clientsPerDay - 1) }))
                    }
                    disabled={isSaving}
                  >
                    -
                  </Button>

                  <span className="text-5xl font-bold text-white w-20 text-center">
                    {answers.clientsPerDay}
                  </span>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setAnswers((p) => ({ ...p, clientsPerDay: Math.min(30, p.clientsPerDay + 1) }))
                    }
                    disabled={isSaving}
                  >
                    +
                  </Button>
                </div>

                <p className="text-center text-zinc-500">Clientes/dia</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-12 pt-6 border-t border-zinc-800/50">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1 || isSaving}
              className={step === 1 ? 'opacity-0 pointer-events-none' : ''}
            >
              Voltar
            </Button>

            <Button variant="gold" onClick={handleNext} className="px-8" disabled={isSaving}>
              {step === totalSteps ? (isSaving ? 'Salvando...' : 'Finalizar Configuração') : 'Próximo'}
              <Icons.ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
