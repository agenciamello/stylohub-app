import { useState, useEffect, useCallback } from 'react';
import { User, Appointment, Course, AppointmentStatus, UserPreferences, Client, NotificationJob, InAppNotification } from '../types';
import { MOCK_USER, MOCK_APPOINTMENTS, MOCK_COURSES, MOCK_CLIENTS } from '../constants';

// View state management
export type ViewState = 'login' | 'signup' | 'onboarding' | 'dashboard';
export type DashboardTab = 'overview' | 'schedule' | 'finance' | 'academy' | 'profile' | 'clients' | 'certificates' | 'privacy';

const listeners: Set<() => void> = new Set();

const getInitialState = () => ({
  user: MOCK_USER,
  appointments: MOCK_APPOINTMENTS,
  courses: MOCK_COURSES,
  clients: MOCK_CLIENTS,
  notifications: [] as InAppNotification[],
  notificationJobs: [] as NotificationJob[],
  currentView: 'login' as ViewState,
  dashboardTab: 'overview' as DashboardTab, // Moved from local to global
});

let globalState = getInitialState();

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

export const useStore = () => {
  const [state, setState] = useState(globalState);

  useEffect(() => {
    const listener = () => setState({ ...globalState });
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const setCurrentView = useCallback((view: ViewState) => {
    globalState = { ...globalState, currentView: view };
    notifyListeners();
  }, []);

  const setDashboardTab = useCallback((tab: DashboardTab) => {
    globalState = { ...globalState, dashboardTab: tab };
    notifyListeners();
  }, []);

  const updateXP = useCallback((amount: number) => {
    globalState = {
      ...globalState,
      user: {
        ...globalState.user,
        xp: globalState.user.xp + amount
      }
    };
    notifyListeners();
  }, []);

  // --- Appointment Management Actions ---

  const createAppointment = useCallback((data: { 
    clientName: string; 
    service: string; 
    date: string; 
    time: string; 
    price: number; 
    cancellationAccepted: boolean;
  }) => {
    const id = Date.now().toString();
    const newAppt: Appointment = {
      id,
      clientName: data.clientName,
      service: data.service,
      date: data.date,
      time: data.time,
      price: data.price,
      duration: 45, // Default duration
      status: AppointmentStatus.SCHEDULED,
      avatarUrl: `https://picsum.photos/64/64?random=${id}`,
      cancellationAccepted: data.cancellationAccepted,
      createdAt: new Date().toISOString()
    };

    // Calculate timestamps for jobs
    const apptDateTimeStr = `${data.date}T${data.time}:00`;
    const apptTime = new Date(apptDateTimeStr).getTime();
    const now = Date.now();

    // Schedule Jobs
    const jobs: NotificationJob[] = [];
    
    // 1. Immediate confirmation request (mock)
    jobs.push({
      id: `job_${id}_confirm`,
      appointmentId: id,
      type: 'confirm_request',
      scheduledFor: now + 2000, // 2 seconds from now for demo
      processed: false
    });

    // 2. Reminder 24h before
    const time24h = apptTime - (24 * 60 * 60 * 1000);
    if (time24h > now) {
      jobs.push({
        id: `job_${id}_24h`,
        appointmentId: id,
        type: 'reminder_24h',
        scheduledFor: time24h,
        processed: false
      });
    }

    // 3. Reminder 2h before
    const time2h = apptTime - (2 * 60 * 60 * 1000);
    if (time2h > now) {
      jobs.push({
        id: `job_${id}_2h`,
        appointmentId: id,
        type: 'reminder_2h',
        scheduledFor: time2h,
        processed: false
      });
    }

    globalState = {
      ...globalState,
      appointments: [...globalState.appointments, newAppt],
      notificationJobs: [...globalState.notificationJobs, ...jobs]
    };
    notifyListeners();
  }, []);

  const confirmAppointment = useCallback((id: string) => {
    globalState = {
      ...globalState,
      appointments: globalState.appointments.map(a => 
        a.id === id ? { ...a, status: AppointmentStatus.CONFIRMED, confirmedAt: new Date().toISOString() } : a
      )
    };
    notifyListeners();
  }, []);

  const completeAppointment = useCallback((id: string) => {
    const appt = globalState.appointments.find(a => a.id === id);
    if (appt && appt.status !== AppointmentStatus.COMPLETED) {
      const updatedAppointments = globalState.appointments.map(a => 
        a.id === id ? { ...a, status: AppointmentStatus.COMPLETED } : a
      );
      
      globalState = {
        ...globalState,
        appointments: updatedAppointments,
      };
      notifyListeners();
      updateXP(50);
    }
  }, [updateXP]);

  const markNoShow = useCallback((id: string) => {
    globalState = {
      ...globalState,
      appointments: globalState.appointments.map(a => 
        a.id === id ? { ...a, status: AppointmentStatus.NO_SHOW } : a
      )
    };
    notifyListeners();
  }, []);

  const cancelAppointment = useCallback((id: string) => {
    globalState = {
      ...globalState,
      appointments: globalState.appointments.map(a => 
        a.id === id ? { ...a, status: AppointmentStatus.CANCELLED } : a
      )
    };
    notifyListeners();
  }, []);

  // --- Course Management ---
  
  const completeLesson = useCallback((courseId: string, moduleId: string, lessonId: string) => {
    const course = globalState.courses.find(c => c.id === courseId);
    if (!course) return;

    // Find the lesson to get XP reward
    let xpToAdd = 0;
    
    // Update the course structure deep copy
    const updatedCourses = globalState.courses.map(c => {
      if (c.id !== courseId) return c;

      const updatedModules = c.modules.map(m => {
        if (m.id !== moduleId) return m;

        const updatedLessons = m.lessons.map(l => {
          if (l.id === lessonId && !l.isCompleted) {
            xpToAdd = l.xpReward;
            return { ...l, isCompleted: true };
          }
          return l;
        });

        return { ...m, lessons: updatedLessons };
      });

      // Calculate new progress for the course
      let totalLessons = 0;
      let completedLessons = 0;
      
      updatedModules.forEach(m => {
        m.lessons.forEach(l => {
          totalLessons++;
          if (l.isCompleted) completedLessons++;
        });
      });

      const newProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      return { 
        ...c, 
        modules: updatedModules,
        progress: newProgress
      };
    });

    globalState = {
      ...globalState,
      courses: updatedCourses
    };
    
    notifyListeners();

    if (xpToAdd > 0) {
      updateXP(xpToAdd);
    }
  }, [updateXP]);

  // Deprecated simplified version, keeping for backward compat if needed, but not using for new UI
  const completeCourse = useCallback((id: string) => {
    // This logic is now mostly handled by individual lesson completion, 
    // but we can force 100% here if needed.
    globalState = {
      ...globalState,
      courses: globalState.courses.map(c => 
        c.id === id ? { ...c, progress: 100 } : c
      )
    };
    notifyListeners();
    updateXP(250);
  }, [updateXP]);

  // --- Notification System ---

  const processDueJobs = useCallback(() => {
    const now = Date.now();
    let hasChanges = false;
    const newNotifications: InAppNotification[] = [];
    
    const updatedJobs = globalState.notificationJobs.map(job => {
      if (!job.processed && job.scheduledFor <= now) {
        hasChanges = true;
        
        // Find appointment details
        const appt = globalState.appointments.find(a => a.id === job.appointmentId);
        if (!appt) return { ...job, processed: true };

        // Create Notification based on type
        let notifTitle = '';
        let notifMsg = '';
        let notifType: 'info' | 'warning' | 'alert' = 'info';

        if (job.type === 'confirm_request') {
          notifTitle = 'Confirmação Enviada';
          notifMsg = `Solicitação de confirmação enviada para ${appt.clientName}.`;
          notifType = 'info';
        } else if (job.type === 'reminder_24h') {
          notifTitle = 'Lembrete de Amanhã';
          notifMsg = `Lembrete de 24h enviado para ${appt.clientName}.`;
          notifType = 'info';
        } else if (job.type === 'reminder_2h') {
          notifTitle = 'Cliente Chegando';
          notifMsg = `Faltam 2h para o corte de ${appt.clientName}. Status atual: ${appt.status}`;
          notifType = appt.status !== AppointmentStatus.CONFIRMED ? 'warning' : 'info';
        }

        newNotifications.push({
          id: `notif_${Date.now()}_${job.id}`,
          title: notifTitle,
          message: notifMsg,
          type: notifType,
          timestamp: now,
          read: false,
          appointmentId: appt.id
        });

        return { ...job, processed: true };
      }
      return job;
    });

    if (hasChanges) {
      globalState = {
        ...globalState,
        notificationJobs: updatedJobs,
        notifications: [...newNotifications, ...globalState.notifications] // Prepend new
      };
      notifyListeners();
    }
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    globalState = {
      ...globalState,
      notifications: globalState.notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      )
    };
    notifyListeners();
  }, []);

  const clearAllNotifications = useCallback(() => {
    globalState = { ...globalState, notifications: [] };
    notifyListeners();
  }, []);

  // --- Existing Auth/User Logic ---

  const login = useCallback(() => {
    globalState = { ...globalState, currentView: 'dashboard' };
    notifyListeners();
  }, []);

  const logout = useCallback(() => {
    globalState = getInitialState();
    notifyListeners();
  }, []);

  const registerUser = useCallback((data: Partial<User>) => {
    globalState = {
      ...globalState,
      user: {
        ...globalState.user,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        city: data.city || '',
        level: 'Iniciante',
        xp: 0,
        nextLevelXp: 1000,
        bio: 'Novo Barbeiro',
        rating: 5.0
      },
      currentView: 'onboarding'
    };
    notifyListeners();
  }, []);

  const updateUser = useCallback((data: Partial<User>) => {
    globalState = {
      ...globalState,
      user: {
        ...globalState.user,
        ...data
      }
    };
    notifyListeners();
  }, []);

  const completeOnboarding = useCallback((preferences: UserPreferences) => {
    globalState = {
      ...globalState,
      user: {
        ...globalState.user,
        preferences: preferences
      },
      currentView: 'dashboard'
    };
    notifyListeners();
  }, []);

  const addClient = useCallback((clientData: { name: string; phone: string }) => {
    const newClient: Client = {
      id: Date.now().toString(),
      name: clientData.name,
      phone: clientData.phone,
      avatarUrl: `https://picsum.photos/64/64?random=${Date.now()}`,
      lastVisit: '-',
      totalVisits: 0,
      totalSpent: 0,
      notes: 'Novo cliente cadastrado.',
      history: []
    };
    globalState = {
      ...globalState,
      clients: [newClient, ...globalState.clients]
    };
    notifyListeners();
  }, []);

  return {
    // State
    user: state.user,
    appointments: state.appointments,
    courses: state.courses,
    clients: state.clients,
    notifications: state.notifications,
    currentView: state.currentView,
    dashboardTab: state.dashboardTab,
    
    // Actions
    setCurrentView,
    setDashboardTab,
    createAppointment,
    confirmAppointment,
    completeAppointment,
    markNoShow,
    cancelAppointment,
    updateXP,
    processDueJobs,
    markNotificationRead,
    clearAllNotifications,
    login,
    logout,
    registerUser,
    updateUser,
    completeOnboarding,
    addClient,
    completeCourse,
    completeLesson
  };
};
