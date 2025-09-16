'use client';

import { useState, useEffect } from 'react';
import { 
  UserGroupIcon,
  CheckCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  EyeIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import Footer from '@/src/components/Footer';

interface AdminStats {
  totalGroups: number;
  activeGroups: number;
  totalMembers: number;
  verifiedMembers: number;
  pendingMembers: number;
  restrictedMembers: number;
  kickedMembers: number;
  totalAttestations: number;
  recentAttestations: number;
  policyCounts: Record<string, number>;
}

interface Group {
  chatId: string;
  groupName?: string | null;
  ownerTgId?: string;
  createdAt: string;
  updatedAt: string;
  policy?: {
    type: string;
    asset?: string;
    minAmount?: string;
    onFail: string;
  } | null;
  memberCount: number;
  logCount: number;
}

interface LogEntry {
  id: string;
  chatId: string;
  tgId?: string;
  username?: string | null;
  level: string;
  event: string;
  meta: Record<string, unknown>;
  createdAt: string;
}

interface UniquePolicy {
  type: string;
  asset?: string | null;
  minAmount?: string | null;
  onFail: string;
  includeUnconfirmed: boolean;
  groups: string[];
  groupCount: number;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminSecret, setAdminSecret] = useState('');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [recentActivity, setRecentActivity] = useState<LogEntry[]>([]);
  const [uniquePolicies, setUniquePolicies] = useState<UniquePolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'groups' | 'activity' | 'policies'>('overview');

  const authenticateWithSecret = async (secret: string) => {
    if (!secret.trim()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${secret}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setGroups(data.groups);
        setRecentActivity(data.recentActivity);
        setUniquePolicies(data.uniquePolicies || []);
        setIsAuthenticated(true);
        localStorage.setItem('adminSecret', secret);
      } else {
        // If saved secret is invalid, clear it
        localStorage.removeItem('adminSecret');
        setAdminSecret('');
      }
    } catch {
      // Silent fail for auto-auth
    } finally {
      setLoading(false);
    }
  };

  const authenticate = async () => {
    if (!adminSecret.trim()) {
      setError('Please enter admin secret');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${adminSecret}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setGroups(data.groups);
        setRecentActivity(data.recentActivity);
        setUniquePolicies(data.uniquePolicies || []);
        setIsAuthenticated(true);
        localStorage.setItem('adminSecret', adminSecret);
      } else {
        setError('Invalid admin secret');
      }
    } catch {
      setError('Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedSecret = localStorage.getItem('adminSecret');
    if (savedSecret) {
      setAdminSecret(savedSecret);
      // Auto-authenticate with saved secret
      authenticateWithSecret(savedSecret);
    }
  }, []);

  const logout = () => {
    setIsAuthenticated(false);
    setAdminSecret('');
    setStats(null);
    setGroups([]);
    setRecentActivity([]);
    localStorage.removeItem('adminSecret');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="bg-gray-50 rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <KeyIcon className="mx-auto h-12 w-12 text-[#155dfc] mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
            <p className="text-gray-600">Enter your admin secret to access the dashboard</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Secret
              </label>
              <input
                type="password"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && authenticate()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#155dfc] focus:border-transparent"
                placeholder="Enter admin secret"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={authenticate}
              disabled={loading}
              className="w-full px-4 py-2 bg-[#155dfc] text-white font-medium rounded-lg hover:bg-[#0d4fd4] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Authenticating...' : 'Login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">XCP Group Bot Admin</h1>
          <button
            onClick={logout}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-8 border-b border-gray-200 mb-8">
          {[
            { key: 'overview', label: 'Overview', icon: ChartBarIcon },
            { key: 'groups', label: 'Groups', icon: UserGroupIcon },
            { key: 'policies', label: 'Policies', icon: ShieldCheckIcon },
            { key: 'activity', label: 'Activity', icon: EyeIcon }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as 'overview' | 'groups' | 'activity' | 'policies')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-[#155dfc] text-[#155dfc]'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center gap-3">
                  <UserGroupIcon className="w-8 h-8 text-[#155dfc]" />
                  <div>
                    <p className="text-sm text-gray-600">Total Groups</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalGroups}</p>
                    <p className="text-xs text-gray-500">{stats.activeGroups} active</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Verified Members</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.verifiedMembers}</p>
                    <p className="text-xs text-gray-500">of {stats.totalMembers} total</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center gap-3">
                  <ClockIcon className="w-8 h-8 text-yellow-600" />
                  <div>
                    <p className="text-sm text-gray-600">Pending Members</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pendingMembers}</p>
                    <p className="text-xs text-gray-500">awaiting verification</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center gap-3">
                  <ShieldCheckIcon className="w-8 h-8 text-[#155dfc]" />
                  <div>
                    <p className="text-sm text-gray-600">Attestations</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalAttestations}</p>
                    <p className="text-xs text-gray-500">{stats.recentAttestations} this week</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Member Status Breakdown */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Member Status</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.verifiedMembers}</div>
                  <div className="text-sm text-gray-600">Verified</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.pendingMembers}</div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{stats.restrictedMembers}</div>
                  <div className="text-sm text-gray-600">Restricted</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.kickedMembers}</div>
                  <div className="text-sm text-gray-600">Kicked</div>
                </div>
              </div>
            </div>

            {/* Policy Types */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Policy Distribution</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#155dfc]">{stats.policyCounts.basic || 0}</div>
                  <div className="text-sm text-gray-600">Basic Policies</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#E72A5D]">{stats.policyCounts.token || 0}</div>
                  <div className="text-sm text-gray-600">Token Policies</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{stats.policyCounts.none || 0}</div>
                  <div className="text-sm text-gray-600">No Policy</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Groups Tab */}
        {activeTab === 'groups' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Groups ({groups.length})</h2>
            
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Group
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Policy
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Members
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Activity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {groups.map((group) => (
                      <tr key={group.chatId} className="hover:bg-gray-100">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            {group.groupName && (
                              <div className="font-medium text-gray-900">{group.groupName}</div>
                            )}
                            <div className="font-mono text-xs text-gray-500">
                              ID: {group.chatId}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {group.policy ? (
                            <div>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                group.policy.type === 'token' 
                                  ? 'bg-[#E72A5D] text-white' 
                                  : 'bg-[#155dfc] text-white'
                              }`}>
                                {group.policy.type}
                              </span>
                              {group.policy.type === 'token' && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {group.policy.minAmount} {group.policy.asset}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">None</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {group.memberCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {group.logCount} events
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(group.updatedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Policies Tab */}
        {activeTab === 'policies' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Unique Policies ({uniquePolicies.length})
            </h2>

            <div className="grid gap-6">
              {uniquePolicies
                .sort((a, b) => b.groupCount - a.groupCount)
                .map((policy, index) => (
                <div key={index} className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                        policy.type === 'token'
                          ? 'bg-[#E72A5D] text-white'
                          : 'bg-[#155dfc] text-white'
                      }`}>
                        {policy.type === 'basic' ? 'Basic' : 'Token'}
                      </div>
                      <span className="text-2xl font-bold text-gray-900">
                        {policy.groupCount} {policy.groupCount === 1 ? 'group' : 'groups'}
                      </span>
                    </div>

                    <div className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                      policy.onFail === 'soft_kick'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {policy.onFail === 'soft_kick' ? 'Kick' : 'Restrict'}
                    </div>
                  </div>

                  {policy.type === 'token' && (
                    <div className="bg-white rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Asset:</span>
                          <span className="ml-2 font-mono font-semibold text-gray-900">
                            {policy.asset || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Min Amount:</span>
                          <span className="ml-2 font-semibold text-gray-900">
                            {policy.minAmount || 'N/A'}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500">Include Unconfirmed:</span>
                          <span className="ml-2 font-semibold text-gray-900">
                            {policy.includeUnconfirmed ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <details className="text-sm">
                    <summary className="cursor-pointer text-gray-600 hover:text-gray-800 font-medium">
                      View groups using this policy
                    </summary>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                      {policy.groups.map(chatId => {
                        const group = groups.find(g => g.chatId === chatId);
                        return (
                          <div key={chatId} className="bg-white rounded px-3 py-2">
                            {group?.groupName ? (
                              <div>
                                <div className="font-medium text-gray-900 truncate">
                                  {group.groupName}
                                </div>
                                <div className="text-xs text-gray-500 font-mono">
                                  {chatId}
                                </div>
                              </div>
                            ) : (
                              <div className="font-mono text-gray-700">
                                {chatId}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </details>
                </div>
              ))}

              {uniquePolicies.length === 0 && (
                <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-500">
                  No policies configured yet
                </div>
              )}
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
            
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="space-y-4">
                {recentActivity.slice(0, 50).map((log) => (
                  <div key={log.id} className="flex items-center gap-4 p-4 bg-white rounded-lg">
                    <div className={`w-2 h-2 rounded-full ${
                      log.level === 'error' ? 'bg-red-500' :
                      log.level === 'warn' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`} />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{log.event}</span>
                        <span className="text-xs text-gray-500">#{log.chatId}</span>
                        {log.tgId && (
                          <span className="text-xs text-gray-500">
                            User: {log.username || log.tgId}
                          </span>
                        )}
                      </div>
                      
                      {log.meta && Object.keys(log.meta).length > 0 && (
                        <div className="text-xs text-gray-600 mt-1">
                          {JSON.stringify(log.meta)}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}