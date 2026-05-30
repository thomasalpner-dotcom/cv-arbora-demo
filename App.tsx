import React, { useState, useEffect } from 'react';
import { ResumeData, Participant, UserProfile, INITIAL_RESUME } from './types';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { Editor } from './components/Editor';
import { AdminPanel } from './components/AdminPanel';
import { SavaMatching } from './components/SavaMatching';
import { VerifyEmail } from './components/VerifyEmail';
import { LegacyResumeViewer } from './components/LegacyResumeViewer';
import { auth, db } from './firebase';
import { AuthService } from './services/AuthService';
import {
  getAllResumesFromDB, saveResumeToDB, deleteResumeFromDB,
  getAllParticipantsFromDB, saveParticipantToDB, deleteParticipantFromDB
} from './db';
import { SettingsService } from './services/SettingsService';
import { SystemSettings, INITIAL_SYSTEM_SETTINGS } from './types';


export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [impersonatedCoach, setImpersonatedCoach] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [view, setView] = useState<'landing' | 'dashboard' | 'editor' | 'admin' | 'matching' | 'verify-email' | 'legacy-viewer'>('landing');
  const [currentResume, setCurrentResume] = useState<ResumeData | null>(null);
  const [initialDocType, setInitialDocType] = useState<{ type: 'cv' | 'pb', id?: string } | undefined>(undefined);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(INITIAL_SYSTEM_SETTINGS);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  // Apply visual branding (Step 2 of White-labeling)
  useEffect(() => {
    if (systemSettings.primaryColor) {
      document.documentElement.style.setProperty('--primary-color', systemSettings.primaryColor);

      // Convert Hex to RGB for tailwind alpha support
      const hex = systemSettings.primaryColor.replace('#', '');
      if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
          document.documentElement.style.setProperty('--primary-rgb', `${r}, ${g}, ${b}`);
        }
      }
    }
  }, [systemSettings.primaryColor]);

  // Update document title (Branding)
  useEffect(() => {
    if (systemSettings.companyName) {
      document.title = `${systemSettings.companyName}.cv - Coach Plattform`;
    }
  }, [systemSettings.companyName]);

  // 1. Listen for Auth State
  useEffect(() => {
    const settingsUnsub = SettingsService.subscribe(setSystemSettings);
    let profileUnsubscribe: (() => void) | null = null;

    // --- FIREBASE AUTH ---
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setIsLoadingAuth(true);

      // Clean up previous listeners
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }

      if (firebaseUser) {
        setIsEmailVerified(firebaseUser.emailVerified);
        try {
          // First, get the user's profile to check their role
          const profileDoc = await db.collection('profiles').doc(firebaseUser.uid).get();
          const profileData = profileDoc.data() as UserProfile | undefined;
          const isAdmin = profileData?.role === 'admin';

          if (isAdmin) {
            // Admin: Listen to everything to keep 'user' and 'users' in sync
            profileUnsubscribe = db.collection('profiles').onSnapshot((snapshot) => {
              const allUsers = snapshot.docs.map(u => u.data() as UserProfile);
              setUsers(allUsers);

              const myProfile = allUsers.find(u => u.uid === firebaseUser.uid);
              if (myProfile) {
                console.log("Admin profile sync:", { photo: myProfile.photoUrl?.substring(0, 50) + "..." });
                setUser(myProfile);
              } else {
                // Fallback if doc doesn't exist yet
                const fallback: UserProfile = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || '',
                  displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Användare',
                  role: 'admin',
                  createdAt: new Date().toISOString(),
                  status: 'active',
                  lastLogin: new Date().toISOString()
                };
                setUser(fallback);
              }
              setIsLoadingAuth(false);
            }, (error) => {
              console.error("Profiles sync error:", error);
              setIsLoadingAuth(false);
            });
          } else {
            // Coach: Just listen to their own profile
            profileUnsubscribe = db.collection('profiles').doc(firebaseUser.uid).onSnapshot((doc) => {
              if (doc.exists) {
                const profile = doc.data() as UserProfile;
                console.log("Coach profile sync:", { photo: profile.photoUrl?.substring(0, 50) + "..." });
                setUser(profile);
              } else {
                const fallback: UserProfile = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || '',
                  displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Användare',
                  role: 'coach',
                  createdAt: new Date().toISOString(),
                  status: 'active',
                  lastLogin: new Date().toISOString()
                };
                setUser(fallback);
              }
              setIsLoadingAuth(false);
            }, (error) => {
              console.error("Profile sync error:", error);
              setIsLoadingAuth(false);
            });
          }

          // Update last login (use set with merge to ensure doc exists for new coaches)
          await db.collection('profiles').doc(firebaseUser.uid).set({
            lastLogin: new Date().toISOString()
          }, { merge: true }).catch(console.error);

        } catch (error) {
          console.error("Auth sync setup error:", error);
          setUser(null);
          setIsLoadingAuth(false);
        }
      } else {
        setUser(null);
        setIsLoadingAuth(false);
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
      settingsUnsub();
    };
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Real-time listeners for resumes and participants
  useEffect(() => {
    // Resumes listener
    const unsubscribeResumes = db.collection('resumes').onSnapshot((snapshot) => {
      const resumesData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as ResumeData[];

      console.log(`[App] Resumes updated: ${resumesData.length} total`);
      setResumes(resumesData);

      // Sync to IndexedDB for offline access
      resumesData.forEach(r => saveResumeToDB(r));
    }, (error) => {
      console.error('[App] Resumes listener error:', error);
    });

    // Participants listener
    const unsubscribeParticipants = db.collection('participants').onSnapshot((snapshot) => {
      const participantsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Participant[];

      console.log(`[App] Participants updated: ${participantsData.length} total`);
      setParticipants(participantsData);

      // Sync to IndexedDB for offline access
      participantsData.forEach(p => saveParticipantToDB(p));
    }, (error) => {
      console.error('[App] Participants listener error:', error);
    });

    // Cleanup listeners on unmount
    return () => {
      console.log('[App] Cleaning up listeners');
      unsubscribeResumes();
      unsubscribeParticipants();
    };
  }, []);

  useEffect(() => {
    if (user) {
      if (user.status === 'suspended') {
        alert("Ditt konto är avstängt. Kontakta administratör.");
        handleLogout();
      } else if (!isEmailVerified && !(user as any).isGuestAccount && !systemSettings.disableEmailVerification) {
        // Skip email verification for guest accounts or if disabled globally
        setView('verify-email');
      } else if (view === 'landing' || view === 'verify-email') {
        setView('dashboard');
      }
    } else if (!isLoadingAuth) {
      setView('landing');
    }
  }, [user, isLoadingAuth, isEmailVerified]);

  const handleLogout = async () => {
    await AuthService.logout();
    setUser(null);
    setImpersonatedCoach(null);
    setCurrentResume(null);
    setSelectedParticipantId(null);
    setView('landing');
  };

  const handleUpdateUsers = async (newUsers: UserProfile[]) => {
    // Determine which user changed by comparing with current users state
    // Or more reliably, just find the user that differs.
    // However, since we now have onSnapshot for users, we only need to write the change to Firestore.
    // The state will update automatically via the listener.

    // For now, to be safe and simple, find the ones that were changed and update THEM only.
    newUsers.forEach(async (u) => {
      const oldU = users.find(old => old.uid === u.uid);
      if (JSON.stringify(oldU) !== JSON.stringify(u)) {
        await db.collection('profiles').doc(u.uid).update(u);
      }
    });

    if (user && newUsers.find(u => u.uid === user.uid && u.status === 'suspended')) {
      handleLogout();
    }
  };

  const handleViewAsCoach = (coach: UserProfile) => {
    setImpersonatedCoach(coach);
    setView('dashboard');
  };

  const handleOpenResume = (r: ResumeData, docType?: { type: 'cv' | 'pb', id?: string }) => {
    setCurrentResume(r);
    setInitialDocType(docType);
    if (r.isLegacy) {
      setView('legacy-viewer');
    } else {
      setView('editor');
    }
  };

  const handleConvertLegacyResume = async (r: ResumeData) => {
    const updated = { ...r, isLegacy: false, lastEdited: new Date().toISOString() };
    await handleSaveResume(updated);
    setView('editor');
  };

  const stopImpersonation = () => {
    setImpersonatedCoach(null);
    setView('admin');
  };

  const handleSaveResume = async (data: ResumeData) => {
    // 1. Update local state – add if new, otherwise update existing
    setResumes(prev => {
      const exists = prev.some(r => r.id === data.id);
      if (exists) {
        return prev.map(r => r.id === data.id ? data : r);
      } else {
        return [data, ...prev]; // Ny post (t.ex. kopia) – lägg till i toppen
      }
    });

    // 2. Save to IndexedDB (Offline backup & Local Mode)
    await saveResumeToDB(data);

    // 3. Save to Firestore (Cloud sync)
    try {
      // Firestore doesn't allow undefined values, so we need to filter them out
      const sanitizedData = JSON.parse(JSON.stringify(data, (key, value) => value === undefined ? null : value));
      await db.collection('resumes').doc(data.id).set(sanitizedData, { merge: true });
      // Also store the ID of the last edited resume in localStorage for quick recovery
      localStorage.setItem('aventus_last_edited_cv', data.id);
    } catch (error) {
      console.error("Error saving resume to Firestore:", error);
    }
  };


  const handleDeleteResume = async (id: string) => {
    setResumes(prev => prev.filter(r => r.id !== id));
    await deleteResumeFromDB(id);

    await db.collection('resumes').doc(id).delete();
  };

  const handleCreateResume = async (pid: string) => {
    const effectiveUser = impersonatedCoach || user;
    if (!effectiveUser) return;

    const participant = participants.find(p => p.id === pid);
    const today = new Date().toISOString().split('T')[0];

    const autoTitle = participant
      ? `CV - ${participant.firstName} ${participant.lastName} - ${today}`
      : `Mitt CV - ${today}`;

    const newR = {
      ...INITIAL_RESUME,
      id: 'res_' + Date.now(),
      participantId: pid,
      createdBy: effectiveUser.uid,
      title: autoTitle,
      personal: {
        ...INITIAL_RESUME.personal,
        firstName: participant?.firstName || '',
        lastName: participant?.lastName || '',
        email: participant?.email || '',
        phone: participant?.phone || ''
      }
    };

    setResumes(prev => [newR, ...prev]);
    await saveResumeToDB(newR);
    setCurrentResume(newR);
    setView('editor');
  };

  const handleImportResume = async (data: ResumeData) => {
    setResumes(prev => [data, ...prev]);
    await saveResumeToDB(data);
    setCurrentResume(data);
    setView('editor');
  };

  const handleDuplicateResume = async (r: ResumeData) => {
    // Gör en djup kopia så att vi inte delar några referenser med originalet
    const rClone = JSON.parse(JSON.stringify(r));
    
    // Skapa ett unikt namn
    let baseTitle = r.title.replace(/ \(kopia( \d+)?\)$/, '');
    let copyNum = 1;
    let newTitle = `${baseTitle} (kopia)`;
    
    // Kontrollera om namnet redan finns och öka siffran tills det är unikt
    while (resumes.some(existing => existing.title === newTitle)) {
        copyNum++;
        newTitle = `${baseTitle} (kopia ${copyNum})`;
    }

    const dup = { 
      ...rClone, 
      id: 'res_' + Date.now(), 
      title: newTitle, 
      lastEdited: new Date().toISOString() 
    };
    
    // Spara omedelbart via handleSaveResume så den skickas till Firestore
    await handleSaveResume(dup);
  };

  const handleAddParticipant = async (p: Participant) => {
    setParticipants(prev => [p, ...prev]);
    await saveParticipantToDB(p);

    await db.collection('participants').doc(p.id).set(p);
  };

  const handleUpdateParticipant = async (p: Participant) => {
    setParticipants(prev => prev.map(old => old.id === p.id ? p : old));
    await saveParticipantToDB(p);

    await db.collection('participants').doc(p.id).set(p, { merge: true });
  };

  const handleDeleteParticipant = async (id: string) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
    await deleteParticipantFromDB(id);

    await db.collection('participants').doc(id).delete();
  };

  const handleVerified = () => {
    setIsEmailVerified(true);
    setView('dashboard');
  };

  if (view === 'verify-email' && user) {
    return (
      <VerifyEmail
        email={user.email}
        onVerified={handleVerified}
        onLogout={handleLogout}
        systemSettings={systemSettings}
      />
    );
  }

  if (view === 'admin' && user?.role === 'admin') {
    return (
      <AdminPanel
        users={users}
        resumes={resumes}
        participants={participants}
        onUpdateUsers={handleUpdateUsers}
        onBack={() => setView('dashboard')}
        onViewAsCoach={handleViewAsCoach}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        systemSettings={systemSettings}
      />
    );
  }

  if (view === 'editor' && currentResume) {
    return (
      <Editor
        resume={currentResume}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onLogout={handleLogout}
        onSave={handleSaveResume}
        onBack={() => setView('dashboard')}
        onDelete={handleDeleteResume}
        initialDocType={initialDocType}
        userProfile={user}
        systemSettings={systemSettings}
        participants={participants}
        onUpdateParticipant={handleUpdateParticipant}
      />
    );
  }

  if (view === 'matching' && user && (user.canUseMatching || user.role === 'admin')) {
    return (
      <SavaMatching
        userProfile={user}
        allResumes={resumes}
        allParticipants={participants}
        allUsers={users}
        onBack={() => setView('dashboard')}
        apiKey={systemSettings.geminiApiKey}
        geminiModel={systemSettings.geminiModel || 'gemini-1.5-flash'}
        matchingPrompt={systemSettings.savaMatchingPrompt}
        savaName={systemSettings.savaName}
        savaAvatarUrl={systemSettings.savaAvatarUrl}
        onViewResume={(r) => handleOpenResume(r)}
        isDarkMode={isDarkMode}
      />
    );
  }

  if (view === 'legacy-viewer' && currentResume) {
    return (
      <LegacyResumeViewer
        resume={currentResume}
        userProfile={user}
        systemSettings={systemSettings}
        onBack={() => setView('dashboard')}
        onConvert={handleConvertLegacyResume}
        isDarkMode={isDarkMode}
      />
    );
  }

  if (view === 'dashboard' && user) {
    const effectiveUser = impersonatedCoach || user;
    const isImpersonating = !!impersonatedCoach;

    return (
      <Dashboard
        systemSettings={systemSettings}
        resumes={resumes}
        participants={participants}
        userProfile={effectiveUser}
        selectedParticipantId={selectedParticipantId}
        onSelectParticipant={setSelectedParticipantId}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onLogout={handleLogout}
        onEdit={handleOpenResume}
        onCreate={handleCreateResume}
        onImport={handleImportResume}
        onDelete={handleDeleteResume}
        onUpdateResume={handleSaveResume}
        onDuplicate={handleDuplicateResume}
        onAddParticipant={handleAddParticipant}
        onUpdateParticipant={handleUpdateParticipant}
        onClaimParticipant={async () => true}
        onDeleteParticipant={handleDeleteParticipant}
        onOpenAdmin={() => setView('admin')}
        onOpenMatching={() => setView('matching')}
        isImpersonating={isImpersonating}
        onStopImpersonation={stopImpersonation}
      />
    );
  }

  return (
    <LandingPage
      isDarkMode={isDarkMode}
      toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      companyName={systemSettings.companyName}
      title={systemSettings.landingTitle?.replace(' hanterare', '')}
      subtitle={systemSettings.landingSubtitle}
      logoUrl={systemSettings.logoUrl}
    />
  );
}
