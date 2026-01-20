import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClerk, useAuth } from '@clerk/clerk-react';

import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Input } from '../ui/Primitives';
import { Icons } from '../ui/Icons';
import { useStore } from '../../store/useStore';

export const ProfileTab: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const { userId } = useAuth();

  const { user, logout, updateUser, setDashboardTab } = useStore();

  const [isSigningOut, setIsSigningOut] = useState(false);

  // Local state for form
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    bio: user.bio || 'Barbeiro',
  });

  const [avatarPreview, setAvatarPreview] = useState(user.avatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    updateUser({
      ...formData,
      avatarUrl: avatarPreview
    });
    alert("Informações salvas com sucesso!");
  };

  const handleLogout = useCallback(async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);

    try {
      // 1) Encerra a sessão REAL no Clerk
      // Se você preferir uma URL específica: await signOut({ redirectUrl: "/" });
      await signOut();
    } catch (err) {
      console.error("Erro ao fazer signOut do Clerk:", err);
      // Mesmo se o Clerk falhar por algum motivo, a gente limpa o estado local
    } finally {
      try {
        // 2) Limpa estado local do app
        logout();

        // 3) (Opcional) limpar flag de onboarding do usuário atual
        // Isso evita ficar preso em estado inconsistente.
        if (userId) {
          localStorage.removeItem(`stylohub:onboarding_completed:${userId}`);
        }

        // 4) Redirect
        navigate('/', { replace: true });
      } finally {
        setIsSigningOut(false);
      }
    }
  }, [isSigningOut, logout, navigate, signOut, userId]);

  // Generate stars for rating
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Icons.Star
        key={i}
        className={`w-4 h-4 ${i < Math.floor(rating) ? 'text-amber-500 fill-amber-500' : 'text-zinc-600'}`}
      />
    ));
  };

  return (
    <div className="space-y-6 animate-fade-in">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Profile Card */}
        <div className="space-y-6">
          <Card className="text-center border-zinc-800 bg-zinc-900/50">
            <CardContent className="pt-8 pb-8 flex flex-col items-center">

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
              />

              <div
                className="relative mb-4 group cursor-pointer"
                onClick={handleImageClick}
                title="Alterar foto de perfil"
              >
                <div className="w-32 h-32 rounded-full border-4 border-zinc-800 overflow-hidden relative">
                  <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover transition-opacity group-hover:opacity-75" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-medium">Alterar</span>
                  </div>
                </div>
                <div className="absolute bottom-1 right-1 bg-zinc-800 p-2 rounded-full text-zinc-300 group-hover:bg-amber-500 group-hover:text-black transition-colors shadow-lg border border-zinc-950">
                  <Icons.Camera className="w-4 h-4" />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-white mb-1">{formData.firstName} {formData.lastName}</h2>
              <Badge variant="gold" className="mb-3">{user.level}</Badge>

              <p className="text-zinc-400 text-sm max-w-[200px] italic mb-4">
                "{formData.bio}"
              </p>

              <div className="flex items-center gap-1 bg-zinc-800/50 px-3 py-1.5 rounded-lg">
                <span className="text-white font-bold">{user.rating}</span>
                <div className="flex">
                  {renderStars(user.rating || 0)}
                </div>
              </div>

              <div className="w-full mt-6 pt-6 border-t border-zinc-800 flex justify-between px-4">
                <div className="text-center">
                  <span className="block text-2xl font-bold text-amber-500">{user.xp}</span>
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">XP Total</span>
                </div>
                <div className="text-center">
                  {/* Mocking completed courses count for now */}
                  <span className="block text-2xl font-bold text-amber-500">5</span>
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">Cursos</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Card Mobile Only or Extra info */}
          <Card className="bg-gradient-to-r from-zinc-900 to-zinc-800 border-l-4 border-l-amber-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs font-medium">Próximo Nível</p>
                <p className="text-white font-bold">Lenda da Navalha</p>
              </div>
              <div className="text-right">
                <p className="text-zinc-500 text-xs">Faltam {user.nextLevelXp - user.xp} XP</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Edit & Settings */}
        <div className="lg:col-span-2 space-y-6">

          {/* Edit Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.User className="w-5 h-5 text-amber-500" />
                Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                />
                <Input
                  label="Sobrenome"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>

              <Input
                label="Bio (Frase curta)"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Ex: Barbeiro a 5 anos..."
              />

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Email</label>
                <div className="relative">
                  <Icons.Mail className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                  <input
                    className="flex h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900/50 pl-10 pr-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    value={formData.email}
                    onChange={handleChange}
                    name="email"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button variant="gold" onClick={handleSave}>
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.Settings className="w-5 h-5 text-zinc-400" />
                Configurações do Aplicativo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-zinc-800">
                <button className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors text-left">
                  <span className="text-zinc-300 font-medium">Notificações</span>
                  <div className="w-10 h-5 bg-amber-500 rounded-full relative">
                    <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm"></div>
                  </div>
                </button>
                <button className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors text-left">
                  <span className="text-zinc-300 font-medium">Tema Escuro</span>
                  <span className="text-zinc-500 text-sm">Ativado</span>
                </button>
                <button
                  onClick={() => setDashboardTab('privacy')}
                  className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors text-left"
                >
                  <span className="text-zinc-300 font-medium">Privacidade e Segurança</span>
                  <Icons.Settings className="w-4 h-4 text-zinc-500" />
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isSigningOut}
                  className={`w-full flex items-center justify-between p-4 transition-colors text-left group ${
                    isSigningOut ? 'opacity-60 cursor-not-allowed' : 'hover:bg-red-500/10'
                  }`}
                >
                  <span className="text-red-400 font-medium group-hover:text-red-500">
                    {isSigningOut ? 'Saindo...' : 'Sair da Conta'}
                  </span>
                  <Icons.LogOut className="w-4 h-4 text-red-400 group-hover:text-red-500" />
                </button>

              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};
