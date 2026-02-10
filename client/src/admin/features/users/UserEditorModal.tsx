import { useState, useEffect } from 'react';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

interface Role {
  id: number;
  name: string;
  description: string;
}

export function UserEditorModal({ user, onClose, onSuccess }: any) {
  const isEdit = !!user;
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    password: '',
    roleId: user?.roleId || null,
    isPremium: user?.isPremium || false,
    adminNotes: user?.adminNotes || '',
  });
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);

  // Fetch available roles
  useEffect(() => {
    async function fetchRoles() {
      try {
        const response = await fetch('/api/admin/user-management/roles', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          },
        });
        const data = await response.json();
        if (data.ok) {
          setRoles(data.roles);
        }
      } catch (error) {
        console.error('Failed to fetch roles:', error);
      }
    }
    fetchRoles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      const url = isEdit
        ? `/api/admin/user-management/users/${user.id}`
        : '/api/admin/user-management/users';

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify(isEdit ? {
          email: formData.email,
          roleId: formData.roleId,
          isPremium: formData.isPremium,
          adminNotes: formData.adminNotes,
        } : {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          roleId: formData.roleId,
          isPremium: formData.isPremium,
          adminNotes: formData.adminNotes,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        toast.success(isEdit ? 'User updated successfully' : 'User created successfully');
        onSuccess();
      } else {
        toast.error(data.error || 'Operation failed');
      }
    } catch (error) {
      toast.error('Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{isEdit ? 'Edit User' : 'Create User'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEdit && (
            <>
              <Input
                label="Username"
                value={formData.username}
                onChange={(e: any) => setFormData({ ...formData, username: e.target.value })}
                required
              />
              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e: any) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </>
          )}

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e: any) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Role (optional)
            </label>
            <select
              value={formData.roleId || ''}
              onChange={(e) => setFormData({ ...formData, roleId: e.target.value ? parseInt(e.target.value) : null })}
              className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">No admin role (Regular user)</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name} - {role.description}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Assign an admin role to give this user access to the admin panel
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPremium"
              checked={formData.isPremium}
              onChange={(e) => setFormData({ ...formData, isPremium: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="isPremium" className="text-sm font-medium text-gray-700">
              Premium Account
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
            <textarea
              value={formData.adminNotes}
              onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Internal notes about this user..."
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading}>
              {isEdit ? 'Update' : 'Create'} User
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
