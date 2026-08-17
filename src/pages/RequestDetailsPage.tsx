import {
  ArrowLeft,
  Bike,
  ClipboardList,
  MapPin,
  Phone,
  Truck,
  Weight,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ErrorState } from '../components/states';
import { StatusBadge } from '../components/StatusBadge';
import { TukIcon } from '../components/icons';
import {
  apiErrorMessage,
  fetchCollectors,
  fetchCollectionRequestById,
  fetchRiders,
  fetchVehicles,
} from '../lib/api';
import type { CollectionRequest } from '../types';
import { formatDateTime, formatWeight } from '../utils/format';

const TYPE_ICONS = { TRUCK: Truck, TUK: TukIcon, BIKE: Bike } as const;

interface TimelineStepData {
  label: string;
  time: string | null;
  state: 'done' | 'current' | 'pending' | 'cancelled';
}

function timelineFor(request: CollectionRequest): TimelineStepData[] {
  if (request.status === 'CANCELLED') {
    return [
      { label: 'Pending', time: request.createdDate, state: 'done' },
      {
        label: 'Cancelled',
        time: request.cancelledDate,
        state: 'cancelled',
      },
    ];
  }
  const isCompleted = request.status === 'COMPLETED';
  const isAccepted = request.status === 'ACCEPTED' || isCompleted;
  return [
    { label: 'Pending', time: request.createdDate, state: 'done' },
    {
      label: 'Accepted',
      time: isAccepted ? request.acceptedDate : null,
      state: isAccepted ? 'done' : 'current',
    },
    {
      label: 'Completed',
      time: isCompleted ? request.collectionDate : null,
      state: isCompleted ? 'done' : 'pending',
    },
  ];
}

function TimelineMarker({ state }: { state: TimelineStepData['state'] }) {
  if (state === 'done' || state === 'cancelled') {
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }
  return <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />;
}

export function RequestDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [request, setRequest] = useState<any | null>(null);
  const [collectors, setCollectors] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const [data, collectorList, riderList, vehicleList] = await Promise.all([
        fetchCollectionRequestById(id ?? ''),
        fetchCollectors(),
        fetchRiders(),
        fetchVehicles(),
      ]);
      setRequest(data);
      setCollectors(collectorList);
      setRiders(riderList);
      setVehicles(vehicleList);
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to load request details from the Neptune backend.'));
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
        <button type="button" className="back-link" onClick={() => navigate('/requests')}>
          <ArrowLeft size={15} /> Back to Collection Requests
        </button>
        <div className="card">
          <ErrorState title="Unable to load request" message={error} onRetry={() => void loadDetail()} />
        </div>
      </div>
    );
  }

  if (loading || !request) {
    return (
      <div className="fade-in">
        <button type="button" className="back-link" onClick={() => navigate('/requests')}>
          <ArrowLeft size={15} /> Back to Collection Requests
        </button>
        <div className="card">
          <div className="state">
            <div className="state-title">Loading request…</div>
            <div className="state-desc">Fetching data from the Neptune backend.</div>
          </div>
        </div>
      </div>
    );
  }

  const collector = collectors.find((c) => c.id === request.collectorId) ?? null;
  const rider = riders.find((r) => r.id === request.riderId) ?? null;
  const vehicle = vehicles.find((v) => v.id === request.vehicleId) ?? null;
  const timeline = timelineFor(request);

  const VehicleIcon = vehicle ? TYPE_ICONS[vehicle.vehicleType] : null;

  return (
    <div className="fade-in">
      <button type="button" className="back-link" onClick={() => navigate('/requests')}>
        <ArrowLeft size={15} /> Back to Collection Requests
      </button>

      <div className="hero">
        <span className="hero-avatar octagonal">
          <ClipboardList style={{ width: 26, height: 26 }} />
        </span>
        <div className="hero-info">
          <h2 className="mono" style={{ letterSpacing: '0.03em' }}>
            {request.id}
          </h2>
          <div className="hero-meta">
            <span className="muted">Created {formatDateTime(request.createdDate)}</span>
            <StatusBadge status={request.status} />
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-stack">
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">Request Information</h3>
            </div>
            <div className="card-body">
              <div className="info-list">
                <div className="info-item">
                  <div className="k">Request ID</div>
                  <div className="v mono normal">{request.id}</div>
                </div>
                <div className="info-item">
                  <div className="k">Status</div>
                  <div className="v">
                    <StatusBadge status={request.status} />
                  </div>
                </div>
                <div className="info-item">
                  <div className="k">Created Date</div>
                  <div className="v normal">{formatDateTime(request.createdDate)}</div>
                </div>
                <div className="info-item">
                  <div className="k">Associated Assignment</div>
                  <div className="v mono normal">{request.assignmentId ?? '—'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3 className="card-title">Collector</h3>
            </div>
            <div className="card-body">
              <div className="info-list">
                <div className="info-item">
                  <div className="k">Name</div>
                  <div className="v normal">{collector?.fullName ?? '—'}</div>
                </div>
                <div className="info-item">
                  <div className="k">Mobile</div>
                  <div className="v">
                    <Phone /> {collector?.mobile ?? '—'}
                  </div>
                </div>
                <div className="info-item span-2">
                  <div className="k">Location</div>
                  <div className="v normal">{request.location}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3 className="card-title">Rider</h3>
            </div>
            <div className="card-body">
              {rider ? (
                <div className="info-list">
                  <div className="info-item">
                    <div className="k">Name</div>
                    <div className="v normal">{rider.fullName}</div>
                  </div>
                  <div className="info-item">
                    <div className="k">Mobile</div>
                    <div className="v">
                      <Phone /> {rider.mobile}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="muted" style={{ fontSize: 13 }}>
                  No rider assigned to this request yet.
                </p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3 className="card-title">Vehicle</h3>
            </div>
            <div className="card-body">
              {vehicle ? (
                <div className="info-list">
                  <div className="info-item">
                    <div className="k">Vehicle Code</div>
                    <div className="v mono normal">{vehicle.vehicleCode}</div>
                  </div>
                  <div className="info-item">
                    <div className="k">Vehicle Type</div>
                    <div className="v normal">
                      {VehicleIcon && <VehicleIcon style={{ width: 15, height: 15 }} />}
                      {vehicle.vehicleType === 'TRUCK'
                        ? 'Truck (Waste Truck)'
                        : vehicle.vehicleType === 'TUK'
                          ? 'Tuk (Three-Wheeler)'
                          : 'Bike (Motorcycle)'}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="muted" style={{ fontSize: 13 }}>
                  No vehicle linked to this request yet.
                </p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3 className="card-title">Collection</h3>
            </div>
            <div className="card-body">
              <div className="info-list">
                <div className="info-item">
                  <div className="k">Total Weight</div>
                  <div className="v">
                    <Weight /> {formatWeight(request.totalWeight)}
                  </div>
                </div>
                <div className="info-item">
                  <div className="k">Collection Date / Time</div>
                  <div className="v normal">
                    {request.collectionDate ? formatDateTime(request.collectionDate) : 'Not collected yet'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="detail-stack">
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">Status Timeline</h3>
            </div>
            <div className="card-body">
              <div className="timeline">
                {timeline.map((step, idx) => (
                  <div
                    key={step.label}
                    className={`timeline-step ${
                      step.state === 'cancelled'
                        ? 'cancelled'
                        : step.state === 'done'
                          ? 'done'
                          : step.state === 'current'
                            ? 'current'
                            : ''
                    }`}
                  >
                    <span className="timeline-node">
                      <TimelineMarker state={step.state} />
                    </span>
                    <span className="step-label">
                      {step.label}
                      {idx === 0 && request.status === 'PENDING' && (
                        <span className="step-badge" style={{ background: 'var(--np-amber-bg)', color: 'var(--np-amber)' }}>
                          Current
                        </span>
                      )}
                    </span>
                    <div className="step-time">
                      {step.time
                        ? formatDateTime(step.time)
                        : step.state === 'pending'
                          ? 'Waiting for this stage'
                          : `Awaiting ${step.label.toLowerCase()}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3 className="card-title">
                <MapPin /> Location
              </h3>
            </div>
            <div className="card-body">
              <div className="map-placeholder">
                <div className="map-grid" aria-hidden="true" />
                <div className="map-road r1" aria-hidden="true" />
                <div className="map-road r2" aria-hidden="true" />
                <div className="map-pin" aria-hidden="true">
                  <MapPin />
                </div>
                <div className="map-note">
                  Map placeholder — {request.location}. Live map will load once the Neptune API is
                  connected.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
