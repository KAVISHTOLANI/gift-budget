import { useMemo, useState, type ReactNode } from 'react';
import { DemoTag, EmptyState, Field, Landing, NotFound, Notice, PageHead, Shell, uid, useFlash, usePersistentState, useRoute } from './shared/ui';
import { DataTable, useTable, type Column } from './shared/table';
import { addDays, addMonths, formatDay, relativeDays, todayISO } from './shared/dates';
import {
  STATUSES,
  STATUS_LABEL,
  advance,
  committed,
  daysTo,
  givenBefore,
  isPast,
  nextDate,
  occasionSummary,
  perPerson,
  round,
  shopBy,
  validateGift,
  validateOccasion,
  type Gift,
  type Occasion,
  type Person,
  type Status,
} from './lib/gifts';

const KEY = 'presently:store';
const NAV = [
  { to: '/', label: 'Overview' },
  { to: '/occasions', label: 'Occasions' },
  { to: '/people', label: 'People' },
  { to: '/gifts', label: 'All gifts' },
];
const money = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

interface Store {
  people: Person[];
  occasions: Occasion[];
  gifts: Gift[];
}

export function demoStore(today: string): Store {
  const people: Person[] = [
    { id: 'demo-mia', name: 'Mia', relation: 'Sister', likes: 'Climbing, sci-fi novels, good coffee', demo: true },
    { id: 'demo-dad', name: 'Dad', relation: 'Parent', likes: 'Gardening, crosswords, jazz', demo: true },
    { id: 'demo-oli', name: 'Oli', relation: 'Nephew, age 7', likes: 'Dinosaurs, building sets', demo: true },
    { id: 'demo-sana', name: 'Sana', relation: 'Friend', likes: 'Ceramics, hiking', demo: true },
    { id: 'demo-team', name: 'Work team (secret gift exchange)', relation: 'Colleagues', likes: 'Spending limit $25', demo: true },
  ];
  const holiday = nextDate({ date: addDays(today, 32), yearly: false }, today);
  const occasions: Occasion[] = [
    { id: 'demo-winter', name: 'Winter holidays', date: holiday, yearly: true, budget: 320, bufferDays: 10, demo: true },
    { id: 'demo-dad-bday', name: 'Dad’s birthday', date: addDays(today, 12), yearly: true, budget: 80, bufferDays: 5, demo: true },
    { id: 'demo-sana-wed', name: 'Sana’s wedding', date: addMonths(today, 5), yearly: false, budget: 150, bufferDays: 21, demo: true },
  ];
  const lastYear = addMonths(holiday, -12);
  const gift = (id: string, personId: string, occasionId: string | null, title: string, status: Status, estimate: number | null, actual: number | null = null, where = '', notes = '', givenOn?: string): Gift => ({ id: `demo-${id}`, personId, occasionId, title, status, estimate, actual, where, notes, givenOn, demo: true });
  const gifts: Gift[] = [
    gift('h1', 'demo-mia', 'demo-winter', 'Chalk bag and brush set', 'bought', 40, 36.5, 'Demo Outdoor Shop'),
    gift('h2', 'demo-mia', 'demo-winter', 'Signed sci-fi paperback', 'idea', 25),
    gift('h3', 'demo-dad', 'demo-winter', 'Pruning shears', 'planned', 45, null, 'Demo Garden Centre'),
    gift('h4', 'demo-oli', 'demo-winter', 'Dinosaur building kit', 'wrapped', 55, 49.99, 'Demo Toys'),
    gift('h5', 'demo-team', 'demo-winter', 'Desk plant in a ceramic pot', 'planned', 22),
    gift('b1', 'demo-dad', 'demo-dad-bday', 'Jazz vinyl reissue', 'bought', 35, 32, 'Demo Records'),
    gift('b2', 'demo-dad', 'demo-dad-bday', 'Crossword book', 'idea', 12),
    gift('w1', 'demo-sana', 'demo-sana-wed', 'Hand-thrown serving bowl', 'idea', 120, null, '', 'Check the registry first'),
    gift('p1', 'demo-mia', null, 'Coffee subscription (3 months)', 'idea', 45),
    gift('old1', 'demo-dad', 'demo-winter', 'Jazz vinyl box set', 'given', 60, 58, 'Demo Records', 'Last year', lastYear),
    gift('old2', 'demo-oli', 'demo-winter', 'Dinosaur pyjamas', 'given', 20, 18, '', '', lastYear),
  ];
  return { people, occasions, gifts };
}

export default function App() {
  const [route, navigate] = useRoute();
  const today = todayISO();
  const [store, setStore] = usePersistentState<Store>(KEY, () => demoStore(today));
  const ctx = { store, setStore, today, navigate };
  const occ = route.match(/^\/occasion\/(.+)$/);
  const person = route.match(/^\/person\/(.+)$/);
  let page: ReactNode;
  if (route === '/') page = <Home />;
  else if (route === '/occasions') page = <Occasions {...ctx} />;
  else if (occ) page = <OccasionPage {...ctx} id={occ[1]} />;
  else if (route === '/people') page = <People {...ctx} />;
  else if (person) page = <PersonPage {...ctx} id={person[1]} />;
  else if (route === '/gifts') page = <AllGifts {...ctx} />;
  else page = <NotFound />;
  return (
    <Shell name="Presently" wordmark={['Present', 'ly']} nav={NAV} route={route} cta={{ to: '/occasions', label: 'Plan an occasion' }} footerNote="Gift lists stay in this browser — nobody can peek.">
      {page}
    </Shell>
  );
}

type Ctx = { store: Store; setStore: (s: Store) => void; today: string; navigate: (to: string) => void };

function BudgetMeter({ o, gifts }: { o: Occasion; gifts: Gift[] }) {
  const s = occasionSummary(o, gifts, todayISO());
  const scale = Math.max(o.budget, s.committed, 1);
  return (
    <div className="meter-wrap">
      <div className={`meter ${s.over ? 'is-over' : ''}`} role="img" aria-label={`${money(s.spent)} spent and ${money(s.committed)} committed of a ${money(o.budget)} budget`}>
        <span className="m-committed" style={{ width: `${(s.committed / scale) * 100}%` }} />
        <span className="m-spent" style={{ width: `${(s.spent / scale) * 100}%` }} />
        <i className="m-budget" style={{ left: `${(o.budget / scale) * 100}%` }} />
      </div>
      <div className="row-between small"><span>{money(s.spent)} spent · {money(s.committed)} committed</span><span className={s.over ? 'over' : 'muted'}>{s.over ? `${money(-s.remaining)} over` : `${money(s.remaining)} left`} of {money(o.budget)}</span></div>
    </div>
  );
}

function HeroPreview() {
  const today = todayISO();
  const s = demoStore(today);
  const o = s.occasions[0];
  const list = occasionSummary(o, s.gifts, today).gifts;
  return (
    <div className="hero-pr">
      <div className="row-between"><div><p className="eyebrow">{relativeDays(daysTo(nextDate(o, today), today))} · shop by {formatDay(shopBy(o, today), { day: 'numeric', month: 'short' })}</p><strong className="hero-pr-name">{o.name}</strong></div></div>
      <BudgetMeter o={o} gifts={s.gifts} />
      <ul className="tags-list">
        {list.map((g, i) => (
          <li key={g.id} className={`gift-tag st-${g.status}`} style={{ ['--i' as string]: i }}>
            <span className="gt-title">{g.title}</span>
            <span className="small muted">{s.people.find((p) => p.id === g.personId)?.name} · {STATUS_LABEL[g.status]}{committed(g) ? ` · ${money(committed(g))}` : ''}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Home() {
  return (
    <Landing
      eyebrow="Gift planner & budget"
      title={<>Thoughtful gifts, <em>on budget.</em></>}
      lead="Keep ideas for each person all year, set a budget for each occasion, and follow every gift from idea to given. Presently shows what’s committed, what’s spent and when you need to shop by."
      primary={{ href: '#/occasions', label: 'See upcoming occasions' }}
      secondary={{ href: '#/people', label: 'Browse people' }}
      previewLabel="Next occasion — demo data"
      preview={<HeroPreview />}
      steps={[
        { title: 'Add people and occasions', body: 'Birthdays repeat every year; weddings happen once. Each occasion has a budget and a delivery buffer.' },
        { title: 'Collect ideas', body: 'Jot ideas whenever they come up, with a price guess, and attach them to an occasion later.' },
        { title: 'Move them along', body: 'Idea → planned → bought → wrapped → given. The budget meter fills as you go.' },
      ]}
      stepsIntro="Presently opens with five labelled demo people, three occasions and some of last year’s gifts. Clear them when you’re ready."
      features={[
        { title: 'Shop-by dates', body: 'A countdown to each occasion and the last day to order so it arrives in time.' },
        { title: 'Committed vs spent', body: 'Planned gifts count their estimate; bought ones count what you actually paid.' },
        { title: 'No repeats', body: 'Presently warns you if someone has already been given something similar.' },
        { title: 'Who’s still missing', body: 'Each occasion lists the people who don’t have a gift planned yet.' },
      ]}
      note="Everything stays in this browser, so a shared family computer may not be the best place for surprise lists."
      closing={{ title: <>Write down the idea <em>before you forget it.</em></>, action: { href: '#/gifts', label: 'Add a gift idea' } }}
    />
  );
}

/* ---------- Occasions ---------- */
function Occasions({ store, setStore, today, navigate }: Ctx) {
  const [d, setD] = useState({ name: '', date: '', yearly: true, budget: '', bufferDays: '7' });
  const [submitted, setSubmitted] = useState(false);
  const [flash, setFlash] = useFlash();
  const errors = submitted ? validateOccasion(d) : {};
  const upcoming = store.occasions.filter((o) => !isPast(o, today)).sort((a, b) => nextDate(a, today).localeCompare(nextDate(b, today)));
  const past = store.occasions.filter((o) => isPast(o, today));
  function add(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(validateOccasion(d)).length) return;
    const id = uid('occ');
    setStore({ ...store, occasions: [...store.occasions, { id, name: d.name.trim(), date: d.date, yearly: d.yearly, budget: round(Number(d.budget)), bufferDays: Number(d.bufferDays) }] });
    navigate(`/occasion/${id}`);
  }
  return (
    <div className="stack">
      <PageHead eyebrow="Occasions" title={<>What’s <em>coming up.</em></>} />
      {flash && <Notice kind={flash.kind} onDismiss={() => setFlash(null)}>{flash.text}</Notice>}
      {store.occasions.length === 0 && <EmptyState title="No occasions yet" actions={<button type="button" className="btn" onClick={() => setStore(demoStore(today))}>Load demo data</button>}>Add a birthday or holiday below to start planning.</EmptyState>}
      <div className="grid-3 occ-grid">
        {upcoming.map((o, i) => {
          const date = nextDate(o, today), sb = shopBy(o, today);
          const days = daysTo(date, today);
          return (
            <a key={o.id} href={`#/occasion/${o.id}`} className="card occ-card" data-reveal style={{ ['--i' as string]: i }}>
              <span className="occ-count"><b>{days}</b><small>{days === 1 ? 'day' : 'days'}</small></span>
              <strong className="occ-name">{o.name}</strong>
              <span className="small muted">{formatDay(date, { weekday: 'short', day: 'numeric', month: 'long' })}{o.yearly ? ' · every year' : ''}</span>
              <span className={`small ${sb < today ? 'over' : ''}`}>{sb < today ? 'Shop-by date has passed' : `Shop by ${formatDay(sb, { day: 'numeric', month: 'short' })} (${relativeDays(daysTo(sb, today))})`}</span>
              <BudgetMeter o={o} gifts={store.gifts} />
              {o.demo && <DemoTag />}
            </a>
          );
        })}
      </div>
      {past.length > 0 && <p className="small muted">Past one-off occasions: {past.map((o) => <a key={o.id} href={`#/occasion/${o.id}`}>{o.name}</a>).reduce<ReactNode[]>((a, x, i) => (i ? [...a, ', ', x] : [x]), [])}</p>}
      <form className="card stack" onSubmit={add} noValidate aria-labelledby="new-occ">
        <h2 id="new-occ" className="h3">Add an occasion</h2>
        <div className="form-grid">
          <Field label="Name" error={errors.name}>{(p) => <input {...p} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="e.g. Mia’s birthday" />}</Field>
          <Field label="Date" error={errors.date}>{(p) => <input {...p} type="date" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} />}</Field>
          <Field label="Budget (USD)" error={errors.budget}>{(p) => <input {...p} inputMode="decimal" value={d.budget} onChange={(e) => setD({ ...d, budget: e.target.value })} />}</Field>
          <Field label="Shop this many days ahead" hint="Delivery or making time" error={errors.bufferDays}>{(p) => <input {...p} inputMode="numeric" value={d.bufferDays} onChange={(e) => setD({ ...d, bufferDays: e.target.value })} />}</Field>
        </div>
        <label className="check"><input type="checkbox" checked={d.yearly} onChange={(e) => setD({ ...d, yearly: e.target.checked })} /> Repeats every year</label>
        <div><button className="btn btn-primary" type="submit">Add occasion</button></div>
      </form>
      {store.occasions.some((o) => o.demo) && <div><button type="button" className="btn btn-ghost btn-sm" onClick={() => { setStore({ people: store.people.filter((p) => !p.demo), occasions: store.occasions.filter((o) => !o.demo), gifts: store.gifts.filter((g) => !g.demo) }); setFlash({ kind: 'success', text: 'Demo data removed.' }); }}>Clear demo data</button></div>}
    </div>
  );
}

function GiftForm({ store, setStore, today, occasionId, personId, onDone }: Ctx & { occasionId?: string | null; personId?: string; onDone?: (title: string) => void }) {
  const [d, setD] = useState({ personId: personId ?? '', occasionId: occasionId ?? '', title: '', estimate: '', actual: '', status: 'idea' as Status, where: '' });
  const [submitted, setSubmitted] = useState(false);
  const errors = submitted ? validateGift(d) : {};
  const warn = d.personId && d.title.trim() ? givenBefore(d.personId, d.title, store.gifts) : [];
  function add(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(validateGift(d)).length) return;
    setStore({ ...store, gifts: [...store.gifts, { id: uid('gift'), personId: d.personId, occasionId: d.occasionId || null, title: d.title.trim(), estimate: d.estimate.trim() ? round(Number(d.estimate)) : null, actual: d.actual.trim() ? round(Number(d.actual)) : null, status: d.status, where: d.where.trim(), notes: '', givenOn: d.status === 'given' ? today : undefined }] });
    onDone?.(d.title.trim());
    setD({ ...d, title: '', estimate: '', actual: '', where: '' });
    setSubmitted(false);
  }
  return (
    <form className="stack" onSubmit={add} noValidate>
      <div className="form-grid">
        {!personId && <Field label="For" error={errors.personId}>{(p) => <select {...p} value={d.personId} onChange={(e) => setD({ ...d, personId: e.target.value })}><option value="">Choose…</option>{store.people.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>}</Field>}
        <Field label="Gift" error={errors.title}>{(p) => <input {...p} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="e.g. Hiking socks" />}</Field>
        {occasionId === undefined && <Field label="Occasion">{(p) => <select {...p} value={d.occasionId} onChange={(e) => setD({ ...d, occasionId: e.target.value })}><option value="">Not decided</option>{store.occasions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>}</Field>}
        <Field label="Estimated price" error={errors.estimate}>{(p) => <input {...p} inputMode="decimal" value={d.estimate} onChange={(e) => setD({ ...d, estimate: e.target.value })} />}</Field>
        <Field label="Status">{(p) => <select {...p} value={d.status} onChange={(e) => setD({ ...d, status: e.target.value as Status })}>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>}</Field>
        {d.status !== 'idea' && d.status !== 'planned' && <Field label="Price paid" error={errors.actual}>{(p) => <input {...p} inputMode="decimal" value={d.actual} onChange={(e) => setD({ ...d, actual: e.target.value })} />}</Field>}
        <Field label="Where to buy">{(p) => <input {...p} value={d.where} onChange={(e) => setD({ ...d, where: e.target.value })} />}</Field>
      </div>
      {warn.length > 0 && <Notice kind="warn">Already given something similar: “{warn[0].title}”{warn[0].givenOn ? ` on ${formatDay(warn[0].givenOn)}` : ''}.</Notice>}
      <div><button className="btn btn-primary" type="submit">Add gift</button></div>
    </form>
  );
}

function OccasionPage({ store, setStore, today, navigate, id }: Ctx & { id: string }) {
  const o = store.occasions.find((x) => x.id === id);
  const [flash, setFlash] = useFlash();
  if (!o) return <EmptyState title="Occasion not found" actions={<a className="btn btn-primary" href="#/occasions">Back to occasions</a>} />;
  const s = occasionSummary(o, store.gifts, today);
  const date = nextDate(o, today);
  const missing = store.people.filter((p) => !s.gifts.some((g) => g.personId === p.id && g.status !== 'idea'));
  const name = (pid: string) => store.people.find((p) => p.id === pid)?.name ?? 'Someone';
  const update = (gid: string, patch: Partial<Gift>) => setStore({ ...store, gifts: store.gifts.map((g) => (g.id === gid ? { ...g, ...patch } : g)) });
  function move(g: Gift) {
    const next = advance(g.status);
    if ((next === 'bought') && g.actual == null) {
      const v = window.prompt(`What did “${g.title}” cost?`, g.estimate != null ? String(g.estimate) : '');
      if (v === null) return;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) return setFlash({ kind: 'error', text: 'Enter a price of 0 or more.' });
      update(g.id, { status: next, actual: round(n) });
    } else update(g.id, { status: next, givenOn: next === 'given' ? today : g.givenOn });
    setFlash({ kind: 'success', text: `“${g.title}” → ${STATUS_LABEL[next]}.` });
  }
  return (
    <div className="stack">
      <PageHead eyebrow={<><a href="#/occasions">Occasions</a> / {formatDay(date, { day: 'numeric', month: 'long', year: 'numeric' })}</>} title={o.name} description={`${relativeDays(daysTo(date, today))} · shop by ${formatDay(shopBy(o, today), { day: 'numeric', month: 'short' })}`}
        actions={<button type="button" className="btn btn-danger" onClick={() => { if (window.confirm(`Delete “${o.name}”? Its gifts stay as unassigned ideas.`)) { setStore({ ...store, occasions: store.occasions.filter((x) => x.id !== o.id), gifts: store.gifts.map((g) => (g.occasionId === o.id ? { ...g, occasionId: null } : g)) }); navigate('/occasions'); } }}>Delete</button>} />
      {flash && <Notice kind={flash.kind} onDismiss={() => setFlash(null)}>{flash.text}</Notice>}
      <section className="card stack" aria-label="Budget"><BudgetMeter o={o} gifts={store.gifts} /><p className="legend"><span><i className="k-spent" />Spent (bought, wrapped, given)</span><span><i className="k-committed" />Committed (planned estimates)</span><span><i className="k-budget" />Budget</span></p></section>
      {missing.length > 0 && <Notice kind="info">No gift planned yet for: {missing.map((p) => p.name).join(', ')}.</Notice>}
      <div className="board" aria-label="Gifts by status">
        {STATUSES.map((st) => {
          const list = s.gifts.filter((g) => g.status === st);
          return (
            <section key={st} className={`col st-${st}`} aria-labelledby={`col-${st}`}>
              <h2 id={`col-${st}`} className="col-head"><span>{STATUS_LABEL[st]}</span><span className="badge">{list.length}</span></h2>
              {list.length === 0 ? <p className="small muted col-empty">—</p> : (
                <ul className="cards">
                  {list.map((g) => {
                    const warn = givenBefore(g.personId, g.title, store.gifts, g.id);
                    return (
                      <li key={g.id} className="gift-card">
                        <strong>{g.title}</strong>
                        <span className="small muted">For {name(g.personId)}{g.where && ` · ${g.where}`}</span>
                        <span className="small">{g.actual != null && st !== 'idea' && st !== 'planned' ? money(g.actual) : g.estimate != null ? `~${money(g.estimate)}` : 'No price yet'}</span>
                        {warn.length > 0 && st !== 'given' && <span className="badge badge-warn">Similar to a past gift</span>}
                        {g.demo && <DemoTag />}
                        <div className="row nowrap">
                          {st !== 'given' && <button type="button" className="btn btn-sm" onClick={() => move(g)} aria-label={`Move ${g.title} to ${STATUS_LABEL[advance(st)]}`}>→ {STATUS_LABEL[advance(st)]}</button>}
                          <button type="button" className="icon-btn" aria-label={`Delete ${g.title}`} onClick={() => setStore({ ...store, gifts: store.gifts.filter((x) => x.id !== g.id) })}>✕</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      <section className="card stack" aria-labelledby="add-g"><h2 id="add-g" className="h3">Add a gift for {o.name}</h2><GiftForm store={store} setStore={setStore} today={today} navigate={navigate} occasionId={o.id} onDone={(t) => setFlash({ kind: 'success', text: `Added “${t}”.` })} /></section>
      <section className="card stack" aria-labelledby="pp">
        <h2 id="pp" className="h3">Per person</h2>
        <div className="table-wrap"><table className="table"><caption className="sr-only">Gift totals per person for {o.name}</caption><thead><tr><th scope="col">Person</th><th scope="col" className="num">Gifts</th><th scope="col" className="num">Committed</th><th scope="col" className="num">Spent</th></tr></thead>
          <tbody>{perPerson(store.people, s.gifts, o.id).filter((r) => r.count).map((r) => <tr key={r.person.id}><th scope="row"><a href={`#/person/${r.person.id}`}>{r.person.name}</a></th><td className="num">{r.count}</td><td className="num">{money(r.committed)}</td><td className="num">{money(r.spent)}</td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}

/* ---------- People ---------- */
function People({ store, setStore }: Ctx) {
  const [d, setD] = useState({ name: '', relation: '', likes: '' });
  const [err, setErr] = useState<string | null>(null);
  const [flash, setFlash] = useFlash();
  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!d.name.trim()) return setErr('Enter a name.');
    setErr(null);
    setStore({ ...store, people: [...store.people, { id: uid('person'), name: d.name.trim(), relation: d.relation.trim(), likes: d.likes.trim() }] });
    setFlash({ kind: 'success', text: `Added ${d.name.trim()}.` });
    setD({ name: '', relation: '', likes: '' });
  }
  return (
    <div className="stack">
      <PageHead eyebrow="People" title={<>Who you’re <em>shopping for.</em></>} />
      {flash && <Notice kind={flash.kind} onDismiss={() => setFlash(null)}>{flash.text}</Notice>}
      {store.people.length === 0 ? <EmptyState title="Nobody yet">Add the people you buy gifts for.</EmptyState> : (
        <div className="grid-3">
          {store.people.map((p, i) => {
            const ideas = store.gifts.filter((g) => g.personId === p.id && g.status === 'idea').length;
            const given = store.gifts.filter((g) => g.personId === p.id && g.status === 'given').length;
            return (
              <a key={p.id} className="card person-card" href={`#/person/${p.id}`} data-reveal style={{ ['--i' as string]: i }}>
                <span className="initial" aria-hidden="true">{p.name[0]}</span>
                <strong>{p.name}</strong>
                <span className="small muted">{p.relation || '—'}</span>
                {p.likes && <span className="small">Likes: {p.likes}</span>}
                <span className="small">{ideas} idea{ideas === 1 ? '' : 's'} · {given} given before</span>
                {p.demo && <DemoTag />}
              </a>
            );
          })}
        </div>
      )}
      <form className="card stack" onSubmit={add} noValidate>
        <h2 className="h3">Add a person</h2>
        <div className="form-grid">
          <Field label="Name" error={err}>{(p) => <input {...p} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />}</Field>
          <Field label="Relationship">{(p) => <input {...p} value={d.relation} onChange={(e) => setD({ ...d, relation: e.target.value })} />}</Field>
          <Field label="Likes, sizes, wish-list notes">{(p) => <input {...p} value={d.likes} onChange={(e) => setD({ ...d, likes: e.target.value })} />}</Field>
        </div>
        <div><button className="btn btn-primary" type="submit">Add person</button></div>
      </form>
    </div>
  );
}

function PersonPage({ store, setStore, today, navigate, id }: Ctx & { id: string }) {
  const p = store.people.find((x) => x.id === id);
  const [flash, setFlash] = useFlash();
  if (!p) return <EmptyState title="Person not found" actions={<a className="btn btn-primary" href="#/people">Back to people</a>} />;
  const list = store.gifts.filter((g) => g.personId === p.id);
  const occName = (oid: string | null) => (oid ? store.occasions.find((o) => o.id === oid)?.name ?? 'Deleted occasion' : 'No occasion yet');
  return (
    <div className="stack">
      <PageHead eyebrow={<><a href="#/people">People</a> / {p.relation || 'Person'}</>} title={p.name} description={p.likes ? `Likes: ${p.likes}` : undefined}
        actions={<button type="button" className="btn btn-danger" onClick={() => { if (window.confirm(`Remove ${p.name} and all their gifts?`)) { setStore({ ...store, people: store.people.filter((x) => x.id !== p.id), gifts: store.gifts.filter((g) => g.personId !== p.id) }); navigate('/people'); } }}>Remove</button>} />
      {flash && <Notice kind={flash.kind} onDismiss={() => setFlash(null)}>{flash.text}</Notice>}
      <div className="grid-2">
        <section className="card stack"><h2 className="h3">Ideas and plans</h2>
          {list.filter((g) => g.status !== 'given').length === 0 ? <p className="muted small">No ideas yet.</p> : <ul className="list">{list.filter((g) => g.status !== 'given').map((g) => <li key={g.id} className="row-between"><span>{g.title} <span className="small muted">· {occName(g.occasionId)}</span></span><span className="badge">{STATUS_LABEL[g.status]}</span></li>)}</ul>}
        </section>
        <section className="card stack"><h2 className="h3">Given before</h2>
          {list.filter((g) => g.status === 'given').length === 0 ? <p className="muted small">Nothing recorded yet.</p> : <ul className="list">{list.filter((g) => g.status === 'given').sort((a, b) => (b.givenOn ?? '').localeCompare(a.givenOn ?? '')).map((g) => <li key={g.id} className="row-between"><span>{g.title}</span><span className="small muted">{g.givenOn ? formatDay(g.givenOn, { month: 'short', year: 'numeric' }) : ''}{g.actual != null ? ` · ${money(g.actual)}` : ''}</span></li>)}</ul>}
        </section>
      </div>
      <section className="card stack"><h2 className="h3">Add an idea for {p.name}</h2><GiftForm store={store} setStore={setStore} today={today} navigate={navigate} personId={p.id} onDone={(t) => setFlash({ kind: 'success', text: `Added “${t}”.` })} /></section>
    </div>
  );
}

/* ---------- All gifts ---------- */
type Row = Gift & { person: string; occasion: string };
function AllGifts({ store, setStore, today, navigate }: Ctx) {
  const [flash, setFlash] = useFlash();
  const [st, setSt] = useState('');
  const [q, setQ] = useState('');
  const rows: Row[] = useMemo(() => store.gifts.filter((g) => (!st || g.status === st) && g.title.toLowerCase().includes(q.trim().toLowerCase())).map((g) => ({ ...g, person: store.people.find((p) => p.id === g.personId)?.name ?? '—', occasion: g.occasionId ? store.occasions.find((o) => o.id === g.occasionId)?.name ?? '—' : 'Not decided' })), [store, st, q]);
  const columns: Column<Row>[] = [
    { key: 'title', label: 'Gift', sort: (g) => g.title, render: (g) => <>{g.title}{g.demo && <> <DemoTag /></>}</> },
    { key: 'person', label: 'For', sort: (g) => g.person, render: (g) => <a href={`#/person/${g.personId}`}>{g.person}</a> },
    { key: 'occ', label: 'Occasion', sort: (g) => g.occasion, render: (g) => (g.occasionId ? <a href={`#/occasion/${g.occasionId}`}>{g.occasion}</a> : <span className="muted">{g.occasion}</span>) },
    { key: 'st', label: 'Status', sort: (g) => STATUSES.indexOf(g.status), render: (g) => <span className={`badge sb-${g.status}`}>{STATUS_LABEL[g.status]}</span> },
    { key: 'price', label: 'Price', num: true, sort: (g) => g.actual ?? g.estimate, render: (g) => (g.actual != null ? money(g.actual) : g.estimate != null ? `~${money(g.estimate)}` : '—') },
  ];
  const table = useTable(rows, columns, { initialSort: 'st' });
  return (
    <div className="stack">
      <PageHead eyebrow="All gifts" title={<>Every idea, <em>in one place.</em></>} description={`${money(round(rows.reduce((s, g) => s + committed(g), 0)))} committed across the gifts shown.`} />
      {flash && <Notice kind={flash.kind} onDismiss={() => setFlash(null)}>{flash.text}</Notice>}
      {store.people.length === 0 ? <EmptyState title="Add people first" actions={<a className="btn btn-primary" href="#/people">Add people</a>}>Gifts belong to someone.</EmptyState> : (
        <>
          <section className="card stack"><h2 className="h3">Quick idea</h2><GiftForm store={store} setStore={setStore} today={today} navigate={navigate} onDone={(t) => setFlash({ kind: 'success', text: `Added “${t}”.` })} /></section>
          <div className="card stack">
            <div className="filters">
              <Field label="Search" className="grow">{(p) => <input {...p} type="search" value={q} onChange={(e) => setQ(e.target.value)} />}</Field>
              <Field label="Status">{(p) => <select {...p} value={st} onChange={(e) => setSt(e.target.value)}><option value="">All</option>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>}</Field>
            </div>
            <DataTable caption="All gifts" columns={columns} table={table} rowKey={(g) => g.id} empty="No gifts match." />
          </div>
        </>
      )}
      <p className="small muted">Showing ideas through {formatDay(addMonths(today, 12), { month: 'long', year: 'numeric' })} and anything given before.</p>
    </div>
  );
}
