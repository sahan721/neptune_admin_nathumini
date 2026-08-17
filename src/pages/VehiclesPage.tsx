import { Bike, Eye, Pencil, Plus, Power, Truck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { DataTable } from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { EmptyState, ErrorState } from '../components/states';
import { FilterDropdown } from '../components/FilterDropdown';
import { IconButton, PrimaryButton } from '../components/buttons';
import { Pagination } from '../components/Pagination';
import { StatusBadge } from '../components/StatusBadge';
import { SearchBar } from '../components/SearchBar';
import { TukIcon } from '../components/icons';
import { useToast } from '../context/ToastContext';
import { apiErrorMessage, createVehicle, fetchRiders, fetchVehicles, toggleVehicleStatus, updateVehicle } from '../lib/api';
import type { Vehicle } from '../types';
import { formatDate } from '../utils/format';
import { VehicleFormModal } from './VehicleFormModal';
import type { VehicleFormValues } from './VehicleFormModal';

const PAGE_SIZE = 6;

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'All Types' },
  { value: 'TUK', label: 'Tuk (Three-Wheeler)' },
  { value: 'BIKE', label: 'Bike (Motorcycle)' },
];

const TYPE_ICONS = { TRUCK: Truck, TUK: TukIcon, BIKE: Bike };

function VehicleTypeCell({ vehicleType }: { vehicleType: Vehicle['vehicleType'] }) {
  const Icon = TYPE_ICONS[vehicleType];
  const label = vehicleType === 'TRUCK' ? 'Truck' : vehicleType === 'TUK' ? 'Tuk' : 'Bike';
  return (
    <span className="cell-primary">
      <span className="oct-icon small octagonal oct-light"><Icon /></span>
      <span className="cell-title">{label}</span>
    </span>
  );
}

export function VehiclesPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [vehicleType, setVehicleType] = useState('ALL');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [pendingToggle, setPendingToggle] = useState<Vehicle | null>(null);

  const riderName = (id: string | null) => riders.find((r) => r.id === id)?.fullName ?? '—';

  const loadVehicles = async () => {
    setLoading(true);
    setError('');
    try {
      const [vehicleList, riderList] = await Promise.all([fetchVehicles(), fetchRiders()]);
      setVehicles(vehicleList);
      setRiders(riderList);
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to load vehicles from the Neptune backend.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVehicles();
    if (params.get('new') === '1') {
      setEditing(null);
      setFormOpen(true);
    }
  }, [params]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vehicles.filter((v) => {
      const matchesSearch = !q || v.vehicleCode.toLowerCase().includes(q) || v.vehicleType.toLowerCase().includes(q) || riderName(v.assignedRiderId).toLowerCase().includes(q);
      const matchesStatus = status === 'ALL' || v.status === status;
      const matchesType = vehicleType === 'ALL' || v.vehicleType === vehicleType;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [vehicles, search, status, vehicleType, riders]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSave = async (values: VehicleFormValues) => {
    try {
      if (editing) {
        await updateVehicle(editing.id, {
          vehicleCode: values.vehicleCode,
          vehicleType: values.vehicleType,
          status: values.status,
        });
        toast.success(`Vehicle ${editing.vehicleCode} updated`);
      } else {
        await createVehicle({
          vehicleCode: values.vehicleCode,
          vehicleType: values.vehicleType,
          status: values.status,
        });
        toast.success(`Vehicle ${values.vehicleCode} added`);
      }
      setFormOpen(false);
      setEditing(null);
      await loadVehicles();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Unable to save vehicle changes.'));
    }
  };

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (v: Vehicle) => { setEditing(v); setFormOpen(true); };

  const confirmToggle = async () => {
    if (!pendingToggle) return;
    const next = pendingToggle.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await toggleVehicleStatus(pendingToggle.id, next);
      toast.success(next === 'ACTIVE' ? `Vehicle ${pendingToggle.vehicleCode} activated` : `Vehicle ${pendingToggle.vehicleCode} deactivated`);
      setPendingToggle(null);
      await loadVehicles();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Unable to update vehicle status.'));
      setPendingToggle(null);
    }
  };

  const columns: Column<Vehicle>[] = [
    { key: 'code', header: 'Vehicle Code', render: (v: Vehicle) => <span className="mono" style={{ fontWeight: 700 }}>{v.vehicleCode}</span> },
    { key: 'type', header: 'Vehicle Type', render: (v: Vehicle) => <VehicleTypeCell vehicleType={v.vehicleType} /> },
    { key: 'status', header: 'Status', render: (v: Vehicle) => <StatusBadge status={v.status} /> },
    { key: 'rider', header: 'Assigned Rider', render: (v: Vehicle) => riderName(v.assignedRiderId) },
    { key: 'created', header: 'Created Date', render: (v: Vehicle) => formatDate(v.createdDate) },
    { key: 'actions', header: 'Actions', width: '110px', align: 'right', render: (v: Vehicle) => (
      <span className="actions-cell" onClick={(e) => e.stopPropagation()}>
        <IconButton label="View" onClick={() => navigate(`/vehicles/${v.id}`)}><Eye size={16} /></IconButton>
        <IconButton label="Edit" onClick={() => openEdit(v)}><Pencil size={15} /></IconButton>
        <IconButton label={v.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} danger={v.status === 'ACTIVE'} onClick={() => setPendingToggle(v)}><Power size={15} /></IconButton>
      </span>
    ) },
  ];

  const hasFilters = Boolean(search) || status !== 'ALL' || vehicleType !== 'ALL';

  if (error && !loading) {
    return (
      <div className="fade-in">
        <div className="page-head"><div><h2>Vehicles</h2><p>Unable to load vehicle records.</p></div></div>
        <div className="card"><ErrorState title="Unable to load vehicles" message={error} onRetry={() => void loadVehicles()} /></div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-head"><div><h2>Vehicles</h2><p>{vehicles.length} vehicles registered · {filtered.length} match your filters</p></div><div className="page-actions"><PrimaryButton onClick={openCreate}><Plus size={15} /> Add Vehicle</PrimaryButton></div></div>
      <div className="toolbar">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search vehicle code, type or rider…" label="Search vehicles" />
        <FilterDropdown label="Status" value={status} options={STATUS_OPTIONS} onChange={(v) => { setStatus(v); setPage(1); }} />
        <FilterDropdown label="Type" value={vehicleType} options={TYPE_OPTIONS} onChange={(v) => { setVehicleType(v); setPage(1); }} />
        {hasFilters && (<button type="button" className="reset-filter" onClick={() => { setSearch(''); setStatus('ALL'); setVehicleType('ALL'); setPage(1); }}>Reset filters</button>)}
      </div>
      <div className="table-card">
        <DataTable columns={columns} rows={pageRows} rowKey={(v) => v.id} loading={loading} onRowClick={(v) => navigate(`/vehicles/${v.id}`)} emptyState={<EmptyState icon="inbox" title="No vehicles found" description={hasFilters ? 'No vehicles match the current search or filters.' : 'No vehicles registered yet. Add the first vehicle to get started.'} action={!hasFilters ? <PrimaryButton onClick={openCreate}><Plus size={15} /> Add Vehicle</PrimaryButton> : undefined} />} />
        {!loading && filtered.length > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />}
      </div>
      <VehicleFormModal open={formOpen} initial={editing} onClose={() => { setFormOpen(false); setEditing(null); }} onSave={handleSave} />
      <ConfirmationDialog open={pendingToggle !== null} title={pendingToggle?.status === 'ACTIVE' ? 'Deactivate vehicle' : 'Activate vehicle'} message={pendingToggle?.status === 'ACTIVE' ? `Vehicle ${pendingToggle.vehicleCode} will be taken out of service.` : `Vehicle ${pendingToggle?.vehicleCode} will be returned to service.`} confirmLabel={pendingToggle?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} destructive={pendingToggle?.status === 'ACTIVE'} onConfirm={confirmToggle} onCancel={() => setPendingToggle(null)} />
    </div>
  );
}