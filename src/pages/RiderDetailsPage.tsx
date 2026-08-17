import {
  ArrowLeft,
  Bike,
  CalendarDays,
  MapPin,
  Pencil,
  Phone,
  Power,
  ShieldCheck,
  Truck,
  UserCog,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { DataTable } from '../components/DataTable';
import { ErrorState } from '../components/states';
import { PrimaryButton, SecondaryButton } from '../components/buttons';
import { StatusBadge } from '../components/StatusBadge';
import { TukIcon } from '../components/icons';
import { useToast } from '../context/ToastContext';
import {
  apiErrorMessage,
  fetchCollectionRequests,
  fetchRiderById,
  fetchRiders,
  toggleRiderStatus,
  updateRider,
} from '../lib/api';
import type { CollectionRequest, Rider } from '../types';
import { colourHex, formatDate, formatDateTime, formatWeight } from '../utils/format';
import { RiderFormModal } from './RiderFormModal';
import type { RiderFormValues } from './RiderFormModal';

export function RiderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [rider, setRider] = useState<any | null>(null);
  const [riders, setRiders] = useState<any[]>([]);
  const [requests, setRequests] = useState<CollectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [toggleOpen, setToggleOpen] = useState(false);

  const loadDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const [data, riderList, reqList] = await Promise.all([
        fetchRiderById(id ?? ''),
        fetchRiders(),
        fetchCollectionRequests(),
      ]);
      setRider(data);
      setRiders(riderList);
      setRequests(reqList);
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to load rider details from the Neptune backend.'));
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
        <button type="button" className="back-link" onClick={() => navigate('/riders')}>
          <ArrowLeft size={15} /> Back to Riders
        </button>
        <div className="card">
          <ErrorState title="Unable to load rider" message={error} onRetry={() => void loadDetail()} />
        </div>
      </div>
    );
  }

  if (loading || !rider) {
    return (
      <div className="fade-in">
        <button type="button" className="back-link" onClick={() => navigate('/riders')}>
          <ArrowLeft size={15} /> Back to Riders
        </button>
        <div className="card">
          <div className="state">
            <div className="state-title">Loading rider…</div>
            <div className="state-desc">Fetching data from the Neptune backend.</div>
          </div>
        </div>
      </div>
    );
  }

  const vehicle = riders.find((r) => r.id === rider.assignedVehicleId) ?? null;
  const history = requests.filter((r) => r.riderId === rider.id);

  const VehicleIcon = rider.vehicleType === 'BIKE' ? Bike : TukIcon;

  const handleSave = async (values: RiderFormValues) => {
    try {
      await updateRider(rider.id, {
        fullName: values.fullName,
        loginId: values.loginId,
        nic: values.nic,
        mobile: values.mobile,
        address: values.address,
        vehicleType: values.vehicleType,
        vehicleNumber: values.vehicleNumber,
        vehicleColour: values.vehicleColour,
      });
      toast.success(`Rider ${rider.fullName} updated`);
      setEditOpen(false);
      await loadDetail();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Unable to save rider changes.'));
    }
  };

  const handleToggle = async () => {
    const next = rider.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await toggleRiderStatus(rider.id, next);
      toast.success(
        next === 'ACTIVE' ? `${rider.fullName} activated` : `${rider.fullName} deactivated`,
      );
      setToggleOpen(false);
      await loadDetail();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Unable to update rider status.'));
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
    {
      key: 'status',
      header: 'Status',
      render: (r: CollectionRequest) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <div className="fade-in">
      <button type="button" className="back-link" onClick={() => navigate('/riders')}>
        <ArrowLeft size={15} /> Back to Riders
      </button>

      <div className="hero">
        <Avatar
          name={rider.fullName}
          size="lg"
          tone={rider.status === 'ACTIVE' ? 'deep' : 'green-100'}
          octagonal
        />
        <div className="hero-info">
          <h2>{rider.fullName}</h2>
          <div className="hero-meta">
            <span className="mono muted">{rider.id}</span>
            <span className="mono muted">Login: {rider.loginId}</span>
            <StatusBadge status={rider.status} />
          </div>
        </div>
        <div className="hero-actions">
          <SecondaryButton onClick={() => setEditOpen(true)}>
            <Pencil size={15} /> Edit
          </SecondaryButton>
          <PrimaryButton onClick={() => setToggleOpen(true)}>
            <Power size={15} />
            {rider.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </PrimaryButton>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-stack">
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">
                <UserCog /> Personal Information
              </h3>
            </div>
            <div className="card-body">
              <div className="info-list">
                <div className="info-item">
                  <div className="k">Full Name</div>
                  <div className="v">{rider.fullName}</div>
                </div>
                <div className="info-item">
                  <div className="k">Login ID</div>
                  <div className="v mono normal">{rider.loginId}</div>
                </div>
                <div className="info-item">
                  <div className="k">NIC</div>
                  <div className="v mono normal">{rider.nic}</div>
                </div>
                <div className="info-item">
                  <div className="k">Register Date</div>
                  <div className="v normal">{formatDate(rider.createdDate)}</div>
                </div>
                <div className="info-item span-2">
                  <div className="k">Address</div>
                  <div className="v normal">{rider.address}</div>
                </div>
                <div className="info-item">
                  <div className="k">Mobile</div>
                  <div className="v">
                    <Phone /> {rider.mobile}
                  </div>
                </div>
                <div className="info-item">
                  <div className="k">Last Login</div>
                  <div className="v normal">
                    {rider.lastLogin ? formatDateTime(rider.lastLogin) : 'Never logged in'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3 className="card-title">
                <ShieldCheck /> Account Status
              </h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <StatusBadge status={rider.status} />
                <span className="muted" style={{ fontSize: 12.5 }}>
                  {rider.status === 'ACTIVE'
                    ? 'This rider is available for collection runs.'
                    : 'This rider is currently unavailable for collection runs.'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="detail-stack">
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">
                <Truck /> Assigned Vehicle
              </h3>
            </div>
            <div className="card-body">
              <div className="vehicle-preview">
                <span className="oct-icon octagonal oct-green">
                  <VehicleIcon />
                </span>
                <span>
                  <span className="vp-title">
                    {rider.vehicleType === 'TUK' ? 'Tuk (Three-Wheeler)' : 'Bike (Motorcycle)'} —{' '}
                    {rider.vehicleNumber}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2 }}>
                    <span className="swatch" style={{ background: colourHex(rider.vehicleColour) }} />
                    {rider.vehicleColour.charAt(0) + rider.vehicleColour.slice(1).toLowerCase()}
                  </div>
                </span>
              </div>
              <div className="info-list" style={{ marginTop: 16 }}>
                <div className="info-item">
                  <div className="k">Linked Vehicle Code</div>
                  <div className="v mono normal">{vehicle?.vehicleCode ?? 'Not linked'}</div>
                </div>
                <div className="info-item">
                  <div className="k">Fleet Status</div>
                  <div className="v">
                    <MapPin />{' '}
                    {vehicle ? (
                      <StatusBadge status={vehicle.status} />
                    ) : (
                      <span className="muted">—</span>
                    )}
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
            <CalendarDays /> Collection History
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
                <div className="state-title">No collection runs yet</div>
                <div className="state-desc">Requests handled by this rider will be listed here.</div>
              </div>
            }
          />
        </div>
      </div>

      <RiderFormModal
        open={editOpen}
        initial={rider}
        onClose={() => setEditOpen(false)}
        onSave={handleSave}
      />

      <ConfirmationDialog
        open={toggleOpen}
        title={rider.status === 'ACTIVE' ? 'Deactivate rider' : 'Activate rider'}
        message={
          rider.status === 'ACTIVE'
            ? `${rider.fullName} (${rider.loginId}) will be deactivated and will no longer accept collection runs.`
            : `${rider.fullName} (${rider.loginId}) will be re-activated and can accept collection runs again.`
        }
        confirmLabel={rider.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        destructive={rider.status === 'ACTIVE'}
        onConfirm={handleToggle}
        onCancel={() => setToggleOpen(false)}
      />
    </div>
  );
}
