import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ClipboardPlus,
  Clock,
  MapPin,
  MessageSquareText,
  Plus,
  Truck,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../components/DataTable';
import { ErrorState } from '../components/states';
import { OctagonalIconContainer } from '../components/OctagonalIconContainer';
import { StatisticCard } from '../components/StatisticCard';
import { StatusBadge } from '../components/StatusBadge';
import { apiErrorMessage, fetchAssignments, fetchCollectors, fetchCollectionRequests, fetchRiders, fetchVehicles } from '../lib/api';
import type { CollectionRequest } from '../types';
import { formatDateTime, formatWeight } from '../utils/format';

const CHART_TONES: Record<string, { color: string; fill: string }> = {
  PENDING: { color: '#8a5a06', fill: '#e0a53c' },
  ACCEPTED: { color: '#155a80', fill: '#3f8fbf' },
  COMPLETED: { color: '#2c8a52', fill: '#2c8a52' },
  CANCELLED: { color: '#84968b', fill: '#b6bdb9' },
};

export function DashboardPage() {
  const navigate = useNavigate();
  const [collectors, setCollectors] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [requests, setRequests] = useState<CollectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [collectorList, riderList, vehicleList, assignmentList, requestList] = await Promise.all([
        fetchCollectors(),
        fetchRiders(),
        fetchVehicles(),
        fetchAssignments(),
        fetchCollectionRequests(),
      ]);
      setCollectors(collectorList);
      setRiders(riderList);
      setVehicles(vehicleList);
      setAssignments(assignmentList);
      setRequests(requestList);
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to load dashboard data from the Neptune backend.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const requestStats = useMemo(() => {
    const counts = { PENDING: 0, ACCEPTED: 0, COMPLETED: 0, CANCELLED: 0 };
    for (const r of requests) counts[r.status] += 1;
    return counts;
  }, [requests]);

  const totalRequests = requests.length;
  const todayIso = new Date().toISOString().slice(0, 10);

  const stats = useMemo(
    () => ({
      collectors: collectors.filter((c) => c.status === 'ACTIVE').length,
      riders: riders.filter((r) => r.status === 'ACTIVE').length,
      vehicles: vehicles.filter((v) => v.status === 'ACTIVE').length,
      pending: requestStats.PENDING,
      completed: requestStats.COMPLETED,
      activeAssignments: assignments.filter((a) => a.date === todayIso && a.status !== 'COMPLETED').length,
    }),
    [assignments, collectors, requestStats, riders, todayIso, vehicles],
  );

  const todayAssignments = useMemo(
    () => assignments.filter((a) => a.date === todayIso),
    [assignments, todayIso],
  );

  const recentRequests = useMemo(
    () => [...requests].sort((a, b) => b.createdDate.localeCompare(a.createdDate)).slice(0, 5),
    [requests],
  );

  const collectorName = (id: string) =>
    collectors.find((c) => c.id === id)?.fullName ?? '—';
  const riderName = (id: string | null) =>
    riders.find((r) => r.id === id)?.fullName ?? '—';
  const riderVehicle = (id: string | null) => {
    const rider = riders.find((r) => r.id === id);
    return rider ? `${rider.vehicleType} · ${rider.vehicleNumber}` : '—';
  };

  const activityColumns = [
    {
      key: 'id',
      header: 'Request ID',
      render: (r: CollectionRequest) => (
        <span className="mono" style={{ fontWeight: 700 }}>
          {r.id}
        </span>
      ),
      width: '118px',
    },
    { key: 'collector', header: 'Collector', render: (r: CollectionRequest) => collectorName(r.collectorId) },
    { key: 'rider', header: 'Rider', render: (r: CollectionRequest) => riderName(r.riderId) },
    { key: 'vehicle', header: 'Vehicle', render: (r: CollectionRequest) => riderVehicle(r.riderId) },
    {
      key: 'weight',
      header: 'Weight',
      render: (r: CollectionRequest) => (
        <span style={{ fontWeight: 600 }}>{formatWeight(r.totalWeight)}</span>
      ),
    },
    { key: 'status', header: 'Status', render: (r: CollectionRequest) => <StatusBadge status={r.status} /> },
    {
      key: 'date',
      header: 'Date',
      render: (r: CollectionRequest) => formatDateTime(r.createdDate),
    },
  ];

  if (error) {
    return (
      <div className="fade-in">
        <div className="page-head">
          <div>
            <h2>Dashboard</h2>
            <p>Welcome back — the live Neptune data is temporarily unavailable.</p>
          </div>
        </div>
        <div className="card">
          <ErrorState title="Unable to load dashboard data" message={error} onRetry={() => void loadDashboard()} />
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h2>Dashboard</h2>
          <p>Welcome back — here is the current collection activity at a glance.</p>
        </div>
      </div>

      <div className="stat-grid">
        <StatisticCard label="Total Collectors" value={stats.collectors} icon={Users} tone="green" hint="active collectors" hintTone="up" depth />
        <StatisticCard label="Total Riders" value={stats.riders} icon={UserCheck} tone="blue" hint="active riders" hintTone="up" depth />
        <StatisticCard label="Active Vehicles" value={stats.vehicles} icon={Truck} tone="deep" hint="fleet ready" hintTone="flat" depth />
        <StatisticCard label="Pending Requests" value={stats.pending} icon={Clock} tone="amber" hint="needs action" hintTone="down" depth />
        <StatisticCard label="Completed Collections" value={stats.completed} icon={CheckCircle2} tone="green" hint="completed" hintTone="up" depth />
        <StatisticCard label="Active Assignments" value={stats.activeAssignments} icon={CalendarDays} tone="outline" hint="for today" hintTone="flat" depth />
      </div>

      <div className="dash-grid-2">
        <div className="card">
          <div className="card-head">
            <h3 className="card-title">Collection Request Overview</h3>
          </div>
          <div className="card-body">
            {totalRequests === 0 ? (
              <div className="state">
                <div className="state-icon octagonal"><ClipboardList /></div>
                <div className="state-title">No collection requests yet</div>
                <div className="state-desc">New request data will appear here once the backend records it.</div>
              </div>
            ) : (
              <>
                <div className="stacked-bar" aria-hidden="true">
                  {(['PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED'] as const).map((s) => (
                    <span key={s} style={{ width: `${(requestStats[s] / totalRequests) * 100}%`, background: CHART_TONES[s].fill }} />
                  ))}
                </div>
                <div className="chart-legend" style={{ marginBottom: 18 }}>
                  {(['PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED'] as const).map((s) => (
                    <span key={s}>
                      <span className="dot" style={{ background: CHART_TONES[s].fill }} />
                      {s.charAt(0) + s.slice(1).toLowerCase()} · {requestStats[s]}
                    </span>
                  ))}
                  <span style={{ marginLeft: 'auto' }}>{totalRequests} total</span>
                </div>
                {(['PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED'] as const).map((s) => (
                  <div className="chart-row" key={s}>
                    <span className="chart-label">
                      <span className="dot" style={{ background: CHART_TONES[s].color }} />
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </span>
                    <span className="chart-track">
                      <span className="chart-fill" style={{ width: `${(requestStats[s] / totalRequests) * 100}%`, background: CHART_TONES[s].fill }} />
                    </span>
                    <span className="chart-count">{requestStats[s]}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3 className="card-title">Collection Activity</h3>
            <button type="button" className="link-btn" onClick={() => navigate('/requests')}>View all</button>
          </div>
          <div className="card-body flush">
            <DataTable
              columns={activityColumns}
              rows={recentRequests}
              rowKey={(r) => r.id}
              onRowClick={(r) => navigate(`/requests/${r.id}`)}
              loading={loading}
              emptyState={
                <div className="state">
                  <div className="state-icon octagonal"><ClipboardList /></div>
                  <div className="state-title">No activity yet</div>
                  <div className="state-desc">Collection requests will appear here.</div>
                </div>
              }
            />
          </div>
        </div>
      </div>

      <div className="dash-grid-3">
        <div className="card">
          <div className="card-head">
            <h3 className="card-title">Today's Assignments</h3>
            <button type="button" className="link-btn" onClick={() => navigate('/assignments')}>Manage</button>
          </div>
          <div className="card-body flush">
            <div className="activity-list">
              {todayAssignments.length === 0 ? (
                <div className="state" style={{ padding: '18px 16px' }}>
                  <div className="state-title">No assignments for today</div>
                  <div className="state-desc">Assignments created in the backend will appear here.</div>
                </div>
              ) : todayAssignments.map((a) => {
                const collector = collectors.find((c) => c.id === a.collectorId);
                return (
                  <div key={a.id} className="activity-item clickable" style={{ cursor: 'pointer' }} onClick={() => navigate(`/assignments/${a.id}`)}>
                    <OctagonalIconContainer tone="light" small><MapPin /></OctagonalIconContainer>
                    <div style={{ minWidth: 0 }}>
                      <span className="activity-action">
                        {collector?.fullName ?? '—'}
                        <span className="mono muted" style={{ marginLeft: 6, fontSize: 11.5 }}>{a.id}</span>
                      </span>
                      <span className="activity-detail">{a.area}</span>
                    </div>
                    <span style={{ marginLeft: 'auto' }}><StatusBadge status={a.status} /></span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3 className="card-title">Quick Actions</h3>
          </div>
          <div className="card-body">
            <div className="qa-grid">
              <button type="button" className="qa-btn" onClick={() => navigate('/collectors?new=1')}><OctagonalIconContainer tone="green" small><UserPlus /></OctagonalIconContainer><span><span className="qa-label">Add Collector</span><div className="qa-sub">Register collection staff</div></span></button>
              <button type="button" className="qa-btn" onClick={() => navigate('/riders?new=1')}><OctagonalIconContainer tone="blue" small><UserPlus /></OctagonalIconContainer><span><span className="qa-label">Add Rider</span><div className="qa-sub">Register a rider</div></span></button>
              <button type="button" className="qa-btn" onClick={() => navigate('/vehicles?new=1')}><OctagonalIconContainer tone="deep" small><Plus /></OctagonalIconContainer><span><span className="qa-label">Add Vehicle</span><div className="qa-sub">Add a truck, tuk or bike</div></span></button>
              <button type="button" className="qa-btn" onClick={() => navigate('/assignments?new=1')}><OctagonalIconContainer tone="amber" small><ClipboardPlus /></OctagonalIconContainer><span><span className="qa-label">Create Assignment</span><div className="qa-sub">Plan a daily route</div></span></button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3 className="card-title">Recent Activity</h3>
          </div>
          <div className="card-body flush">
            <div className="activity-list">
              {requests.slice(0, 5).map((item) => (
                <div key={item.id} className="activity-item">
                  <OctagonalIconContainer tone="light" small><MessageSquareText /></OctagonalIconContainer>
                  <div style={{ minWidth: 0 }}>
                    <span className="activity-action">{item.id}</span>
                    <span className="activity-detail">{collectorName(item.collectorId)} · {item.status}</span>
                  </div>
                  <span className="activity-time">{formatDateTime(item.createdDate)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}