import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Pencil,
  Phone,
  Power,
  QrCode,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { DataTable } from '../components/DataTable';
import { ErrorState } from '../components/states';
import { PrimaryButton, SecondaryButton } from '../components/buttons';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';
import {
  apiErrorMessage,
  fetchCollectorById,
  fetchCollectionRequests,
  toggleCollectorStatus,
  updateCollector,
} from '../lib/api';
import type { CollectionRequest } from '../types';
import { formatDate, formatDateTime, formatWeight } from '../utils/format';
import { CollectorFormModal } from './CollectorFormModal';
import type { CollectorFormValues } from './CollectorFormModal';

export function CollectorDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [collector, setCollector] = useState<any | null>(null);
  const [requests, setRequests] = useState<CollectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [toggleOpen, setToggleOpen] = useState(false);

  const loadDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const [data, reqList] = await Promise.all([
        fetchCollectorById(id ?? ''),
        fetchCollectionRequests(),
      ]);
      setCollector(data);
      setRequests(reqList);
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to load collector details from the Neptune backend.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error && !loading) {
    return (
      <div className="fade-in">
        <button type="button" className="back-link" onClick={() => navigate('/collectors')}>
          <ArrowLeft size={15} /> Back to Collectors
        </button>
        <div className="card">
          <ErrorState title="Unable to load collector" message={error} onRetry={() => void loadDetail()} />
        </div>
      </div>
    );
  }

  if (loading || !collector) {
    return (
      <div className="fade-in">
        <button type="button" className="back-link" onClick={() => navigate('/collectors')}>
          <ArrowLeft size={15} /> Back to Collectors
        </button>
        <div className="card">
          <div className="state">
            <div className="state-title">Loading collector…</div>
            <div className="state-desc">Fetching data from the Neptune backend.</div>
          </div>
        </div>
      </div>
    );
  }

  const history = requests.filter((r) => r.collectorId === collector.id);

  const handleSave = async (values: CollectorFormValues) => {
    try {
      await updateCollector(collector.id, {
        fullName: values.fullName,
        loginId: values.loginId,
        nic: values.nic,
        mobile: values.mobile,
        address: values.address,
        guardianName: values.guardianName,
        guardianMobile: values.guardianMobile,
        qrToken: values.qrToken,
      });
      toast.success(`Collector ${collector.fullName} updated`);
      setEditOpen(false);
      await loadDetail();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Unable to save collector changes.'));
    }
  };

  const handleToggle = async () => {
    const next = collector.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await toggleCollectorStatus(collector.id, next);
      toast.success(
        next === 'ACTIVE'
          ? `${collector.fullName} activated`
          : `${collector.fullName} deactivated`,
      );
      setToggleOpen(false);
      await loadDetail();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Unable to update collector status.'));
      setToggleOpen(false);
    }
  };

  const historyColumns = [
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
    { key: 'location', header: 'Location', render: (r: CollectionRequest) => r.location },
    {
      key: 'created',
      header: 'Created',
      render: (r: CollectionRequest) => formatDate(r.createdDate),
    },
    {
      key: 'weight',
      header: 'Weight',
      render: (r: CollectionRequest) => (
        <span style={{ fontWeight: 600 }}>{formatWeight(r.totalWeight)}</span>
      ),
    },
    { key: 'status', header: 'Status', render: (r: CollectionRequest) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="fade-in">
      <button type="button" className="back-link" onClick={() => navigate('/collectors')}>
        <ArrowLeft size={15} /> Back to Collectors
      </button>

      <div className="hero">
        <Avatar
          name={collector.fullName}
          size="lg"
          tone={collector.status === 'ACTIVE' ? 'deep' : 'green-100'}
          octagonal
        />
        <div className="hero-info">
          <h2>{collector.fullName}</h2>
          <div className="hero-meta">
            <span className="mono muted">{collector.id}</span>
            <span className="mono muted">Login: {collector.loginId}</span>
            <StatusBadge status={collector.status} />
          </div>
        </div>
        <div className="hero-actions">
          <SecondaryButton onClick={() => setEditOpen(true)}>
            <Pencil size={15} /> Edit
          </SecondaryButton>
          <PrimaryButton onClick={() => setToggleOpen(true)}>
            <Power size={15} />
            {collector.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </PrimaryButton>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-stack">
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">
                <UserRound /> Personal Information
              </h3>
            </div>
            <div className="card-body">
              <div className="info-list">
                <div className="info-item">
                  <div className="k">Full Name</div>
                  <div className="v">{collector.fullName}</div>
                </div>
                <div className="info-item">
                  <div className="k">Login ID</div>
                  <div className="v mono normal">{collector.loginId}</div>
                </div>
                <div className="info-item">
                  <div className="k">NIC</div>
                  <div className="v mono normal">{collector.nic}</div>
                </div>
                <div className="info-item">
                  <div className="k">Register Date</div>
                  <div className="v normal">{formatDate(collector.createdDate)}</div>
                </div>
                <div className="info-item span-2">
                  <div className="k">Address</div>
                  <div className="v normal">{collector.address}</div>
                </div>
                <div className="info-item">
                  <div className="k">Guardian Name</div>
                  <div className="v normal">{collector.guardianName}</div>
                </div>
                <div className="info-item">
                  <div className="k">Guardian Mobile</div>
                  <div className="v">
                    <Phone /> {collector.guardianMobile}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3 className="card-title">
                <Phone /> Contact Information
              </h3>
            </div>
            <div className="card-body">
              <div className="info-list">
                <div className="info-item">
                  <div className="k">Mobile</div>
                  <div className="v">
                    <Phone /> {collector.mobile}
                  </div>
                </div>
                <div className="info-item">
                  <div className="k">Last Login</div>
                  <div className="v normal">
                    {collector.lastLogin ? formatDateTime(collector.lastLogin) : 'Never logged in'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3 className="card-title">
                <MapPin /> Current Assignment
              </h3>
            </div>
            <div className="card-body">
              {history.length > 0 ? (
                <div className="info-list">
                  <div className="info-item">
                    <div className="k">Assigned Area</div>
                    <div className="v">
                      <MapPin /> {collector.area}
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="k">Open Requests</div>
                    <div className="v">
                      {history.filter((r) => r.status === 'PENDING' || r.status === 'ACCEPTED').length}{' '}
                      in progress
                    </div>
                  </div>
                </div>
              ) : (
                <p className="muted" style={{ fontSize: 13 }}>
                  No active assignment for this collector.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="detail-stack">
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">
                <ShieldCheck /> Account Status
              </h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <StatusBadge status={collector.status} />
                <span className="muted" style={{ fontSize: 12.5 }}>
                  {collector.status === 'ACTIVE'
                    ? 'This collector can receive assignments and create collection requests.'
                    : 'This collector cannot receive assignments in the current state.'}
                </span>
              </div>
              <div className="info-list">
                <div className="info-item">
                  <div className="k">Login ID</div>
                  <div className="v mono normal">{collector.loginId}</div>
                </div>
                <div className="info-item">
                  <div className="k">Created</div>
                  <div className="v normal">{formatDate(collector.createdDate)}</div>
                </div>
                <div className="info-item">
                  <div className="k">Last Login</div>
                  <div className="v normal">
                    {collector.lastLogin ? formatDateTime(collector.lastLogin) : '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3 className="card-title">
                <QrCode /> QR Information
              </h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div className="qr-box">
                  <div className="qr-grid">
                    <span className="qr-finder f1" />
                    <span className="qr-finder f2" />
                    <span className="qr-finder f3" />
                  </div>
                </div>
                <div>
                  <div className="k" style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--np-ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    QR Token
                  </div>
                  <div className="mono" style={{ fontWeight: 800, fontSize: 14, color: 'var(--np-ink)' }}>
                    {collector.qrToken}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-head">
          <h3 className="card-title">
            <CalendarDays /> Collection Request History
            <span className="badge badge-slate" style={{ marginLeft: 4 }}>
              {history.length}
            </span>
          </h3>
          <button type="button" className="link-btn" onClick={() => navigate('/requests')}>
            View requests
          </button>
        </div>
        <div className="card-body flush">
          <DataTable
            columns={historyColumns}
            rows={history}
            rowKey={(r) => r.id}
            onRowClick={(r) => navigate(`/requests/${r.id}`)}
            emptyState={
              <div className="state">
                <div className="state-icon octagonal">
                  <CalendarDays />
                </div>
                <div className="state-title">No collection requests yet</div>
                <div className="state-desc">
                  Requests created by this collector will be listed here.
                </div>
              </div>
            }
          />
        </div>
      </div>

      <CollectorFormModal
        open={editOpen}
        initial={collector}
        onClose={() => setEditOpen(false)}
        onSave={handleSave}
      />

      <ConfirmationDialog
        open={toggleOpen}
        title={collector.status === 'ACTIVE' ? 'Deactivate collector' : 'Activate collector'}
        message={
          collector.status === 'ACTIVE'
            ? `${collector.fullName} (${collector.loginId}) will be deactivated and will no longer receive assignments.`
            : `${collector.fullName} (${collector.loginId}) will be re-activated and can receive assignments again.`
        }
        confirmLabel={collector.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        destructive={collector.status === 'ACTIVE'}
        onConfirm={handleToggle}
        onCancel={() => setToggleOpen(false)}
      />
    </div>
  );
}
