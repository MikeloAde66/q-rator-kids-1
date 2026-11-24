import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router";
import { Home, BookOpen, Sparkles, Download, Palette, Users, Film, Lock } from "lucide-react";
import { OnboardingGuard } from "./OnboardingGuard";
import { LoginModal } from "./LoginModal";
import { RegisterModal } from "./RegisterModal";
import { ForgotPasswordModal } from "./ForgotPasswordModal";
import { ProfileSwitcherModal } from "./ProfileSwitcherModal";
import { DownloadHistoryModal } from "./DownloadHistoryModal";
import { GrownUpGate } from "./GrownUpGate";
import { GrownUpMenu } from "./GrownUpMenu";
import { DemoDataGenerator } from "./DemoDataGenerator";
import { OfflineIndicator } from "./OfflineIndicator";
import { GuidedTour } from "./GuidedTour";
import { WelcomeModal } from "./WelcomeModal";
import { ModeIndicator } from "./ModeIndicator";
import { SkipLinks } from "./SkipLinks";
import { KeyboardShortcutsGuide } from "./KeyboardShortcutsGuide";
import { Logo } from "./Logo";
import { DarkModeToggle } from "./DarkModeToggle";
import { useAuth } from "../contexts/AuthContext";
import { getCharacterById } from "../data/characters";

export function Layout() {
  const location = useLocation();
  const { isAuthenticated, parentUser, activeChildProfile } = useAuth();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);
  const [showDownloadHistory, setShowDownloadHistory] = useState(false);
  const [showGrownUpGate, setShowGrownUpGate] = useState(false);
  const [showGrownUpMenu, setShowGrownUpMenu] = useState(false);
  const [grownUpUnlocked, setGrownUpUnlocked] = useState(false);

  // Kid-facing navigation only. Account, Dashboard, Settings, and Share
  // live behind the Grown-Ups gate (see GrownUpMenu) so kids never see them
  // in the everyday nav.
  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/create-and-color', icon: Palette, label: 'Paint!' },
    { path: '/lessons', icon: BookOpen, label: 'Lessons' },
    { path: '/stories', icon: Sparkles, label: 'Stories' },
    { path: '/entertainment', icon: Film, label: 'Videos' },
    { path: '/characters', icon: Users, label: 'Characters' },
    { path: '/assignments', icon: Download, label: 'Assignments' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const activeCharacter = activeChildProfile ? getCharacterById(activeChildProfile.favoriteCharacter) : undefined;

  const handleGrownUpClick = () => {
    if (grownUpUnlocked) {
      setShowGrownUpMenu(true);
    } else {
      setShowGrownUpGate(true);
    }
  };

  return (
    <OnboardingGuard>
      {/* Skip Links for Accessibility */}
      <SkipLinks />
      
      {/* Keyboard Shortcuts Guide */}
      <KeyboardShortcutsGuide />
      
      {/* Demo Data Generator - creates sample activity for testing */}
      <DemoDataGenerator />
      
      <div className="qrk-page-bg min-h-screen bg-[linear-gradient(135deg,#fbeca2_0%,#f9e4bb_33%,#f6dad1_66%,#f5d1e6_100%)]">
        {/* Header */}
        <header className="bg-white shadow-md sticky top-0 z-50" role="banner">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center" aria-label="Q Rator Kids Home">
                <Logo height={48} />
              </Link>

              {/* Mobile-only: discreet grown-ups entry + active child badge */}
              <div className="flex md:hidden items-center gap-2">
                {isAuthenticated && activeChildProfile && (
                  <button
                    onClick={() => setShowProfileSwitcher(true)}
                    className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-yellow-300 to-orange-300 rounded-xl border-2 border-white shadow-md"
                  >
                    {activeCharacter ? (
                      <span className="text-base">{activeCharacter.emoji}</span>
                    ) : (
                      <Users className="w-4 h-4 text-gray-800" />
                    )}
                    <span className="font-black text-gray-800 text-sm">{activeChildProfile.name}</span>
                  </button>
                )}
                <button
                  onClick={handleGrownUpClick}
                  title="For Grown-Ups"
                  aria-label="For Grown-Ups"
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                >
                  <Lock className="w-5 h-5" />
                </button>
              </div>

              {/* Desktop Navigation — kid-facing only */}
              <nav id="main-navigation" className="hidden md:flex items-center gap-6" aria-label="Main navigation">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                        active
                          ? 'bg-purple-100 text-purple-700 shadow-sm'
                          : 'text-gray-600 hover:bg-purple-50'
                      }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon className="w-5 h-5" aria-hidden="true" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}

                <div className="flex items-center gap-3 ml-4 pl-4 border-l-2 border-purple-200">
                  {/* Active child — tapping just switches sibling profiles, no gate needed */}
                  {isAuthenticated && activeChildProfile && (
                    <button
                      onClick={() => setShowProfileSwitcher(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-300 to-orange-300 rounded-xl hover:from-yellow-400 hover:to-orange-400 transition-all border-2 border-white shadow-md"
                    >
                      {activeCharacter ? (
                        <span className="text-lg">{activeCharacter.emoji}</span>
                      ) : (
                        <Users className="w-4 h-4 text-gray-800" />
                      )}
                      <span className="font-black text-gray-800">{activeChildProfile.name}</span>
                    </button>
                  )}

                  <DarkModeToggle />

                  {/* Small, discreet grown-ups-only entry point */}
                  <button
                    onClick={handleGrownUpClick}
                    title="For Grown-Ups"
                    aria-label="For Grown-Ups"
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                  >
                    <Lock className="w-5 h-5" />
                  </button>
                </div>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main id="main-content" className="max-w-7xl mx-auto px-4 py-8" role="main">
          <Outlet />
        </main>

        {/* Mobile Navigation — kid-facing only */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-purple-100 shadow-lg z-50" aria-label="Mobile navigation">
          <div className="flex items-center justify-around px-2 py-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                    active ? 'text-purple-600' : 'text-gray-500'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className={`w-6 h-6 ${active ? 'fill-purple-100' : ''}`} aria-hidden="true" />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom padding for mobile nav */}
        <div className="h-20 md:hidden" />
      </div>

      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Auth Modals */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSwitchToRegister={() => {
          setShowLoginModal(false);
          setShowRegisterModal(true);
        }}
        onSwitchToForgotPassword={() => {
          setShowLoginModal(false);
          setShowForgotPasswordModal(true);
        }}
      />

      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSwitchToLogin={() => {
          setShowRegisterModal(false);
          setShowLoginModal(true);
        }}
      />

      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
        onSwitchToLogin={() => {
          setShowForgotPasswordModal(false);
          setShowLoginModal(true);
        }}
      />

      <ProfileSwitcherModal
        isOpen={showProfileSwitcher}
        onClose={() => setShowProfileSwitcher(false)}
        onAddChild={() => {
          // TODO: Navigate to add child flow (could be part of onboarding or a separate flow)
          console.log('Add child profile');
        }}
      />

      <DownloadHistoryModal
        isOpen={showDownloadHistory}
        onClose={() => setShowDownloadHistory(false)}
      />

      <GrownUpGate
        isOpen={showGrownUpGate}
        onClose={() => setShowGrownUpGate(false)}
        onSuccess={() => {
          setGrownUpUnlocked(true);
          setShowGrownUpGate(false);
          setShowGrownUpMenu(true);
        }}
      />

      <GrownUpMenu
        isOpen={showGrownUpMenu}
        onClose={() => setShowGrownUpMenu(false)}
        onOpenLogin={() => setShowLoginModal(true)}
        onOpenRegister={() => setShowRegisterModal(true)}
      />

      {/* Tutorial Components */}
      <GuidedTour />
      <WelcomeModal />
      <ModeIndicator />
    </OnboardingGuard>
  );
}