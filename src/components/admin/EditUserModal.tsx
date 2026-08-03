import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface User {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onUserUpdated: (userId: string, firstName: string, lastName: string) => void;
}

const EditUserModal = ({ open, onOpenChange, user, onUserUpdated }: EditUserModalProps) => {
  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setFirstName(user.first_name || '');
    setLastName(user.last_name || '');
    setNewPassword('');
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onUserUpdated(user.user_id, firstName, lastName);
      
      if (newPassword && newPassword.length >= 6) {
        if (supabaseAdmin.auth.admin) {
          await supabaseAdmin.auth.admin.updateUserById(user.user_id, {
            password: newPassword,
          }).catch(() => {});
        } else {
          await supabase.auth.resetPasswordForEmail(user.email, {
            redirectTo: `${window.location.origin}/login`,
          }).catch(() => {});
        }
        toast.success(`Password updated for ${user.email}`);
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Failed to update user');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user profile and password for {user.email}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter first name"
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter last name"
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="newPassword">New Password (optional)</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep existing password"
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserModal;
