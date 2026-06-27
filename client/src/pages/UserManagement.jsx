import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Plus, Edit, Trash2, Save, X, RotateCcw } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', custom_role: 'STAFF' });

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data.users || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function addUser() {
    if (!newUser.email || !newUser.password) return alert('Email and password required');
    try {
      await api.createUser(newUser);
      setNewUser({ email: '', password: '', full_name: '', custom_role: 'STAFF' });
      setShowAdd(false);
      loadUsers();
    } catch (err) { alert(err.message); }
  }

  async function saveUser(id) {
    try {
      await api.updateUser(id, editForm);
      setEditId(null);
      loadUsers();
    } catch (err) { alert(err.message); }
  }

  async function deleteUser(id) {
    if (!confirm('Delete this user?')) return;
    try {
      await api.deleteUser(id);
      loadUsers();
    } catch (err) { alert(err.message); }
  }

  async function resetAllData() {
    if (!confirm('⚠️ This will DELETE ALL orders, items, customers, and print logs. This cannot be undone!')) return;
    if (!confirm('Are you REALLY sure? Type "RESET" mentally and click OK.')) return;
    try {
      await api.resetAllData();
      alert('All data has been reset');
    } catch (err) { alert(err.message); }
  }

  const roleColors = { OWNER: 'badge-red', FINANCE: 'badge-blue', STAFF: 'badge-green', INVENTORI: 'badge-yellow' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">User Management</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add User
          </button>
          <button onClick={resetAllData} className="btn-danger flex items-center gap-2">
            <RotateCcw size={16} /> Reset All Data
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="card">
          <h3 className="text-sm font-medium text-gray-400 mb-3">New User</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input placeholder="Email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="input-field" />
            <input placeholder="Password" type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="input-field" />
            <input placeholder="Full Name" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} className="input-field" />
            <select value={newUser.custom_role} onChange={e => setNewUser({...newUser, custom_role: e.target.value})} className="input-field">
              <option value="STAFF">Staff</option>
              <option value="FINANCE">Finance</option>
              <option value="INVENTORI">Inventori</option>
              <option value="OWNER">Owner</option>
            </select>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={addUser} className="btn-primary flex items-center gap-2"><Save size={16} /> Create</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-3 px-2 text-gray-400">Email</th>
              <th className="text-left py-3 px-2 text-gray-400">Name</th>
              <th className="text-left py-3 px-2 text-gray-400">Role</th>
              <th className="text-left py-3 px-2 text-gray-400">Created</th>
              <th className="text-center py-3 px-2 text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-gray-800/50">
                {editId === u.id ? (
                  <>
                    <td className="py-3 px-2">{u.email}</td>
                    <td className="py-3 px-2"><input value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="input-field" /></td>
                    <td className="py-3 px-2">
                      <select value={editForm.custom_role} onChange={e => setEditForm({...editForm, custom_role: e.target.value})} className="input-field">
                        <option value="STAFF">Staff</option>
                        <option value="FINANCE">Finance</option>
                        <option value="INVENTORI">Inventori</option>
                        <option value="OWNER">Owner</option>
                      </select>
                    </td>
                    <td className="py-3 px-2 text-gray-400">{u.created_at?.slice(0, 10)}</td>
                    <td className="py-3 px-2 text-center">
                      <button onClick={() => saveUser(u.id)} className="text-green-400 mr-2"><Save size={16} /></button>
                      <button onClick={() => setEditId(null)} className="text-gray-400"><X size={16} /></button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-3 px-2">{u.email}</td>
                    <td className="py-3 px-2">{u.full_name}</td>
                    <td className="py-3 px-2"><span className={`badge ${roleColors[u.custom_role] || 'badge-gray'}`}>{u.custom_role}</span></td>
                    <td className="py-3 px-2 text-gray-400">{u.created_at?.slice(0, 10)}</td>
                    <td className="py-3 px-2 text-center">
                      <button onClick={() => { setEditId(u.id); setEditForm({ full_name: u.full_name, custom_role: u.custom_role }); }} className="text-indigo-400 mr-2"><Edit size={16} /></button>
                      <button onClick={() => deleteUser(u.id)} className="text-red-400"><Trash2 size={16} /></button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
