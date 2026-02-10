import { useState, useEffect } from 'react';
import { adminApi } from '../../shared/api/adminApi';
import { Button } from '../../shared/components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/components/Card';
import { Badge } from '../../shared/components/Badge';
import { Input } from '../../shared/components/Input';
import { Users, UserPlus, Edit, Trash2, Shield, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { UserEditorModal } from './UserEditorModal';
import { RoleAssignmentModal } from './RoleAssignmentModal';

interface User {
  user: any;
  roleName?: string;
  roleDescription?: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadUsers();
  }, [search, roleFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/user-management/users?' + new URLSearchParams({
        search: search || '',
        role: roleFilter || '',
        limit: '50',
      }), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      const data = await response.json();
      if (data.ok) {
        setUsers(data.users);
        setTotal(data.total);
      }
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: number, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;

    try {
      const response = await fetch(`/api/admin/user-management/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      const data = await response.json();
      if (data.ok) {
        toast.success('User deleted successfully');
        loadUsers();
      } else {
        toast.error(data.error || 'Failed to delete user');
      }
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
      admin: 'danger',
      editor: 'warning',
      viewer: 'info',
      user: 'default',
    };
    return <Badge variant={variants[role] || 'default'}>{role}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">Manage users, roles, and permissions</p>
        </div>
        <Button
          leftIcon={<UserPlus className="h-4 w-4" />}
          onClick={() => {
            setSelectedUser(null);
            setShowEditorModal(true);
          }}
        >
          Create User
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e: any) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
              <option value="user">User</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-500">Try adjusting your search filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {users.map((item) => {
            const user = item.user;
            return (
              <Card key={user.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {user.username}
                        </h3>
                        {getRoleBadge(user.role)}
                        {user.isPremium && (
                          <Badge variant="warning">Premium</Badge>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>Email: {user.email}</p>
                        {item.roleName && (
                          <p>
                            <Shield className="h-4 w-4 inline mr-1" />
                            Role: {item.roleName}
                          </p>
                        )}
                        {user.isPremium && user.premiumExpiresAt && (
                          <p className="text-xs">
                            <span className="font-medium text-orange-600">Premium until:</span>{" "}
                            {new Date(user.premiumExpiresAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                            {user.subscriptionProvider && (
                              <span className="ml-2 text-gray-500">
                                via {user.subscriptionProvider}
                              </span>
                            )}
                          </p>
                        )}
                        <p className="text-xs text-gray-400">
                          Joined: {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Shield className="h-4 w-4" />}
                        onClick={() => {
                          setSelectedUser(user);
                          setShowRoleModal(true);
                        }}
                      >
                        Assign Role
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Edit className="h-4 w-4" />}
                        onClick={() => {
                          setSelectedUser(user);
                          setShowEditorModal(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        leftIcon={<Trash2 className="h-4 w-4" />}
                        onClick={() => handleDelete(user.id, user.username)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Stats */}
      {total > 0 && (
        <div className="text-sm text-gray-500 text-center">
          Showing {users.length} of {total} users
        </div>
      )}

      {/* Modals */}
      {showEditorModal && (
        <UserEditorModal
          user={selectedUser}
          onClose={() => {
            setShowEditorModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setShowEditorModal(false);
            setSelectedUser(null);
            loadUsers();
          }}
        />
      )}

      {showRoleModal && selectedUser && (
        <RoleAssignmentModal
          user={selectedUser}
          onClose={() => {
            setShowRoleModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setShowRoleModal(false);
            setSelectedUser(null);
            loadUsers();
          }}
        />
      )}
    </div>
  );
}
