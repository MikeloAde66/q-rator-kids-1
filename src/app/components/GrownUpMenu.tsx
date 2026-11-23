import { Link } from 'react-router';
import { User, BarChart3, Settings, Share2, LogOut, LogIn, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';

interface GrownUpMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
}

export function GrownUpMenu({ isOpen, onClose, onOpenLogin, onOpenRegister }: GrownUpMenuProps) {
  const { isAuthenticated, parentUser, logout } = useAuth();

  const handleLogout = () => {
    logout();
    onClose();
  };

  const items = isAuthenticated && parentUser
    ? [
        { to: '/account', icon: User, label: 'Account' },
        { to: '/dashboard', icon: BarChart3, label: 'Dashboard' },
        { to: '/settings', icon: Settings, label: 'Settings' },
        { to: '/share', icon: Share2, label: 'Share & Rewards' },
      ]
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden rounded-3xl border-4 border-gray-300">
        <div className="bg-gradient-to-br from-gray-700 to-gray-900 p-6 text-white text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              {isAuthenticated && parentUser ? `Hi, ${parentUser.firstName}` : 'For Parents'}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-3">
          {isAuthenticated && parentUser ? (
            <>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.to} to={item.to} onClick={onClose}>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 text-base font-bold py-6 rounded-2xl border-2"
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full justify-start gap-3 text-base font-bold py-6 rounded-2xl border-2 text-red-600 border-red-200 hover:bg-red-50"
              >
                <LogOut className="w-5 h-5" />
                Log Out
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => {
                  onClose();
                  onOpenLogin();
                }}
                variant="outline"
                className="w-full justify-start gap-3 text-base font-bold py-6 rounded-2xl border-2"
              >
                <LogIn className="w-5 h-5" />
                Log In
              </Button>
              <Button
                onClick={() => {
                  onClose();
                  onOpenRegister();
                }}
                className="w-full justify-start gap-3 text-base font-bold py-6 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
              >
                <UserPlus className="w-5 h-5" />
                Create Parent Account
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
