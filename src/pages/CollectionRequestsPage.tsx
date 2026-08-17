import { Eye } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { EmptyState, ErrorState } from '../components/states';
import { FilterDropdown } from '../components/FilterDropdown';
import { IconButton } from '../components/buttons';
import { Pagination } from '../components/Pagination';
import { StatusBadge } from '../components/StatusBadge';
import { SearchBar } from '../components/SearchBar';
import { apiErrorMessage, fetchCollectors, fetchCollectionRequests, fetchRiders } from '../lib/api';
import type { CollectionRequest } from '../types';
import { formatDate } from '../utils/format';

const PAGE_SIZE = 6;

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const DATE_OPTIONS = [
  { value: 'ALL', label: 'Any Date' },
  { value: 'TODAY', label: 'Today' },
  { value: 'WEEK', label: 'Last 7 days' },
  { value: 'MONTH', label: 'This month' },
];

export function CollectionRequestsPage() {
  const navigate = useNavigate();
  const [collectors, setCollectors] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [requests, setRequests] = useState<CollectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [collectorFilter, setCollectorFilter] = useState('ALL');
  const [riderFilter, setRiderFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const loadRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const [collectorList, riderList, requestList] = await Promise.all([
        fetchCollectors(),
        fetchRiders(),
        fetchCollectionRequests(),
      ]);
      setCollectors(collectorList);
      setRiders(riderList);
      setRequests(requestList);
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to load collection requests from the Neptune backend.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, []);

  const collectorName = (id: string) => collectors.find((c) => c.id === id)?.fullName ?? '—';
  const riderName = (id: string | null) => (id === null ? '—' : riders.find((r) => r.id === id)?.fullName ?? '—');

  const collectorOptions = [{ value: 'ALL', label: 'All Collectors' }, ...collectors.map((c) => ({ value: c.id, label: c.fullName }))];
  const riderOptions = [{ value: 'ALL', label: 'All Riders' }, { value: 'NONE', label: 'Not assigned to a rider' }, ...riders.map((r) => ({ value: r.id, label: r.fullName }))];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date();
    return [...requests]
      .filter((r) => {
        const matchesSearch = !q || r.id.toLowerCase().includes(q) || collectorName(r.collectorId).toLowerCase().includes(q) || riderName(r.riderId).toLowerCase().includes(q);
        const matchesStatus = status === 'ALL' || r.status === status;
        const matchesCollector = collectorFilter === 'ALL' || r.collectorId === collectorFilter;
        const matchesRider = riderFilter === 'ALL' || (riderFilter === 'NONE' ? r.riderId === null : r.riderId === riderFilter);

        const created = new Date(r.createdDate);
        let matchesDate = true;
        if (dateFilter === 'TODAY') matchesDate = r.createdDate.startsWith(new Date().toISOString().slice(0, 10));
        else if (dateFilter === 'WEEK') matchesDate = now.getTime() - created.getTime() <= 7 * 24 * 3600 * 1000;
        else if (dateFilter === 'MONTH') matchesDate = created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();

        return matchesSearch && matchesStatus && matchesCollector && matchesRider && matchesDate;
      })
      .sort((a, b) => b.createdDate.localeCompare(a.createdDate));
  }, [requests, search, status, dateFilter, collectorFilter, riderFilter, collectors, riders]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: Column<CollectionRequest>[] = [
    { key: 'id', header: 'Request ID', render: (r: CollectionRequest) => <span className="mono" style={{ fontWeight: 700 }}>{r.id}</span>, width: '118px' },
    { key: 'collector', header: 'Collector', render: (r: CollectionRequest) => collectorName(r.collectorId) },
    { key: 'location', header: 'Location', render: (r: CollectionRequest) => <span className="muted">{r.location}</span> },
    { key: 'created', header: 'Created Date', render: (r: CollectionRequest) => formatDate(r.createdDate) },
    { key: 'rider', header: 'Rider', render: (r: CollectionRequest) => riderName(r.riderId) },
    { key: 'status', header: 'Status', render: (r: CollectionRequest) => <StatusBadge status={r.status} /> },
    { key: 'actions', header: 'Actions', width: '70px', align: 'right', render: (r: CollectionRequest) => <span className="actions-cell" onClick={(e) => e.stopPropagation()}><IconButton label="View details" onClick={() => navigate(`/requests/${r.id}`)}><Eye size={16} /></IconButton></span> },
  ];

  const hasFilters = Boolean(search) || status !== 'ALL' || dateFilter !== 'ALL' || collectorFilter !== 'ALL' || riderFilter !== 'ALL';

  if (error && !loading) {
    return (
      <div className="fade-in">
        <div className="page-head"><div><h2>Collection Requests</h2><p>Unable to load request records.</p></div></div>
        <div className="card"><ErrorState title="Unable to load collection requests" message={error} onRetry={() => void loadRequests()} /></div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-head"><div><h2>Collection Requests</h2><p>{requests.length} requests · {filtered.length} match your filters</p></div></div>
      <div className="toolbar">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search request ID, collector or rider…" label="Search collection requests" />
        <FilterDropdown label="Status" value={status} options={STATUS_OPTIONS} onChange={(v) => { setStatus(v); setPage(1); }} />
        <FilterDropdown label="Date" value={dateFilter} options={DATE_OPTIONS} onChange={(v) => { setDateFilter(v); setPage(1); }} />
        <FilterDropdown label="Collector" value={collectorFilter} options={collectorOptions} onChange={(v) => { setCollectorFilter(v); setPage(1); }} />
        <FilterDropdown label="Rider" value={riderFilter} options={riderOptions} onChange={(v) => { setRiderFilter(v); setPage(1); }} />
        {hasFilters && (<button type="button" className="reset-filter" onClick={() => { setSearch(''); setStatus('ALL'); setDateFilter('ALL'); setCollectorFilter('ALL'); setRiderFilter('ALL'); setPage(1); }}>Reset filters</button>)}
      </div>
      <div className="table-card">
        <DataTable columns={columns} rows={pageRows} rowKey={(r) => r.id} loading={loading} onRowClick={(r) => navigate(`/requests/${r.id}`)} emptyState={<EmptyState icon="clipboard" title="No collection requests found" description={hasFilters ? 'No requests match the current search or filters.' : 'Collection requests submitted by collectors will appear here.'} />} />
        {!loading && filtered.length > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />}
      </div>
    </div>
  );
}