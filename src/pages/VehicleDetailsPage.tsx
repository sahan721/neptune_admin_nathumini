import {
  ArrowLeft,
  Bike,
  CalendarDays,
  Pencil,
  Power,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  fetchRiders,
  fetchVehicleById,
  toggleVehicleStatus,
  updateVehicle,
} from '../lib/api';
import type { CollectionRequest } from '../types';
import { formatDate, formatWeight } from '../utils/format';
import { VehicleFormModal } from './VehicleFormModal';
import type { VehicleFormValues } from './VehicleFormModal';

const TYPE_LABELS = {
  TRUCK: 'Truck (Waste Truck)',
  TUK: 'Tuk (Three-Wheeler)',
  BIKE: 'Bike (Motorcycle)',
} as const;

const TYPE_ICONS = { TRUCK: Truck, TUK: TukIcon, BIKE: Bike } as const;

export function VehicleDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [vehicle, setVehicle] = useState<any | null>(null);
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
        fetchVehicleById(id ?? ''),
        fetchRiders(),
        fetchCollectionRequests(),
      ]);
      setVehicle(data);
      setRiders(riderList);
      setRequests(reqList);
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to load vehicle details from the Neptune backend.'));
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
        <button type="button" className="back-link" onClick={() => navigate('/vehicles')}>
          <ArrowLeft size={15} /> Back to Vehicles
        </button>
        <div className="card">
          <ErrorState title="Unable to load vehicle" message={error} onRetry={() => void loadDetail()} />
        </div>
      </div>
    );
  }

  if (loading || !vehicle) {
    return (
      <div className="fade-in">
        <button type="button" className="back-link" onClick={() => navigate('/vehicles')}>
          <ArrowLeft size={15} /> Back to Vehicles
        </button>
        <div className="card">
          <div className="state">
            <div className="state-title">Loading vehicle…</div>
            <div className="state-desc">Fetching data from the Neptune backend.</div>
          </div>
        </div>
      </div>
    );
  }

  const assignedRider = riders.find((r) => r.id === vehicle.assignedRiderId) ?? null;
  const history = requests.filter((r) => r.riderId === vehicle.assignedRiderId);

  const VehicleIcon = TYPE_ICONS[vehicle.vehicleType];

  const handleSave = async (values: VehicleFormValues) => {
    try {
      await updateVehicle(vehicle.id, {
        vehicleCode: values.vehicleCode,
        vehicleType: values.vehicleType,
        status: values.status,
      });
      toast.success(`Vehicle ${vehicle.vehicleCode} updated`);
      setEditOpen(false);
      await loadDetail();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Unable to save vehicle changes.'));
    }
  };

  const handleToggle = async () => {
    const next = vehicle.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await toggleVehicleStatus(vehicle.id, next);
      toast.success(
        next === 'ACTIVE'
          ? `Vehicle ${vehicle.vehicleCode} activated`
          : `Vehicle ${vehicle.vehicleCode} deactivated`,
      );
      setToggleOpen(false);
      await loadDetail();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Unable to update vehicle status.'));
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
      <button type="button" className="back-link" onClick={() => navigate('/vehicles')}>
        <ArrowLeft size={15} /> Back to Vehicles
      </button>

      <div className="hero">
        <span className="hero-avatar octagonal">
          <VehicleIcon style={{ width: 28, height: 28 }} />
        </span>
        <div className="hero-info">
          <h2 className="mono" style={{ letterSpacing: '0.03em' }}>
            {vehicle.vehicleCode}
          </h2>
          <div className="hero-meta">
            <span>{TYPE_LABELS[vehicle.vehicleType]}</span>
            <StatusBadge status={vehicle.status} />
          </div>
        </div>
        <div className="hero-actions">
          <SecondaryButton onClick={() => setEditOpen(true)}>
            <Pencil size={15} /> Edit
          </SecondaryButton>
          <PrimaryButton onClick={() => setToggleOpen(true)}>
            <Power size={15} />
            {vehicle.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </PrimaryButton>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-stack">
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">
                <Truck /> Vehicle Information
              </h3>
            </div>
            <div className="card-body">
              <div className="info-list">
                <div className="info-item">
                  <div className="k">Vehicle Code</div>
                  <div className="v mono normal">{vehicle.vehicleCode}</div>
                </div>
                <div className="info-item">
                  <div className="k">Vehicle Type</div>
                  <div className="v normal">{TYPE_LABELS[vehicle.vehicleType]}</div>
                </div>
                <div className="info-item">
                  <div className="k">Created Date</div>
                  <div className="v normal">{formatDate(vehicle.createdDate)}</div>
                </div>
                <div className="info-item">
                  <div className="k">Fleet Registration ID</div>
                  <div className="v mono normal">{vehicle.id}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3 className="card-title">
                <ShieldCheck /> Current Status
              </h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <StatusBadge status={vehicle.status} />
                <span className="muted" style={{ fontSize: 12.5 }}>
                  {vehicle.status === 'ACTIVE'
                    ? 'This vehicle is available for collection runs.'
                    : 'This vehicle is out of service and cannot be assigned.'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="detail-stack">
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">
                <Bike /> Assigned Rider
              </h3>
            </div>
            <div className="card-body">
              {assignedRider ? (
                <div className="info-list">
                  <div className="info-item">
                    <div className="k">Rider</div>
                    <div className="v normal">{assignedRider.fullName}</div>
                  </div>
                  <div className="info-item">
                    <div className="k">Mobile</div>
                    <div className="v normal">{assignedRider.mobile}</div>
                  </div>
                  <div className="info-item">
                    <div className="k">Registration Number</div>
                    <div className="v mono normal">{assignedRider.vehicleNumber}</div>
                  </div>
                  <div className="info-item">
                    <div className="k">Rider Status</div>
                    <div className="v">
                      <StatusBadge status={assignedRider.status} />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="muted" style={{ fontSize: 13 }}>
                  No rider is currently linked to this vehicle.
                </p>
              )}
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
                <div className="state-desc">
                  Requests moved with this vehicle will be listed here.
                </div>
              </div>
            }
          />
        </div>
      </div>

      <VehicleFormModal
        open={editOpen}
        initial={vehicle}
        onClose={() => setEditOpen(false)}
        onSave={handleSave}
      />

      <ConfirmationDialog
        open={toggleOpen}
        title={vehicle.status === 'ACTIVE' ? 'Deactivate vehicle' : 'Activate vehicle'}
        message={
          vehicle.status === 'ACTIVE'
            ? `Vehicle ${vehicle.vehicleCode} will be taken out of service.`
            : `Vehicle ${vehicle.vehicleCode} will be returned to service.`
        }
        confirmLabel={vehicle.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        destructive={vehicle.status === 'ACTIVE'}
        onConfirm={handleToggle}
        onCancel={() => setToggleOpen(false)}
      />
    </div>
  );
}
