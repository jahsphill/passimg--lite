/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User, RegisteredImage, VerificationEvent, SaleRecord } from './types';
import { 
  INITIAL_USERS, 
  INITIAL_IMAGES, 
  INITIAL_VERIFICATIONS, 
  INITIAL_SALES 
} from './initialData';
import { supabase, isSupabaseConfigured } from './supabase';

// Custom Modules
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import WalletView from './components/WalletView';
import ProfileView from './components/ProfileView';
import SettingsView from './components/SettingsView';
import AuthModal from './components/AuthModal';
import PersonalGallery from './components/PersonalGallery';
import Marketplace from './components/Marketplace';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import RegisterImage from './components/RegisterImage';
import VerifyImage from './components/VerifyImage';
import ImageComparisonTool from './components/ImageComparisonTool';
import Welcome from './components/Welcome';
import AuthPage from './components/AuthPage';
import Onboarding from './components/Onboarding';

// Lucide Icons
import { 
  ShieldAlert, 
  Info, 
  Layers, 
  HelpCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  Check,
  UserPlus
} from 'lucide-react';

export default function App() {
  // Navigation State
  const [currentPage, setCurrentPage] = useState<string>('welcome');
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState<boolean>(false);

  // Keep a mutable ref of currentPage to prevent closed-over stale state inside onAuthStateChange / getSession
  const currentPageRef = useRef<string>('welcome');
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);
  
  // Storage Key Core states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [registeredImages, setRegisteredImages] = useState<RegisteredImage[]>([]);
  const [verificationEvents, setVerificationEvents] = useState<VerificationEvent[]>([]);
  const [saleRecords, setSaleRecords] = useState<SaleRecord[]>([]);

  // Auth modals triggers
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset' | 'profile'>('login');
  
  // Custom Toasts for sandbox notifications
  const [toasts, setToasts] = useState<{ id: string; text: string; type: 'success' | 'warning' | 'info' }[]>([]);

  // Pre-selected image passed directly to Verify Image workflow
  const [preSelectedVerifyImage, setPreSelectedVerifyImage] = useState<RegisteredImage | null>(null);

  const handleNavigateToVerify = (image: RegisteredImage) => {
    setPreSelectedVerifyImage(image);
    setCurrentPage('verify_image');
  };

  // 1. Initial State Load from LocalStorage (or presets fallback)
  useEffect(() => {
    try {
      // Users Setup
      const cachedUsers = localStorage.getItem('passimg_users');
      if (cachedUsers) {
        const parsed = JSON.parse(cachedUsers);
        setAllUsers(parsed);
        if (!isSupabaseConfigured()) {
          // Default to the first creator profile (Elena) to let the user immediately experience features!
          const firstCreator = parsed.find((u: User) => u.id === 'usr_elena');
          setCurrentUser(firstCreator || parsed[0] || null);
        }
      } else {
        localStorage.setItem('passimg_users', JSON.stringify(INITIAL_USERS));
        setAllUsers(INITIAL_USERS);
        if (!isSupabaseConfigured()) {
          setCurrentUser(INITIAL_USERS[0]); // Elena default
        }
      }

      // Images Setup
      const cachedImages = localStorage.getItem('passimg_images');
      if (cachedImages && JSON.parse(cachedImages).length >= INITIAL_IMAGES.length) {
        setRegisteredImages(JSON.parse(cachedImages));
      } else {
        localStorage.setItem('passimg_images', JSON.stringify(INITIAL_IMAGES));
        setRegisteredImages(INITIAL_IMAGES);
      }

      // Audits Setup
      const cachedAudits = localStorage.getItem('passimg_verifications');
      if (cachedAudits) {
        setVerificationEvents(JSON.parse(cachedAudits));
      } else {
        localStorage.setItem('passimg_verifications', JSON.stringify(INITIAL_VERIFICATIONS));
        setVerificationEvents(INITIAL_VERIFICATIONS);
      }

      // Sales Setup
      const cachedSales = localStorage.getItem('passimg_sales');
      if (cachedSales) {
        setSaleRecords(JSON.parse(cachedSales));
      } else {
        localStorage.setItem('passimg_sales', JSON.stringify(INITIAL_SALES));
        setSaleRecords(INITIAL_SALES);
      }
    } catch (e) {
      console.error("Local storage initialization failed", e);
    }
  }, []);

  // Supabase Auth real-time session syncer and router triggers
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      console.log("[App] Supabase is not configured. Real-time session syncing is bypass-inactive.");
      return;
    }

    const syncSession = async () => {
      try {
        console.log("[App] syncSession: Initiating session handshake check with Supabase.");
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const user = session.user;
          console.log("[App] syncSession: Active session identified. User ID:", user.id);
          console.log("User authenticated");
          
          let profile = null;
          try {
            const { data: fetchedProfile, error: selectErr } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();

            if (selectErr || !fetchedProfile) {
              console.warn("[App] syncSession: Profile not found. Registering brand new profile fallback (non-blocking).", selectErr);
              const { data: upserted, error: upsertErr } = await supabase
                .from('profiles')
                .upsert({
                  id: user.id,
                  full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Authenticated Creator',
                  role: 'Photographer',
                  onboarding_completed: false
                })
                .select()
                .single();
              
              if (upsertErr) {
                console.error("[App] syncSession: Non-blocking profile registration upsert failed:", upsertErr);
              } else {
                console.log("[App] syncSession: Non-blocking profile successfully created.");
              }
              profile = upserted;
            } else {
              profile = fetchedProfile;
              console.log("[App] syncSession: Profile successfully resolved from DB:", profile);
            }
          } catch (profileCatchEx) {
            console.error("[App] syncSession: Non-blocking profile query threw exception:", profileCatchEx);
          }

          console.log("Profile fetched");

          const loggedUser: User = {
            id: user.id,
            name: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Authenticated Creator',
            email: user.email || '',
            bio: profile?.bio || 'PassIMG certified creator.',
            avatar: profile?.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80`,
            isAdmin: false,
            joinedAt: user.created_at || new Date().toISOString(),
            balance: profile?.balance ?? 100.0,
            onboardingRole: profile?.role || 'Photographer',
            onboardingCompleted: profile?.onboarding_completed ?? false
          };

          console.log("[App] syncSession: Set active currentUser state to parsed object:", loggedUser);
          setCurrentUser(loggedUser);
          setAllUsers(prev => {
            if (prev.some(u => u.id === loggedUser.id)) {
              return prev.map(u => u.id === loggedUser.id ? loggedUser : u);
            } else {
              return [...prev, loggedUser];
            }
          });

          // Determine page routing based on onboarding status
          if (loggedUser.onboardingCompleted) {
            console.log("Redirecting to dashboard");
            if (['welcome', 'signup_flow', 'onboarding'].includes(currentPageRef.current) || !['dashboard', 'register_image', 'verify_image', 'comparison_tool', 'gallery', 'marketplace', 'wallet', 'profile', 'settings', 'admin'].includes(currentPageRef.current)) {
              setCurrentPage('dashboard');
            }
          } else {
            console.log("Redirecting to onboarding");
            setCurrentPage('onboarding');
          }
        } else {
          console.log("[App] syncSession: No active session. Waiting on AuthPage.");
        }
      } catch (err) {
        console.error("[App] Error fetching or establishing Supabase session state:", err);
      }
    };

    syncSession();

    console.log("[App] Subscribing to Supabase onAuthStateChange handlers.");
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[App] onAuthStateChange event received:", event, "session user present:", !!session);
      
      if (session) {
        const user = session.user;
        try {
          console.log("[App] onAuthStateChange: session user found. Loading details from profiles.");
          console.log("User authenticated");
          let profile = null;
          try {
            const { data: fetchedProfile, error: selectErr } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();

            if (selectErr || !fetchedProfile) {
              console.warn("[App] onAuthStateChange: Profile not found. Inserting default (non-blocking).", selectErr);
              const { data: upserted, error: upsertErr } = await supabase
                .from('profiles')
                .upsert({
                  id: user.id,
                  full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Authenticated Creator',
                  role: 'Photographer',
                  onboarding_completed: false
                })
                .select()
                .single();

              if (upsertErr) {
                console.error("[App] onAuthStateChange: Profile upsert error:", upsertErr);
              } else {
                console.log("[App] onAuthStateChange: Profile successfully registered schema.");
              }
              profile = upserted;
            } else {
              profile = fetchedProfile;
              console.log("[App] onAuthStateChange: Profile successfully loaded.");
            }
          } catch (profileEx) {
            console.error("[App] onAuthStateChange: Catch profile flow exception:", profileEx);
          }

          console.log("Profile fetched");

          const loggedUser: User = {
            id: user.id,
            name: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Authenticated Creator',
            email: user.email || '',
            bio: profile?.bio || 'PassIMG certified creator.',
            avatar: profile?.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80`,
            isAdmin: false,
            joinedAt: user.created_at || new Date().toISOString(),
            balance: profile?.balance ?? 100.0,
            onboardingRole: profile?.role || 'Photographer',
            onboardingCompleted: profile?.onboarding_completed ?? false
          };

          setCurrentUser(loggedUser);
          setAllUsers(prev => {
            if (prev.some(u => u.id === loggedUser.id)) {
              return prev.map(u => u.id === loggedUser.id ? loggedUser : u);
            } else {
              return [...prev, loggedUser];
            }
          });

          if (loggedUser.onboardingCompleted) {
            console.log("Redirecting to dashboard");
            if (['welcome', 'signup_flow', 'onboarding'].includes(currentPageRef.current) || !['dashboard', 'register_image', 'verify_image', 'comparison_tool', 'gallery', 'marketplace', 'wallet', 'profile', 'settings', 'admin'].includes(currentPageRef.current)) {
              setCurrentPage('dashboard');
            }
          } else {
            console.log("Redirecting to onboarding");
            setCurrentPage('onboarding');
          }
        } catch (err) {
          console.error("[App] Authentication state change setup failed during user synchronization:", err);
        }
      } else {
        console.log("[App] onAuthStateChange: Session is null.");
        setCurrentUser(null);
        if (!['welcome', 'signup_flow'].includes(currentPageRef.current)) {
          console.log("[App] onAuthStateChange: No Session. Redirect to welcome.");
          setCurrentPage('welcome');
        }
      }
    });

    return () => {
      console.log("[App] Cleaning up Supabase onAuthStateChange subscriptions.");
      subscription.unsubscribe();
    };
  }, []);

  // 2. Helper triggers for toasts
  const addToast = (text: string, type: 'success' | 'warning' | 'info' = 'success') => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // 3. Sync State back to local storage on changes
  const handleUpdateUsersList = (updatedUsers: User[]) => {
    setAllUsers(updatedUsers);
    localStorage.setItem('passimg_users', JSON.stringify(updatedUsers));
  };

  const handleUpdateImagesList = (updatedImages: RegisteredImage[]) => {
    setRegisteredImages(updatedImages);
    localStorage.setItem('passimg_images', JSON.stringify(updatedImages));
  };

  const handleUpdateVerificationsList = (updatedAudits: VerificationEvent[]) => {
    setVerificationEvents(updatedAudits);
    localStorage.setItem('passimg_verifications', JSON.stringify(updatedAudits));
  };

  const handleUpdateSalesList = (updatedSales: SaleRecord[]) => {
    setSaleRecords(updatedSales);
    localStorage.setItem('passimg_sales', JSON.stringify(updatedSales));
  };

  // --- Core Operation Relays ---

  // Handle Auth selectors
  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    addToast(`Switched profile view to: ${user.name}`, 'info');
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setCurrentPage('welcome');
    addToast("Logged out of session. Accessing restricted content is restricted.", "warning");
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // Sync to users pool if novel
    const userExists = allUsers.some(u => u.id === user.id);
    if (!userExists) {
      const newList = [...allUsers, user];
      handleUpdateUsersList(newList);
    }
    addToast(`Successfully logged in as ${user.name}!`, 'success');
  };

  const handleSignUp = (user: User) => {
    const newList = [...allUsers, user];
    handleUpdateUsersList(newList);
  };

  const handleUpdateProfile = (user: User) => {
    setCurrentUser(user);
    const updatedPool = allUsers.map(u => u.id === user.id ? user : u);
    handleUpdateUsersList(updatedPool);

    if (isSupabaseConfigured()) {
      supabase
        .from('profiles')
        .update({
          full_name: user.name,
          role: user.onboardingRole,
          bio: user.bio,
          avatar: user.avatar
        })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) console.error("Error setting custom profile inside Supabase:", error);
        });
    }

    addToast("Creator profile successfully modified!", "success");
  };

  const handleCompleteOnboarding = (data: { onboardingRole: string; bio: string; avatar: string; }) => {
    if (!currentUser) return;
    const updatedUser = {
      ...currentUser,
      onboardingRole: data.onboardingRole,
      bio: data.bio,
      avatar: data.avatar,
      onboardingCompleted: true
    };
    // Sync to user pool
    setCurrentUser(updatedUser);
    const updatedPool = allUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
    handleUpdateUsersList(updatedPool);

    if (isSupabaseConfigured()) {
      supabase
        .from('profiles')
        .update({
          role: data.onboardingRole,
          bio: data.bio,
          avatar: data.avatar,
          onboarding_completed: true
        })
        .eq('id', currentUser.id)
        .then(({ error }) => {
          if (error) console.error("Error completing onboarding inside Supabase database profiles:", error);
        });
    }

    addToast("Welcome onboarding complete! Your workspace has been configured.", "success");
    setCurrentPage('dashboard');
  };

  // User wallet balance modifiers
  const handleSimulateBalanceAdjust = (userId: string, quantity: number) => {
    const updatedPool = allUsers.map(u => {
      if (u.id === userId) {
        const nextBalance = Math.max(0, u.balance + quantity);
        if (currentUser && currentUser.id === userId) {
          setCurrentUser({ ...currentUser, balance: nextBalance });
        }
        return { ...u, balance: nextBalance };
      }
      return u;
    });
    handleUpdateUsersList(updatedPool);
  };

  // Register image action
  const handleRegisterImage = (img: RegisteredImage) => {
    const updatedImages = [img, ...registeredImages];
    handleUpdateImagesList(updatedImages);
    addToast("Asset SHA-256 certificate registered on Ledger!", "success");
  };

  // Add Verification event audit log
  const handleAddVerificationEvent = (event: VerificationEvent) => {
    const updatedEvents = [event, ...verificationEvents];
    handleUpdateVerificationsList(updatedEvents);
    
    // Increment verification counter on the target image if relevant
    if (event.imageId) {
      const updatedImages = registeredImages.map(img => {
        if (img.id === event.imageId) {
          const nextCount = img.verificationCount + 1;
          const nextScore = Math.min(100, img.popularityScore + 1);
          return { ...img, verificationCount: nextCount, popularityScore: nextScore };
        }
        return img;
      });
      handleUpdateImagesList(updatedImages);
    }

    if (event.status === 'verified') {
      addToast(`Image audit successful: 100% hash match on ${event.imageTitle.substring(0, 15)}...`, "success");
    } else {
      addToast(`Integrity Check mismatched on uploaded copy!`, "warning");
    }
  };

  // Buy listed image
  const handleBuyListing = (record: SaleRecord) => {
    // Add transaction list
    const updatedTransactions = [record, ...saleRecords];
    handleUpdateSalesList(updatedTransactions);

    // Update sales score on image
    const updatedImages = registeredImages.map(img => {
      if (img.id === record.imageId) {
        const nextSellerCount = img.salesCount + 1;
        const nextScore = Math.min(100, img.popularityScore + 5);
        return { ...img, salesCount: nextSellerCount, popularityScore: nextScore };
      }
      return img;
    });
    handleUpdateImagesList(updatedImages);
    addToast(`Acquired publishing license for: ${record.imageTitle}`, 'success');
  };

  // Delete Image from ledger
  const handleDeleteImage = (id: string) => {
    const updated = registeredImages.filter(img => img.id !== id);
    handleUpdateImagesList(updated);
    addToast(`Certification signature deleted from Gallery.`, "warning");
  };

  // Update Image metadata properties (e.g., license values, title descriptions)
  const handleUpdateImage = (img: RegisteredImage) => {
    const updated = registeredImages.map(item => item.id === img.id ? img : item);
    handleUpdateImagesList(updated);
    addToast(`Asset properties updated: ${img.title.substring(0, 15)}...`, "success");
  };

  // Admin content removal (DMCA Takedown audits)
  const handleAdminTakedownContent = (imgId: string) => {
    const updated = registeredImages.filter(img => img.id !== imgId);
    handleUpdateImagesList(updated);
    addToast("Administrator Action: Copyright violating image purged.", "warning");
  };



  return (
    <div className="min-h-screen text-slate-200 font-sans antialiased flex flex-col justify-between relative z-10 bg-[#020509]">
      <div className="mesh-bg"></div>

      {/* Primary Header Navbar */}
      <Header
        currentUser={currentUser}
        allUsers={allUsers}
        onSelectUser={handleSelectUser}
        onLogout={handleLogout}
        onOpenProfile={() => {
          setCurrentPage('profile');
        }}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />

      {currentUser && currentUser.onboardingCompleted ? (
        <div className="mx-auto max-w-7xl w-full flex-1 flex flex-col md:flex-row gap-8 px-4 py-8 sm:px-6 lg:px-8">
          {/* Persistent left sidebar layout */}
          <Sidebar
            currentUser={currentUser}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            isOpenMobile={isSidebarOpenMobile}
            setIsOpenMobile={setIsSidebarOpenMobile}
          />

          {/* Main workspace sub-views on right */}
          <main className="flex-1 min-w-0">
            {currentPage === 'dashboard' && (
              <Dashboard
                currentUser={currentUser}
                registeredImages={registeredImages}
                verificationEvents={verificationEvents}
                saleRecords={saleRecords}
                onTriggerAuth={() => {
                  setAuthMode('login');
                  setIsAuthOpen(true);
                }}
                onUpdateImage={handleUpdateImage}
              />
            )}

            {currentPage === 'register_image' && (
              <RegisterImage
                currentUser={currentUser}
                onRegisterImage={handleRegisterImage}
                onTriggerAuth={() => {
                  setAuthMode('login');
                  setIsAuthOpen(true);
                }}
                onNavigateToGallery={() => setCurrentPage('gallery')}
                setCurrentPage={setCurrentPage}
                addToast={addToast}
                onNavigateToVerify={handleNavigateToVerify}
              />
            )}

            {currentPage === 'verify_image' && (
              <VerifyImage
                currentUser={currentUser}
                registeredImages={registeredImages}
                onAddVerificationEvent={handleAddVerificationEvent}
                onUpdateImage={handleUpdateImage}
                preSelectedImage={preSelectedVerifyImage}
                onClearPreSelected={() => setPreSelectedVerifyImage(null)}
                onNavigateToGallery={() => setCurrentPage('gallery')}
                setCurrentPage={setCurrentPage}
                addToast={addToast}
              />
            )}

            {currentPage === 'comparison_tool' && (
              <ImageComparisonTool
                currentUser={currentUser}
                registeredImages={registeredImages}
                verificationEvents={verificationEvents}
                onAddVerificationEvent={handleAddVerificationEvent}
                onUpdateImage={handleUpdateImage}
                setCurrentPage={setCurrentPage}
                addToast={addToast}
              />
            )}

            {currentPage === 'gallery' && (
              <PersonalGallery
                currentUser={currentUser}
                registeredImages={registeredImages}
                verificationEvents={verificationEvents}
                onTriggerAuth={() => {
                  setAuthMode('login');
                  setIsAuthOpen(true);
                }}
                onUpdateImage={handleUpdateImage}
                onDeleteImage={handleDeleteImage}
                onNavigateToVerify={handleNavigateToVerify}
              />
            )}

            {currentPage === 'marketplace' && (
              <Marketplace
                currentUser={currentUser}
                registeredImages={registeredImages}
                verificationEvents={verificationEvents}
                onBuyListing={handleBuyListing}
                onTriggerAuth={() => {
                  setAuthMode('login');
                  setIsAuthOpen(true);
                }}
                onTriggerBalanceRefresh={handleSimulateBalanceAdjust}
                onAddSystemLog={(msg) => addToast(msg, 'info')}
              />
            )}

            {currentPage === 'wallet' && (
              <WalletView
                currentUser={currentUser}
                saleRecords={saleRecords}
                onTriggerBalanceAdjust={handleSimulateBalanceAdjust}
                addToast={addToast}
              />
            )}

            {currentPage === 'profile' && (
              <ProfileView
                currentUser={currentUser}
                onUpdateProfile={handleUpdateProfile}
                addToast={addToast}
              />
            )}

            {currentPage === 'settings' && (
              <SettingsView
                currentUser={currentUser}
                addToast={addToast}
              />
            )}

            {currentPage === 'admin' && (
              <AdminDashboard
                currentUser={currentUser}
                allUsers={allUsers}
                registeredImages={registeredImages}
                verificationEvents={verificationEvents}
                saleRecords={saleRecords}
                onTriggerAuth={() => {
                  setAuthMode('login');
                  setIsAuthOpen(true);
                }}
                onUpdateUser={(updatedUsr) => {
                  const pool = allUsers.map(u => u.id === updatedUsr.id ? updatedUsr : u);
                  handleUpdateUsersList(pool);
                  if (currentUser && currentUser.id === updatedUsr.id) {
                    setCurrentUser(updatedUsr);
                  }
                }}
                onRemoveFraudulentImage={handleAdminTakedownContent}
                onAddSystemLog={(msg) => addToast(msg, 'success')}
              />
            )}

            {/* In case user clicks back to welcome or auth without logging out */}
            {(currentPage === 'welcome' || currentPage === 'signup_flow' || currentPage === 'onboarding') && (
              <div className="py-12 text-center space-y-4">
                <h3 className="text-xl font-bold text-white">Active Session Detected</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">You are logged in of this terminal block. Double-check Workspace modules or sign-out to return to portal.</p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => setCurrentPage('dashboard')}
                    className="rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-4 py-2 text-xs cursor-pointer"
                  >
                    Return to Dashboard
                  </button>
                  <button
                    onClick={handleLogout}
                    className="rounded-lg bg-white/5 hover:bg-white/10 text-slate-350 px-4 py-2 text-xs border border-white/5 cursor-pointer"
                  >
                    Sign Out Session
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      ) : (
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {currentPage === 'welcome' && (
            <Welcome onGetStarted={() => setCurrentPage('signup_flow')} />
          )}

          {currentPage === 'signup_flow' && (
            <AuthPage
              allUsers={allUsers}
              onLogin={handleLogin}
              onSignUp={handleSignUp}
              onNavigateToWelcome={() => setCurrentPage('welcome')}
              onRedirectToOnboarding={() => {
                addToast("Sign up verified! Opening Onboarding configuration...", "success");
                setCurrentPage('onboarding');
              }}
              onRedirectToDashboard={() => {
                addToast("Access validated! Redirecting to Dashboard...", "success");
                setCurrentPage('dashboard');
              }}
            />
          )}

          {currentPage === 'onboarding' && (
            <Onboarding 
              currentUser={currentUser}
              onComplete={handleCompleteOnboarding}
            />
          )}

          {/* Fallback secure login prompts */}
          {!['welcome', 'signup_flow', 'onboarding'].includes(currentPage) && (
            <div className="py-12 flex justify-center">
              <div className="text-center space-y-4">
                <h2 className="text-lg font-bold text-white">Security Block: Authentication Required</h2>
                <p className="text-xs text-zinc-400 max-w-sm">Please register or log in to explore images authentication registries, personal galleries, and marketplace trades.</p>
                <button
                  onClick={() => setCurrentPage('signup_flow')}
                  className="rounded-lg bg-indigo-650 bg-indigo-600 hover:bg-indigo-505 text-white font-semibold px-4 py-2 text-xs cursor-pointer"
                >
                  Go to Signup/Login
                </button>
              </div>
            </div>
          )}
        </main>
      )}

    {/* Global Interactive Auth Overlay Modal */}
    <AuthModal
      isOpen={isAuthOpen}
      onClose={() => setIsAuthOpen(false)}
      currentUser={currentUser}
      allUsers={allUsers}
      onLogin={handleLogin}
      onSignUp={handleSignUp}
      onUpdateProfile={handleUpdateProfile}
      initialMode={authMode}
    />

    {/* Global Toast Alert Toasts panel */}
    <div className="fixed bottom-6 right-6 z-55 flex flex-col space-y-2 pointer-events-none" id="toasts-hub" style={{ zIndex: 100 }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          id={toast.id}
          className={`pointer-events-auto rounded-xl border p-3.5 shadow-lg max-w-sm flex items-start space-x-2.5 bg-zinc-900/95 backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-4 ${
            toast.type === 'success' 
              ? 'border-teal-500/20 text-teal-400' 
              : toast.type === 'warning'
              ? 'border-rose-500/20 text-rose-455 text-rose-400'
              : 'border-zinc-800 text-blue-400'
          }`}
        >
          <div className="rounded-full p-0.5 shrink-0 bg-white/5">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <p className="text-[11px] font-medium leading-snug text-white">{toast.text}</p>
        </div>
      ))}
    </div>

    {/* Footer Branding of Platform */}
    <footer className="border-t border-white/5 bg-[#030508] py-6 text-center text-[11px] text-slate-500">
      <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>© 2026 PassIMG Lite Inc. Secured with dynamic browser checksum hashing matching specifications.</p>
        <div className="flex space-x-4">
          <span className="hover:text-slate-300 cursor-pointer">Security Standards</span>
          <span className="hover:text-slate-300 cursor-pointer">W3C Copyright Verifier</span>
          <span className="hover:text-slate-300 cursor-pointer">Help Center</span>
        </div>
      </div>
    </footer>
    </div>
  );
}
