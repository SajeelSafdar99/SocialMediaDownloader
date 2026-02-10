import { useState, useEffect } from 'react';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

interface Role {
  id: number;
  name: string;
  description?: string;
}

export function RoleAssignmentModal({ user, onClose, onSuccess }: any) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number>(user.roleId || 0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const response = await fetch('/api/admin/user-management/roles', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
      });
      const data = await response.json();
      if (data.ok) setRoles(data.roles);
    } catch (error) {
      toast.error('Failed to load roles');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoleId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/user-management/users/${user.id}/assign-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({ roleId: selectedRoleId }),
      });

      const data = await response.json();
      if (data.ok) {
        toast.success('Role assigned successfully');
        onSuccess();
      } else {
        toast.error(data.error || 'Failed to assign role');
      }
    } catch (error) {
      toast.error('Failed to assign role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Assign Role</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Assign a role to <strong>{user.username}</strong>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Role
            </label>
            <select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(parseInt(e.target.value))}
              className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value={0}>Select a role...</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name} {role.description && `- ${role.description}`}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading}>
              Assign Role
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
