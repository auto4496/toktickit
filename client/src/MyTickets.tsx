import { FormEvent, useEffect, useState } from 'react';
import type { Requester } from './App';

type Category = { id: number; name: string };
type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
type TicketStatus = 'NEW';
type SortBy = 'createdAt' | 'updatedAt' | 'ticketNumber' | 'requestedPriority';
type SortDirection = 'asc' | 'desc';
type PageSize = 10 | 20 | 50;

type TicketSummary = {
  id: string;
  ticketNumber: string;
  ticketDate: string;
  summary: string;
  category: Category;
  relatedSystem: Category;
  requestedPriority: Priority;
  itPriority: Priority | null;
  currentStatus: TicketStatus;
  updatedAt: string;
};

type TicketMeta = {
  page: number;
  pageSize: PageSize;
  totalItems: number;
  totalPages: number;
  sortBy: SortBy;
  sortDirection: SortDirection;
};

type TicketQuery = {
  search: string;
  categoryId: string;
  requestedPriority: '' | Priority;
  currentStatus: '' | TicketStatus;
  sortBy: SortBy;
  sortDirection: SortDirection;
  page: number;
  pageSize: PageSize;
};

const priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH'];
const defaultQuery: TicketQuery = {
  search: '',
  categoryId: '',
  requestedPriority: '',
  currentStatus: '',
  sortBy: 'updatedAt',
  sortDirection: 'desc',
  page: 1,
  pageSize: 10,
};

const apiUrl = () => import.meta.env.VITE_API_URL ?? '';
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const isCategory = (value: unknown): value is Category =>
  isObject(value) &&
  typeof value.id === 'number' &&
  typeof value.name === 'string';
const isCategoryArray = (value: unknown): value is Category[] =>
  Array.isArray(value) && value.every(isCategory);
const isPriority = (value: unknown): value is Priority =>
  typeof value === 'string' && priorities.includes(value as Priority);
const isPageSize = (value: unknown): value is PageSize =>
  value === 10 || value === 20 || value === 50;
const isSortBy = (value: unknown): value is SortBy =>
  value === 'createdAt' ||
  value === 'updatedAt' ||
  value === 'ticketNumber' ||
  value === 'requestedPriority';
const isSortDirection = (value: unknown): value is SortDirection =>
  value === 'asc' || value === 'desc';

const isTicketSummary = (value: unknown): value is TicketSummary => {
  if (!isObject(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.ticketNumber === 'string' &&
    typeof value.ticketDate === 'string' &&
    typeof value.summary === 'string' &&
    isCategory(value.category) &&
    isCategory(value.relatedSystem) &&
    isPriority(value.requestedPriority) &&
    (value.itPriority === null || isPriority(value.itPriority)) &&
    value.currentStatus === 'NEW' &&
    typeof value.updatedAt === 'string'
  );
};

const parseTicketResponse = (value: unknown) => {
  if (!isObject(value) || !Array.isArray(value.data) || !value.data.every(isTicketSummary)) {
    return null;
  }
  if (!isObject(value.meta)) return null;
  const meta = value.meta;
  if (
    !Number.isInteger(meta.page) ||
    (meta.page as number) < 1 ||
    !isPageSize(meta.pageSize) ||
    !Number.isInteger(meta.totalItems) ||
    (meta.totalItems as number) < 0 ||
    !Number.isInteger(meta.totalPages) ||
    (meta.totalPages as number) < 0 ||
    !isSortBy(meta.sortBy) ||
    !isSortDirection(meta.sortDirection)
  ) {
    return null;
  }
  return { data: value.data as TicketSummary[], meta: meta as TicketMeta };
};

const buildQueryString = (query: TicketQuery) => {
  const parameters = new URLSearchParams();
  if (query.search) parameters.set('search', query.search);
  if (query.categoryId) parameters.set('categoryId', query.categoryId);
  if (query.requestedPriority) {
    parameters.set('requestedPriority', query.requestedPriority);
  }
  if (query.currentStatus) parameters.set('currentStatus', query.currentStatus);
  parameters.set('sortBy', query.sortBy);
  parameters.set('sortDirection', query.sortDirection);
  parameters.set('page', String(query.page));
  parameters.set('pageSize', String(query.pageSize));
  return parameters.toString();
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unavailable';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date);
};

const priorityLabel = (priority: Priority) =>
  priority.charAt(0) + priority.slice(1).toLowerCase();

function TicketViewLink({ ticket }: { ticket: TicketSummary }) {
  return (
    <a
      className="btn btn-outline-success ticket-view-action"
      href={`/tickets/${ticket.id}`}
      aria-label={`View Ticket ${ticket.ticketNumber}`}
    >
      View Ticket
    </a>
  );
}

export default function MyTickets({ requester }: { requester: Requester }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryState, setCategoryState] = useState<'loading' | 'ready' | 'failure'>(
    'loading',
  );
  const [categoryAttempt, setCategoryAttempt] = useState(0);
  const [searchDraft, setSearchDraft] = useState('');
  const [query, setQuery] = useState<TicketQuery>(defaultQuery);
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [meta, setMeta] = useState<TicketMeta | null>(null);
  const [listState, setListState] = useState<'loading' | 'loaded' | 'failure'>(
    'loading',
  );
  const [listAttempt, setListAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setCategoryState('loading');
    fetch(`${apiUrl()}/api/categories`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Category request failed.');
        const body = (await response.json()) as unknown;
        if (!isCategoryArray(body)) throw new Error('Invalid Category response.');
        if (!active) return;
        setCategories(body);
        setCategoryState('ready');
      })
      .catch(() => {
        if (active) {
          setCategories([]);
          setCategoryState('failure');
        }
      });
    return () => {
      active = false;
    };
  }, [categoryAttempt]);

  useEffect(() => {
    let active = true;
    setTickets([]);
    setMeta(null);
    setListState('loading');
    fetch(`${apiUrl()}/api/tickets?${buildQueryString(query)}`, {
      headers: { 'X-Requester-Id': requester.id },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Ticket request failed.');
        const parsed = parseTicketResponse((await response.json()) as unknown);
        if (!parsed) throw new Error('Invalid Ticket response.');
        if (!active) return;
        setTickets(parsed.data);
        setMeta(parsed.meta);
        setListState('loaded');
      })
      .catch(() => {
        if (active) {
          setTickets([]);
          setMeta(null);
          setListState('failure');
        }
      });
    return () => {
      active = false;
    };
  }, [listAttempt, query, requester.id]);

  const replaceQuery = (patch: Partial<TicketQuery>, resetPage = true) => {
    setQuery((current) => ({
      ...current,
      ...patch,
      ...(resetPage ? { page: 1 } : {}),
    }));
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const search = searchDraft.trim();
    setSearchDraft(search);
    replaceQuery({ search });
  };

  const clearFilters = () => {
    setSearchDraft('');
    setQuery((current) => ({
      ...current,
      search: '',
      categoryId: '',
      requestedPriority: '',
      currentStatus: '',
      page: 1,
    }));
  };

  const hasFilters = Boolean(
    query.search || query.categoryId || query.requestedPriority || query.currentStatus,
  );
  const resultStart = meta && meta.totalItems > 0 ? (meta.page - 1) * meta.pageSize + 1 : 0;
  const resultEnd = meta
    ? Math.min(meta.page * meta.pageSize, meta.totalItems)
    : 0;

  return (
    <main className="workspace my-tickets-page">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Requester workspace</p>
          <h1>My Tickets</h1>
          <p className="text-secondary">Tickets owned by {requester.name}</p>
        </div>
        <a className="btn btn-success btn-lg" href="/tickets/new">
          Create Ticket
        </a>
      </div>

      <section className="ticket-query-panel" aria-labelledby="ticket-query-heading">
        <h2 id="ticket-query-heading" className="visually-hidden">Search and filter tickets</h2>
        <form className="ticket-search" role="search" onSubmit={submitSearch}>
          <label htmlFor="ticket-search">Search tickets</label>
          <div className="ticket-search-row">
            <input
              id="ticket-search"
              type="search"
              maxLength={100}
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Ticket number, summary, or description"
            />
            <button className="btn btn-success" type="submit">Search</button>
          </div>
        </form>

        <div className="ticket-filter-grid">
          <label htmlFor="ticket-category">
            Category
            <select
              id="ticket-category"
              value={query.categoryId}
              disabled={categoryState !== 'ready'}
              onChange={(event) => replaceQuery({ categoryId: event.target.value })}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <label htmlFor="ticket-priority">
            Requested Priority
            <select
              id="ticket-priority"
              value={query.requestedPriority}
              onChange={(event) =>
                replaceQuery({ requestedPriority: event.target.value as '' | Priority })
              }
            >
              <option value="">All priorities</option>
              {priorities.map((priority) => (
                <option key={priority} value={priority}>{priorityLabel(priority)}</option>
              ))}
            </select>
          </label>
          <label htmlFor="ticket-status">
            Current Status
            <select
              id="ticket-status"
              value={query.currentStatus}
              onChange={(event) =>
                replaceQuery({ currentStatus: event.target.value as '' | TicketStatus })
              }
            >
              <option value="">All statuses</option>
              <option value="NEW">New</option>
            </select>
          </label>
          <label htmlFor="ticket-sort">
            Sort by
            <select
              id="ticket-sort"
              value={query.sortBy}
              onChange={(event) => replaceQuery({ sortBy: event.target.value as SortBy })}
            >
              <option value="updatedAt">Last Updated</option>
              <option value="createdAt">Ticket Date</option>
              <option value="ticketNumber">Ticket Number</option>
              <option value="requestedPriority">Requested Priority</option>
            </select>
          </label>
          <label htmlFor="ticket-direction">
            Sort direction
            <select
              id="ticket-direction"
              value={query.sortDirection}
              onChange={(event) =>
                replaceQuery({ sortDirection: event.target.value as SortDirection })
              }
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>
          <label htmlFor="ticket-page-size">
            Results per page
            <select
              id="ticket-page-size"
              value={query.pageSize}
              onChange={(event) =>
                replaceQuery({ pageSize: Number(event.target.value) as PageSize })
              }
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </label>
        </div>

        <div className="ticket-query-actions">
          <button
            className="btn btn-link"
            type="button"
            onClick={clearFilters}
            disabled={!hasFilters}
          >
            Clear Filters
          </button>
        </div>

        {categoryState === 'failure' && (
          <div className="alert alert-warning category-filter-error" role="alert">
            Category filters could not be loaded.
            <button
              className="btn btn-outline-dark"
              type="button"
              onClick={() => setCategoryAttempt((value) => value + 1)}
            >
              Retry Categories
            </button>
          </div>
        )}
      </section>

      {listState === 'loading' && (
        <section className="ticket-list-state" aria-live="polite" aria-busy="true">
          <p role="status">Loading your tickets...</p>
          <div className="ticket-skeleton" aria-hidden="true" />
          <div className="ticket-skeleton" aria-hidden="true" />
        </section>
      )}

      {listState === 'failure' && (
        <section className="alert alert-danger ticket-list-state" role="alert">
          <h2>Tickets could not be loaded</h2>
          <p>Try again. Your current search and filters have been kept.</p>
          <button
            className="btn btn-outline-danger"
            type="button"
            onClick={() => setListAttempt((value) => value + 1)}
          >
            Retry Tickets
          </button>
        </section>
      )}

      {listState === 'loaded' && meta?.totalItems === 0 && !hasFilters && (
        <section className="ticket-list-state empty-state">
          <h2>You have not created any tickets yet</h2>
          <p>Create your first Ticket to start tracking a request.</p>
          <a className="btn btn-success" href="/tickets/new">Create Ticket</a>
        </section>
      )}

      {listState === 'loaded' && meta?.totalItems === 0 && hasFilters && (
        <section className="ticket-list-state empty-state">
          <h2>No tickets match these filters</h2>
          <p>Change the search or filters and try again.</p>
          <button className="btn btn-outline-success" type="button" onClick={clearFilters}>
            Clear Filters
          </button>
        </section>
      )}

      {listState === 'loaded' && meta && meta.totalItems > 0 && (
        <section className="ticket-results" aria-labelledby="ticket-results-heading">
          <div className="ticket-results-summary">
            <h2 id="ticket-results-heading">Ticket results</h2>
            <p aria-live="polite">
              Showing {resultStart}–{resultEnd} of {meta.totalItems} tickets
            </p>
          </div>

          {tickets.length === 0 ? (
            <div className="ticket-list-state empty-state">
              <h3>No tickets on this page</h3>
              <p>Return to a previous page to view results.</p>
            </div>
          ) : (
            <>
              <div className="ticket-table-wrap">
                <table className="ticket-table">
                  <caption className="visually-hidden">Tickets owned by {requester.name}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Ticket Number</th>
                      <th scope="col">Summary</th>
                      <th scope="col">Category</th>
                      <th scope="col">Requested Priority</th>
                      <th scope="col">IT Priority</th>
                      <th scope="col">Current Status</th>
                      <th scope="col">Last Updated</th>
                      <th scope="col"><span className="visually-hidden">Action</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => (
                      <tr key={ticket.id}>
                        <td className="ticket-number-cell">{ticket.ticketNumber}</td>
                        <td className="ticket-summary-cell" title={ticket.summary}>{ticket.summary}</td>
                        <td>{ticket.category.name}</td>
                        <td><span className={`ticket-badge priority-${ticket.requestedPriority.toLowerCase()}`}>{priorityLabel(ticket.requestedPriority)}</span></td>
                        <td>{ticket.itPriority ? priorityLabel(ticket.itPriority) : 'Not assigned'}</td>
                        <td><span className="ticket-badge status-new">New</span></td>
                        <td><time dateTime={ticket.updatedAt}>{formatDate(ticket.updatedAt)}</time></td>
                        <td><TicketViewLink ticket={ticket} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="ticket-card-list">
                {tickets.map((ticket) => (
                  <article className="ticket-list-card" key={ticket.id}>
                    <p className="ticket-card-number">{ticket.ticketNumber}</p>
                    <h3>{ticket.summary}</h3>
                    <dl>
                      <div><dt>Category</dt><dd>{ticket.category.name}</dd></div>
                      <div><dt>Requested Priority</dt><dd>{priorityLabel(ticket.requestedPriority)}</dd></div>
                      <div><dt>IT Priority</dt><dd>{ticket.itPriority ? priorityLabel(ticket.itPriority) : 'Not assigned'}</dd></div>
                      <div><dt>Current Status</dt><dd>New</dd></div>
                      <div><dt>Last Updated</dt><dd><time dateTime={ticket.updatedAt}>{formatDate(ticket.updatedAt)}</time></dd></div>
                    </dl>
                    <TicketViewLink ticket={ticket} />
                  </article>
                ))}
              </div>
            </>
          )}

          <nav className="ticket-pagination" aria-label="Ticket result pages">
            <button
              className="btn btn-outline-success"
              type="button"
              disabled={query.page <= 1}
              onClick={() => replaceQuery({ page: query.page - 1 }, false)}
            >
              Previous
            </button>
            <span>Page {meta.page} of {Math.max(meta.totalPages, 1)}</span>
            <button
              className="btn btn-outline-success"
              type="button"
              disabled={meta.totalPages === 0 || query.page >= meta.totalPages}
              onClick={() => replaceQuery({ page: query.page + 1 }, false)}
            >
              Next
            </button>
          </nav>
        </section>
      )}
    </main>
  );
}
