import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Search, Eye, Flame, TrendingUp, Plus, Trash2, Edit } from 'lucide-react';
import UserDetailDrawer from './UserDetailDrawer';
import CreateUserModal from './CreateUserModal';
import EditUserModal from './EditUserModal';
import { format } from 'date-fns';
import { Database } from '@/integrations/supabase/types';
type UserRole = Database['public']['Enums']['user_role'];
interface User {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  total_xp: number;
  current_level: number;
  longest_streak: number;
  last_activity_date: string | null;
  total_tests_taken: number;
  avg_score_percentage: number;
}
const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  useEffect(() => {
    fetchUsers();

    // Set up real-time subscriptions for user data updates
    const channel = supabase
      .channel('user-management-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_streaks' },
        () => {
          console.log('Streak data changed, refetching users');
          fetchUsers();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_xp' },
        () => {
          console.log('XP/Level data changed, refetching users');
          fetchUsers();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'test_attempts' },
        () => {
          console.log('Test attempts changed, refetching users');
          fetchUsers();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          console.log('Profile data changed, refetching users');
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter]);
  const fetchUsers = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('user_progress_summary').select('*').order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };
  const filterUsers = () => {
    let filtered = users;
    if (searchTerm) {
      filtered = filtered.filter(user => user.email.toLowerCase().includes(searchTerm.toLowerCase()) || user.first_name && user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) || user.last_name && user.last_name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }
    setFilteredUsers(filtered);
  };
  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const {
        error
      } = await supabase.from('profiles').update({
        role: newRole
      }).eq('id', userId);
      if (error) throw error;
      toast.success('User role updated successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };
  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const {
        error
      } = await supabase.from('profiles').update({
        is_active: !currentStatus
      }).eq('id', userId);
      if (error) throw error;
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };
  const handleViewDetails = (userId: string) => {
    setSelectedUserId(userId);
    setIsDrawerOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) throw error;
      
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleUpdateUser = async (userId: string, firstName: string, lastName: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('User updated successfully');
      setIsEditModalOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };
  if (loading) {
    return <div className="flex justify-center p-8">Loading users...</div>;
  }
  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          
          
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create User
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input placeholder="Search users by email or name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="student">Student</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Name</TableHead>
                  <TableHead className="min-w-[200px]">Email</TableHead>
                  <TableHead className="min-w-[130px]">Role</TableHead>
                  <TableHead className="min-w-[140px]">
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      <TrendingUp className="h-4 w-4 shrink-0" />
                      <span>XP / Level</span>
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[100px]">
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      <Flame className="h-4 w-4 shrink-0 text-orange-500" />
                      <span>Streak</span>
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[80px] text-center">Tests</TableHead>
                  <TableHead className="min-w-[120px]">Last Active</TableHead>
                  <TableHead className="min-w-[90px]">Status</TableHead>
                  <TableHead className="min-w-[140px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(user => <TableRow key={user.user_id}>
                    <TableCell className="font-medium">
                      {user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Select value={user.role} onValueChange={value => updateUserRole(user.user_id, value as UserRole)}>
                        <SelectTrigger className="w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary">{user.total_xp.toLocaleString()}</span>
                        <Badge variant="secondary" className="text-xs font-bold">
                          L{user.current_level}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Flame className="h-4 w-4 text-orange-500 shrink-0" />
                        <span className="font-semibold">{user.longest_streak}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium">{user.total_tests_taken}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {user.last_activity_date ? format(new Date(user.last_activity_date), 'MMM d, yyyy') : 'Never'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? 'default' : 'secondary'} className="whitespace-nowrap">
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(user.user_id)} title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(user)} title="Edit User">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(user.user_id, user.email)} title="Delete User">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <UserDetailDrawer userId={selectedUserId} isOpen={isDrawerOpen} onClose={() => {
      setIsDrawerOpen(false);
      setSelectedUserId(null);
    }} />

      <CreateUserModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} onUserCreated={fetchUsers} />
      
      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal 
          open={isEditModalOpen} 
          onOpenChange={setIsEditModalOpen}
          user={editingUser}
          onUserUpdated={handleUpdateUser}
        />
      )}
    </div>;
};
export default UserManagement;