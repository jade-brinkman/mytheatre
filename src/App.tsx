import { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAxCI5_TWOy0hNBWJTw9OokDrbJP1cawuw',
  authDomain: 'mytheatre-82be0.firebaseapp.com',
  projectId: 'mytheatre-82be0',
  storageBucket: 'mytheatre-82be0.firebasestorage.app',
  messagingSenderId: '521330541081',
  appId: '1:521330541081:web:3ac1da16b25295373a2088',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ─── DATA ─────────────────────────────────────────────────────────────────────
const GENRES = [
  'Comédie',
  'Comédie héroïque',
  'Comédie musicale',
  'Drame',
  'Opéra',
  'Théâtre contemporain',
  "Théâtre de l'absurde",
  'Tragédie',
  'Tragicomédie',
  'Vaudeville',
  'Autre',
];
const THEATRES = [
  'Comédie-Française',
  "Odéon - Théâtre de l'Europe",
  'Théâtre 14',
  'Théâtre Antoine',
  'Théâtre de Chaillot',
  "Théâtre de l'Aquarium",
  "Théâtre de l'Atelier",
  "Théâtre de l'Œuvre",
  'Théâtre de la Bastille',
  'Théâtre de la Gaîté-Montparnasse',
  'Théâtre de la Madeleine',
  'Théâtre de la Renaissance',
  'Théâtre de la Tempête',
  'Théâtre de la Ville',
  'Théâtre de Poche-Montparnasse',
  'Théâtre de Paris',
  'Théâtre des Amandiers',
  'Théâtre des Bouffes du Nord',
  'Théâtre des Mathurins',
  'Théâtre des Variétés',
  'Théâtre du Châtelet',
  'Théâtre du Gymnase',
  'Théâtre du Lucernaire',
  'Théâtre du Marais',
  'Théâtre du Palais-Royal',
  'Théâtre du Rond-Point',
  'Théâtre du Soleil',
  'Théâtre Hébertot',
  'Théâtre Montparnasse',
  'Théâtre National de la Colline',
  'Autre',
];
const DEFAULT_PLAYS = [
  {
    title: 'Phèdre',
    playwright: 'Jean Racine',
    year: '1677',
    genre: 'Tragédie',
    duration: '2h15',
    cast: 'Marie Dupont, Jean-Pierre Martin, Sophie Leroy',
    synopsis:
      "La passion dévastatrice de Phèdre pour son beau-fils Hippolyte — une tragédie de l'amour impossible et de la culpabilité.",
    theater: 'Comédie-Française',
    posterUrl: '',
  },
  {
    title: 'Le Misanthrope',
    playwright: 'Molière',
    year: '1666',
    genre: 'Comédie',
    duration: '2h00',
    cast: 'Antoine Leblanc, Clara Rousseau, Marc Petit',
    synopsis:
      "Alceste, homme intègre et honnête, se heurte à l'hypocrisie de la société du XVIIe siècle.",
    theater: "Odéon - Théâtre de l'Europe",
    posterUrl: '',
  },
  {
    title: 'En attendant Godot',
    playwright: 'Samuel Beckett',
    year: '1953',
    genre: "Théâtre de l'absurde",
    duration: '2h30',
    cast: 'Pierre Durand, Luc Bernard, Emma Moreau',
    synopsis:
      'Vladimir et Estragon attendent indéfiniment Godot qui ne vient jamais.',
    theater: 'Théâtre de la Ville',
    posterUrl: '',
  },
  {
    title: 'Cyrano de Bergerac',
    playwright: 'Edmond Rostand',
    year: '1897',
    genre: 'Comédie héroïque',
    duration: '3h00',
    cast: 'François Girard, Isabelle Martin, Thomas Renard',
    synopsis:
      "Cyrano, poète au grand nez et au grand cœur, aime Roxane mais n'ose se déclarer.",
    theater: 'Comédie-Française',
    posterUrl: '',
  },
  {
    title: 'Roméo et Juliette',
    playwright: 'William Shakespeare',
    year: '1597',
    genre: 'Tragédie',
    duration: '2h45',
    cast: 'Julien Morel, Camille Lefèvre, Henri Gauthier',
    synopsis:
      "L'amour interdit de deux jeunes gens issus de familles ennemies.",
    theater: 'Théâtre du Châtelet',
    posterUrl: '',
  },
  {
    title: 'Hedda Gabler',
    playwright: 'Henrik Ibsen',
    year: '1891',
    genre: 'Drame',
    duration: '2h20',
    cast: 'Amélie Dumont, Gilles Fontaine, Laura Petit',
    synopsis:
      'Hedda, brillante et destructrice, étouffe dans un mariage sans amour.',
    theater: 'Théâtre National de la Colline',
    posterUrl: '',
  },
  {
    title: 'Tartuffe',
    playwright: 'Molière',
    year: '1664',
    genre: 'Comédie',
    duration: '2h10',
    cast: 'Arnaud Dupuis, Sylvie Blanc, Michel Renaud',
    synopsis: "Un faux dévot s'infiltre dans une famille bourgeoise.",
    theater: "Odéon - Théâtre de l'Europe",
    posterUrl: '',
  },
  {
    title: 'Les Bonnes',
    playwright: 'Jean Genet',
    year: '1947',
    genre: 'Drame',
    duration: '1h45',
    cast: 'Nathalie Blanc, Julie Noir, René Sombre',
    synopsis:
      'Deux bonnes jouent à être leur maîtresse dans une spirale de jeu, de haine et de désir.',
    theater: 'Théâtre du Rond-Point',
    posterUrl: '',
  },
];

// ─── LOGO ─────────────────────────────────────────────────────────────────────
const LOGO_URL = 'https://cdn-icons-png.flaticon.com/128/3681/3681529.png';

const LogoMark = ({ size = 36 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.22,
      background: 'var(--red)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      overflow: 'hidden',
    }}
  >
    <img
      src={LOGO_URL}
      alt="MyTheatre"
      style={{
        width: size * 0.78,
        height: size * 0.78,
        objectFit: 'contain',
        filter: 'brightness(0) invert(1)',
      }}
      onError={(e) => {
        e.target.style.display = 'none';
        e.target.parentNode.innerHTML = `<svg width="${size * 0.7}" height="${
          size * 0.7
        }" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><path d="M2 10s3-3 3-8h14c0 5 3 8 3 8"/><path d="M2 10h20"/><path d="M12 10v12"/><path d="M8 22h8"/></svg>`;
      }}
    />
  </div>
);

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --red:#B91C1C;--red-dark:#991B1B;--red-deeper:#7F1D1D;
    --gold:#C9A84C;--gold-light:#E8C97A;
    --cream:#FAFAF8;--cream2:#F3F2EE;--white:#FFFFFF;
    --ink:#1A1A1A;--ink2:#3D3D3D;--ink3:#6B6B6B;--ink4:#9B9B9B;
    --border:#E5E3DC;
    --shadow-sm:0 1px 3px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.05);
    --shadow-md:0 4px 16px rgba(0,0,0,0.10);
    --shadow-lg:0 12px 40px rgba(0,0,0,0.14),0 4px 12px rgba(0,0,0,0.08);
    --r-sm:8px;--r-md:12px;--r-lg:18px;--r-xl:24px;
  }
  html{scroll-behavior:smooth;-webkit-font-smoothing:antialiased}
  body{background:var(--cream);color:var(--ink);font-family:'Inter',-apple-system,sans-serif;min-height:100vh}
  ::-webkit-scrollbar{width:5px}
  ::-webkit-scrollbar-thumb{background:var(--gold);border-radius:4px}
  input,textarea,select{outline:none;font-family:'Inter',sans-serif;background:var(--white);border:1.5px solid var(--border);color:var(--ink);border-radius:var(--r-sm);padding:11px 14px;width:100%;font-size:15px;transition:border-color .2s,box-shadow .2s;-webkit-appearance:none}
  input:focus,textarea:focus,select:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(201,168,76,.15)}
  input::placeholder,textarea::placeholder{color:var(--ink4)}
  button{cursor:pointer;font-family:'Inter',sans-serif;border:none;transition:all .18s;-webkit-tap-highlight-color:transparent}
  button:active{transform:scale(.97)}
  .fade{animation:fadeUp .3s cubic-bezier(.22,1,.36,1)}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
  @keyframes heartPop{0%{transform:scale(1)}40%{transform:scale(1.45)}70%{transform:scale(.9)}100%{transform:scale(1)}}
  .heart-pop{animation:heartPop .38s cubic-bezier(.22,1,.36,1)}
  @keyframes badgePop{0%{transform:scale(0)}70%{transform:scale(1.2)}100%{transform:scale(1)}}
  .badge-pop{animation:badgePop .3s cubic-bezier(.22,1,.36,1)}
  .serif{font-family:'Libre Baskerville',Georgia,serif}
`;

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Ic = ({ n, s = 20, c = 'currentColor', fill = 'none' }) => {
  const p = {
    catalogue: (
      <>
        <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
        <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
        <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
        <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
      </>
    ),
    community: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    profile: (
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    wishlist: (
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    ),
    heart: (
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    edit: (
      <>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </>
    ),
    trash: (
      <>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </>
    ),
    back: (
      <>
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </>
    ),
    logout: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </>
    ),
    check: <polyline points="20 6 9 17 4 12" />,
    close: (
      <>
        <path d="M18 6L6 18" />
        <path d="M6 6l12 12" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    ),
    location: (
      <>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
    star: (
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    ),
    adduser: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="16" y1="11" x2="22" y2="11" />
      </>
    ),
    chevron: <polyline points="6 9 12 15 18 9" />,
    comment: (
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    ),
    bell: (
      <>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </>
    ),
  };
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={c}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {p[n]}
    </svg>
  );
};

// ─── BUTTONS ─────────────────────────────────────────────────────────────────
const B = {
  primary: (x = {}) => ({
    padding: '11px 22px',
    borderRadius: 100,
    fontWeight: 600,
    fontSize: 14,
    background: 'var(--red)',
    color: 'white',
    boxShadow: '0 2px 8px rgba(185,28,28,.3)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    ...x,
  }),
  gold: (x = {}) => ({
    padding: '11px 22px',
    borderRadius: 100,
    fontWeight: 600,
    fontSize: 14,
    background: 'linear-gradient(135deg,var(--gold),var(--gold-light))',
    color: '#3D1F00',
    boxShadow: '0 2px 8px rgba(201,168,76,.35)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    ...x,
  }),
  soft: (x = {}) => ({
    padding: '10px 20px',
    borderRadius: 100,
    fontWeight: 500,
    fontSize: 14,
    background: 'var(--cream2)',
    color: 'var(--ink2)',
    border: '1.5px solid var(--border)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    ...x,
  }),
  ghost: (x = {}) => ({
    padding: '10px 20px',
    borderRadius: 100,
    fontWeight: 500,
    fontSize: 14,
    background: 'transparent',
    color: 'var(--red)',
    border: '1.5px solid var(--red)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    ...x,
  }),
  icon: (active = false, x = {}) => ({
    width: 36,
    height: 36,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: active ? 'rgba(201,168,76,.15)' : 'transparent',
    border: `1.5px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
    color: active ? 'var(--gold)' : 'var(--ink3)',
    ...x,
  }),
};

// ─── CARD ────────────────────────────────────────────────────────────────────
const Card = ({ children, style = {}, onClick, hover = false }) => {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => hover && setHov(true)}
      onMouseLeave={() => hover && setHov(false)}
      style={{
        background: 'var(--white)',
        borderRadius: 'var(--r-lg)',
        boxShadow: hov ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        transition: 'box-shadow .2s,transform .2s',
        transform: hov ? 'translateY(-3px)' : 'none',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ─── TOAST ───────────────────────────────────────────────────────────────────
let _toast = null;
const Toast = () => {
  const [list, setList] = useState([]);
  _toast = useCallback((msg, type = 'info') => {
    const id = Date.now();
    setList((p) => [...p, { id, msg, type }]);
    setTimeout(() => setList((p) => p.filter((t) => t.id !== id)), 3000);
  }, []);
  const colors = { success: '#166534', error: '#991B1B', info: '#1A1A1A' };
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 28,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        alignItems: 'center',
      }}
    >
      {list.map((t) => (
        <div
          key={t.id}
          style={{
            background: colors[t.type],
            color: 'white',
            padding: '12px 22px',
            borderRadius: 100,
            fontSize: 14,
            fontWeight: 500,
            boxShadow: 'var(--shadow-lg)',
            whiteSpace: 'nowrap',
            animation: 'fadeUp .3s ease',
          }}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
};
const toast = (m, t) => _toast?.(m, t);

// ─── STARS ───────────────────────────────────────────────────────────────────
const Stars = ({ value = 0, onChange, size = 18, readonly = false }) => {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          onClick={() => !readonly && onChange?.(i)}
          onMouseEnter={() => !readonly && setHover(i)}
          onMouseLeave={() => !readonly && setHover(0)}
          style={{
            fontSize: size,
            cursor: readonly ? 'default' : 'pointer',
            color: i <= (hover || value) ? 'var(--gold)' : 'var(--border)',
            transition: 'color .1s',
            userSelect: 'none',
            lineHeight: 1,
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
};

// ─── AVATAR ──────────────────────────────────────────────────────────────────
const Avatar = ({ user, size = 36 }) => {
  const name = user?.pseudo || user?.displayName || '?';
  return user?.photoURL ? (
    <img
      src={user.photoURL}
      alt={name}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        objectFit: 'cover',
        border: '2px solid var(--gold)',
        flexShrink: 0,
      }}
    />
  ) : (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--red)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Libre Baskerville,serif',
        fontWeight: 700,
        fontSize: size * 0.38,
        color: 'var(--gold)',
        border: '2px solid var(--gold)',
        flexShrink: 0,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

const Lbl = ({ children }) => (
  <label
    style={{
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '.06em',
      textTransform: 'uppercase',
      color: 'var(--ink4)',
      marginBottom: 6,
      display: 'block',
    }}
  >
    {children}
  </label>
);
const FRow = ({ children }) => (
  <div style={{ marginBottom: 16 }}>{children}</div>
);
const Empty = ({ icon, text, sub }) => (
  <div style={{ textAlign: 'center', padding: '52px 20px' }}>
    <div
      style={{
        width: 60,
        height: 60,
        borderRadius: '50%',
        background: 'var(--cream2)',
        border: '1.5px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 14px',
      }}
    >
      <Ic n={icon} s={24} c="var(--ink4)" />
    </div>
    <p style={{ color: 'var(--ink3)', fontSize: 15, fontWeight: 500 }}>
      {text}
    </p>
    {sub && (
      <p style={{ color: 'var(--ink4)', fontSize: 13, marginTop: 5 }}>{sub}</p>
    )}
  </div>
);
const Pill = ({ children, light = false }) => (
  <span
    style={{
      background: light ? 'rgba(255,255,255,.15)' : 'var(--cream2)',
      color: light ? 'rgba(255,255,255,.85)' : 'var(--ink2)',
      padding: '4px 12px',
      borderRadius: 100,
      fontSize: 12,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      border: `1px solid ${light ? 'rgba(255,255,255,.2)' : 'var(--border)'}`,
    }}
  >
    {children}
  </span>
);

// ─── THEATRE AUTOCOMPLETE ────────────────────────────────────────────────────
const TheatreInput = ({ value, onChange }) => {
  const [q, setQ] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const handleInput = (v) => {
    setQ(v);
    onChange(v);
    setFiltered(
      v.length > 0
        ? THEATRES.filter((t) => t.toLowerCase().includes(v.toLowerCase()))
        : []
    );
    setOpen(true);
  };
  const select = (t) => {
    setQ(t);
    onChange(t);
    setOpen(false);
    setFiltered([]);
  };
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          left: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
        }}
      >
        <Ic n="search" s={15} c="var(--ink4)" />
      </div>
      <input
        value={q}
        onChange={(e) => handleInput(e.target.value)}
        placeholder="Rechercher un théâtre…"
        style={{ paddingLeft: 36 }}
        onFocus={() => q.length > 0 && setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'var(--white)',
            border: '1.5px solid var(--border)',
            borderRadius: 'var(--r-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 500,
            maxHeight: 220,
            overflowY: 'auto',
            animation: 'slideDown .15s ease',
          }}
        >
          {filtered.map((t) => (
            <div
              key={t}
              onClick={() => select(t)}
              style={{
                padding: '11px 14px',
                fontSize: 14,
                cursor: 'pointer',
                borderBottom: '1px solid var(--cream2)',
                color: 'var(--ink)',
                transition: 'background .1s',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'var(--cream)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              {t}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── GENRE SELECT ────────────────────────────────────────────────────────────
const GenreSelect = ({ value, onChange }) => {
  const [custom, setCustom] = useState(
    !GENRES.slice(0, -1).includes(value) && !!value
  );
  return (
    <div>
      <select
        value={custom ? 'Autre' : value}
        onChange={(e) => {
          if (e.target.value === 'Autre') {
            setCustom(true);
            onChange('');
          } else {
            setCustom(false);
            onChange(e.target.value);
          }
        }}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B6B6B' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          paddingRight: 36,
          marginBottom: custom ? 8 : 0,
        }}
      >
        <option value="">Choisir un genre…</option>
        {GENRES.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
      {custom && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Saisir le genre…"
        />
      )}
    </div>
  );
};

// ─── POSTER ──────────────────────────────────────────────────────────────────
const Poster = ({ play, size = 120 }) => {
  const h = Math.round(size * 1.42);
  if (play?.posterUrl)
    return (
      <img
        src={play.posterUrl}
        alt={play.title}
        style={{
          width: size,
          height: h,
          objectFit: 'cover',
          borderRadius: 'var(--r-md)',
          display: 'block',
          flexShrink: 0,
        }}
      />
    );
  return (
    <div
      style={{
        width: size,
        height: h,
        background:
          'linear-gradient(160deg,var(--red) 0%,var(--red-deeper) 100%)',
        borderRadius: 'var(--r-md)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <img
        src={LOGO_URL}
        alt=""
        style={{
          width: size * 0.45,
          height: size * 0.45,
          objectFit: 'contain',
          filter: 'brightness(0) invert(1)',
          opacity: 0.85,
        }}
      />
      <div
        className="serif"
        style={{
          fontSize: Math.max(8, size * 0.088),
          color: 'rgba(255,255,255,.82)',
          textAlign: 'center',
          padding: '5px 8px',
          marginTop: 7,
          lineHeight: 1.3,
          fontStyle: 'italic',
        }}
      >
        {play?.title}
      </div>
    </div>
  );
};

// ─── PLAY FORM ───────────────────────────────────────────────────────────────
const PlayFormModal = ({ play, onClose, onSave }) => {
  const empty = {
    title: '',
    playwright: '',
    year: '',
    genre: '',
    duration: '',
    cast: '',
    synopsis: '',
    theater: '',
    posterUrl: '',
  };
  const [form, setForm] = useState(play ? { ...empty, ...play } : empty);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const handleSave = async () => {
    if (!form.title.trim() || !form.playwright.trim())
      return toast('Titre et auteur obligatoires', 'error');
    setLoading(true);
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      toast('Erreur : ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--white)',
          borderRadius: 'var(--r-xl)',
          width: '100%',
          maxWidth: 560,
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)',
        }}
        className="fade"
      >
        <div
          style={{
            padding: '24px 28px 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <h2 className="serif" style={{ fontSize: 20 }}>
            {play ? 'Modifier la pièce' : 'Ajouter une pièce'}
          </h2>
          <button style={B.icon(false)} onClick={onClose}>
            <Ic n="close" s={16} c="var(--ink3)" />
          </button>
        </div>
        <div style={{ padding: '0 28px 28px' }}>
          {[
            ['title', 'Titre *'],
            ['playwright', 'Auteur *'],
            ['year', 'Année'],
            ['duration', 'Durée (ex: 2h30)'],
            ['cast', 'Comédiens (séparés par des virgules)'],
          ].map(([k, label]) => (
            <FRow key={k}>
              <Lbl>{label}</Lbl>
              <input
                value={form[k]}
                onChange={(e) => set(k, e.target.value)}
                placeholder={label.replace(' *', '')}
              />
            </FRow>
          ))}
          <FRow>
            <Lbl>Genre</Lbl>
            <GenreSelect value={form.genre} onChange={(v) => set('genre', v)} />
          </FRow>
          <FRow>
            <Lbl>Théâtre</Lbl>
            <TheatreInput
              value={form.theater}
              onChange={(v) => set('theater', v)}
            />
          </FRow>
          <FRow>
            <Lbl>Synopsis</Lbl>
            <textarea
              value={form.synopsis}
              onChange={(e) => set('synopsis', e.target.value)}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </FRow>
          <FRow>
            <Lbl>URL de l'affiche (optionnel)</Lbl>
            <input
              value={form.posterUrl}
              onChange={(e) => set('posterUrl', e.target.value)}
              placeholder="https://…"
            />
          </FRow>
          <div
            style={{
              display: 'flex',
              gap: 10,
              justifyContent: 'flex-end',
              marginTop: 8,
            }}
          >
            <button style={B.soft()} onClick={onClose}>
              Annuler
            </button>
            <button style={B.gold()} onClick={handleSave} disabled={loading}>
              {loading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── REVIEW MODAL ────────────────────────────────────────────────────────────
const ReviewModal = ({ play, existing, onClose, onSave }) => {
  const [rating, setRating] = useState(existing?.rating || 0);
  const [comment, setComment] = useState(existing?.comment || '');
  const [loading, setLoading] = useState(false);
  const handleSave = async () => {
    if (!rating) return toast('Choisissez une note', 'error');
    setLoading(true);
    try {
      await onSave({ rating, comment, status: 'vu' });
      onClose();
    } catch (e) {
      toast('Erreur : ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--white)',
          borderRadius: 'var(--r-xl)',
          width: '100%',
          maxWidth: 460,
          boxShadow: 'var(--shadow-lg)',
        }}
        className="fade"
      >
        <div
          style={{
            padding: '24px 28px 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
          }}
        >
          <h2 className="serif" style={{ fontSize: 20 }}>
            Votre avis
          </h2>
          <button style={B.icon(false)} onClick={onClose}>
            <Ic n="close" s={16} c="var(--ink3)" />
          </button>
        </div>
        <p
          style={{
            padding: '0 28px',
            color: 'var(--ink3)',
            fontSize: 14,
            marginBottom: 22,
          }}
        >
          {play.title} — {play.playwright}
        </p>
        <div style={{ padding: '0 28px 28px' }}>
          <FRow>
            <Lbl>Note</Lbl>
            <Stars value={rating} onChange={setRating} size={28} />
          </FRow>
          <FRow>
            <Lbl>Commentaire (optionnel)</Lbl>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="Vos impressions…"
              style={{ resize: 'vertical' }}
            />
          </FRow>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button style={B.soft()} onClick={onClose}>
              Annuler
            </button>
            <button style={B.gold()} onClick={handleSave} disabled={loading}>
              {loading ? '…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── REVIEW COMMENTS ─────────────────────────────────────────────────────────
const ReviewComments = ({
  reviewId,
  reviewOwnerId,
  currentUser,
  userProfile,
}) => {
  const [comments, setComments] = useState([]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const unsub = onSnapshot(
      query(
        collection(db, 'reviewComments'),
        where('reviewId', '==', reviewId),
        orderBy('createdAt', 'asc')
      ),
      (snap) => {
        setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    return unsub;
  }, [reviewId, open]);

  const sendComment = async () => {
    if (!text.trim() || !currentUser) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'reviewComments'), {
        reviewId,
        userId: currentUser.uid,
        userPseudo: userProfile?.pseudo || 'Anonyme',
        text: text.trim(),
        createdAt: serverTimestamp(),
      });
      // Notification pour le propriétaire de l'avis (si ce n'est pas soi-même)
      if (reviewOwnerId && reviewOwnerId !== currentUser.uid) {
        await addDoc(collection(db, 'notifications'), {
          toUserId: reviewOwnerId,
          fromPseudo: userProfile?.pseudo || "Quelqu'un",
          type: 'comment',
          reviewId,
          text: text.trim(),
          read: false,
          createdAt: serverTimestamp(),
        });
      }
      setText('');
    } catch (e) {
      toast('Erreur', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 10 }}>
      <button
        style={{
          background: 'transparent',
          color: 'var(--ink4)',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 0',
        }}
        onClick={() => setOpen((p) => !p)}
      >
        <Ic n="comment" s={14} c="var(--ink4)" />
        {open ? 'Masquer' : 'Commenter'}
      </button>
      {open && (
        <div
          style={{
            marginTop: 10,
            paddingLeft: 12,
            borderLeft: '2px solid var(--border)',
          }}
        >
          {comments.length === 0 && (
            <p
              style={{
                color: 'var(--ink4)',
                fontSize: 13,
                marginBottom: 8,
                fontStyle: 'italic',
              }}
            >
              Aucun commentaire.
            </p>
          )}
          {comments.map((c) => (
            <div key={c.id} style={{ marginBottom: 10, fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
                {c.userPseudo}{' '}
              </span>
              <span style={{ color: 'var(--ink2)' }}>{c.text}</span>
            </div>
          ))}
          {currentUser && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Écrire un commentaire…"
                style={{ fontSize: 13, padding: '8px 12px', borderRadius: 100 }}
                onKeyDown={(e) => e.key === 'Enter' && sendComment()}
              />
              <button
                style={B.gold({
                  padding: '8px 16px',
                  fontSize: 13,
                  flexShrink: 0,
                })}
                onClick={sendComment}
                disabled={loading || !text.trim()}
              >
                Envoyer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── HEART BUTTON ────────────────────────────────────────────────────────────
const HeartButton = ({
  playId,
  playTitle,
  playPlaywright,
  currentUser,
  userProfile,
}) => {
  const [inWishlist, setInWishlist] = useState(false);
  const [reviewId, setReviewId] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!currentUser || !playId) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      query(
        collection(db, 'reviews'),
        where('playId', '==', playId),
        where('userId', '==', currentUser.uid),
        where('status', '==', 'a-voir')
      ),
      (snap) => {
        setInWishlist(!snap.empty);
        setReviewId(snap.empty ? null : snap.docs[0].id);
        setLoading(false);
      }
    );
    return unsub;
  }, [currentUser, playId]);
  const toggle = async () => {
    if (!currentUser)
      return toast('Connectez-vous pour utiliser la wishlist', 'error');
    setAnimating(true);
    setTimeout(() => setAnimating(false), 400);
    setLoading(true);
    try {
      if (inWishlist && reviewId) {
        await deleteDoc(doc(db, 'reviews', reviewId));
        toast('Retiré de la wishlist', 'info');
      } else {
        await addDoc(collection(db, 'reviews'), {
          playId,
          userId: currentUser.uid,
          userPseudo: userProfile?.pseudo || 'Anonyme',
          rating: 0,
          comment: '',
          status: 'a-voir',
          playTitle,
          playPlaywright,
          createdAt: serverTimestamp(),
        });
        toast('Ajouté à la wishlist !', 'success');
      }
    } catch (e) {
      toast('Erreur', 'error');
    } finally {
      setLoading(false);
    }
  };
  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={animating ? 'heart-pop' : ''}
      style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: inWishlist ? 'rgba(185,28,28,.08)' : 'var(--cream2)',
        border: `1.5px solid ${inWishlist ? 'var(--red)' : 'var(--border)'}`,
        transition: 'all .2s',
        flexShrink: 0,
      }}
    >
      <Ic
        n="heart"
        s={20}
        c={inWishlist ? 'var(--red)' : 'var(--ink4)'}
        fill={inWishlist ? 'var(--red)' : 'none'}
      />
    </button>
  );
};

// ─── PLAY DETAIL ─────────────────────────────────────────────────────────────
const PlayDetail = ({ playId, currentUser, userProfile, onBack }) => {
  const [play, setPlay] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [myReview, setMyReview] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const u1 = onSnapshot(doc(db, 'plays', playId), (snap) => {
      setPlay(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setLoading(false);
    });
    const u2 = onSnapshot(
      query(
        collection(db, 'reviews'),
        where('playId', '==', playId),
        where('status', '==', 'vu'),
        orderBy('createdAt', 'desc')
      ),
      (snap) => {
        const revs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setReviews(revs);
        if (currentUser)
          setMyReview(revs.find((r) => r.userId === currentUser.uid) || null);
      }
    );
    return () => {
      u1();
      u2();
    };
  }, [playId, currentUser]);
  const avg = reviews.length
    ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
    : null;
  const saveReview = async ({ rating, comment, status }) => {
    const data = {
      playId,
      userId: currentUser.uid,
      userPseudo: userProfile?.pseudo || 'Anonyme',
      rating,
      comment,
      status,
      playTitle: play.title,
      playPlaywright: play.playwright,
      createdAt: serverTimestamp(),
    };
    if (myReview) {
      await updateDoc(doc(db, 'reviews', myReview.id), data);
      toast('Avis mis à jour !', 'success');
    } else {
      await addDoc(collection(db, 'reviews'), data);
      toast('Avis ajouté !', 'success');
    }
  };
  const deleteReview = async () => {
    if (!myReview || !window.confirm('Supprimer votre avis ?')) return;
    await deleteDoc(doc(db, 'reviews', myReview.id));
    toast('Avis supprimé', 'info');
  };
  const deletePlay = async () => {
    if (!window.confirm('Supprimer cette pièce ?')) return;
    await deleteDoc(doc(db, 'plays', playId));
    toast('Pièce supprimée', 'info');
    onBack();
  };
  if (loading)
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          color: 'var(--ink4)',
        }}
      >
        Chargement…
      </div>
    );
  if (!play)
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          color: 'var(--ink4)',
        }}
      >
        Pièce introuvable.
      </div>
    );
  return (
    <div
      className="fade"
      style={{ minHeight: '100vh', background: 'var(--cream)' }}
    >
      <div
        style={{
          background:
            'linear-gradient(180deg,var(--red-deeper) 0%,var(--red) 100%)',
        }}
      >
        <div
          style={{ maxWidth: 900, margin: '0 auto', padding: '20px 24px 32px' }}
        >
          <button
            style={{
              ...B.soft({
                fontSize: 13,
                padding: '8px 16px',
                marginBottom: 24,
                background: 'rgba(255,255,255,.15)',
                border: '1px solid rgba(255,255,255,.25)',
                color: 'white',
                borderRadius: 100,
              }),
            }}
            onClick={onBack}
          >
            <Ic n="back" s={15} c="white" /> Retour
          </button>
          <div
            style={{
              display: 'flex',
              gap: 28,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}
          >
            <Poster play={play} size={160} />
            <div style={{ flex: 1, minWidth: 240 }}>
              <h1
                className="serif"
                style={{
                  fontSize: 30,
                  color: 'white',
                  lineHeight: 1.2,
                  marginBottom: 8,
                }}
              >
                {play.title}
              </h1>
              <p
                style={{
                  color: 'rgba(255,255,255,.75)',
                  fontSize: 16,
                  marginBottom: 16,
                  fontStyle: 'italic',
                }}
              >
                {play.playwright}
                {play.year ? ` · ${play.year}` : ''}
              </p>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginBottom: 18,
                }}
              >
                {play.genre && <Pill light>{play.genre}</Pill>}
                {play.duration && (
                  <Pill light>
                    <Ic n="clock" s={12} c="rgba(255,255,255,.7)" />
                    {play.duration}
                  </Pill>
                )}
                {play.theater && (
                  <Pill light>
                    <Ic n="location" s={12} c="rgba(255,255,255,.7)" />
                    {play.theater}
                  </Pill>
                )}
              </div>
              {avg && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'rgba(0,0,0,.2)',
                    padding: '8px 16px',
                    borderRadius: 100,
                    marginBottom: 18,
                  }}
                >
                  <Stars value={Math.round(avg)} readonly size={16} />
                  <span
                    style={{
                      color: 'var(--gold-light)',
                      fontWeight: 700,
                      fontSize: 17,
                    }}
                  >
                    {avg}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 13 }}>
                    / 5 · {reviews.length} avis
                  </span>
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                {currentUser && (
                  <HeartButton
                    playId={playId}
                    playTitle={play.title}
                    playPlaywright={play.playwright}
                    currentUser={currentUser}
                    userProfile={userProfile}
                  />
                )}
                {currentUser && (
                  <button
                    style={B.gold({ fontSize: 13 })}
                    onClick={() => setShowReview(true)}
                  >
                    <Ic n="star" s={14} c="#3D1F00" fill="#3D1F00" />
                    {myReview ? 'Modifier mon avis' : 'Donner mon avis'}
                  </button>
                )}
                {currentUser && myReview && (
                  <button
                    style={B.ghost({
                      fontSize: 13,
                      color: 'rgba(255,255,255,.8)',
                      borderColor: 'rgba(255,255,255,.3)',
                    })}
                    onClick={deleteReview}
                  >
                    <Ic n="trash" s={14} c="rgba(255,255,255,.8)" />
                    Supprimer mon avis
                  </button>
                )}
              </div>
              {currentUser && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    style={{
                      fontSize: 12,
                      color: 'rgba(255,255,255,.5)',
                      background: 'transparent',
                      textDecoration: 'underline',
                    }}
                    onClick={() => setShowEdit(true)}
                  >
                    Modifier la pièce
                  </button>
                  <span style={{ color: 'rgba(255,255,255,.3)' }}>·</span>
                  <button
                    style={{
                      fontSize: 12,
                      color: 'rgba(255,100,100,.7)',
                      background: 'transparent',
                      textDecoration: 'underline',
                    }}
                    onClick={deletePlay}
                  >
                    Supprimer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {play.synopsis && (
          <section style={{ marginBottom: 36 }}>
            <h3 className="serif" style={{ fontSize: 18, marginBottom: 14 }}>
              Synopsis
            </h3>
            <p
              style={{
                color: 'var(--ink2)',
                fontSize: 16,
                lineHeight: 1.8,
                fontStyle: 'italic',
                fontFamily: 'Libre Baskerville,serif',
              }}
            >
              {play.synopsis}
            </p>
          </section>
        )}
        {play.cast && (
          <section style={{ marginBottom: 36 }}>
            <h3 className="serif" style={{ fontSize: 18, marginBottom: 14 }}>
              Distribution
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {play.cast.split(',').map((a, i) => (
                <span
                  key={i}
                  style={{
                    background: 'var(--cream2)',
                    border: '1px solid var(--border)',
                    padding: '5px 14px',
                    borderRadius: 100,
                    fontSize: 13,
                    color: 'var(--ink2)',
                  }}
                >
                  {a.trim()}
                </span>
              ))}
            </div>
          </section>
        )}
        <section>
          <h3 className="serif" style={{ fontSize: 18, marginBottom: 16 }}>
            Avis ({reviews.length})
          </h3>
          {reviews.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                background: 'var(--white)',
                borderRadius: 'var(--r-lg)',
                border: '1px solid var(--border)',
              }}
            >
              <p style={{ color: 'var(--ink4)', fontSize: 14 }}>
                Aucun avis pour l'instant. Soyez le premier !
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {reviews.map((r) => (
                <Card
                  key={r.id}
                  style={{
                    padding: 20,
                    borderLeft: `3px solid ${
                      r.userId === currentUser?.uid
                        ? 'var(--gold)'
                        : 'transparent'
                    }`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: 'var(--red)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        fontWeight: 700,
                        color: 'var(--gold)',
                        flexShrink: 0,
                      }}
                    >
                      {r.userPseudo?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {r.userPseudo}
                      </div>
                      <Stars value={r.rating} readonly size={13} />
                    </div>
                  </div>
                  {r.comment && (
                    <p
                      style={{
                        color: 'var(--ink2)',
                        fontSize: 14,
                        lineHeight: 1.65,
                        paddingLeft: 46,
                        marginBottom: 6,
                      }}
                    >
                      {r.comment}
                    </p>
                  )}
                  <div style={{ paddingLeft: 46 }}>
                    <ReviewComments
                      reviewId={r.id}
                      reviewOwnerId={r.userId}
                      currentUser={currentUser}
                      userProfile={userProfile}
                    />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
      {showReview && (
        <ReviewModal
          play={play}
          existing={myReview}
          onClose={() => setShowReview(false)}
          onSave={saveReview}
        />
      )}
      {showEdit && (
        <PlayFormModal
          play={play}
          onClose={() => setShowEdit(false)}
          onSave={async (form) => {
            await updateDoc(doc(db, 'plays', playId), form);
            toast('Pièce modifiée !', 'success');
          }}
        />
      )}
    </div>
  );
};

// ─── CATALOGUE ───────────────────────────────────────────────────────────────
const CataloguePage = ({ currentUser, onSelectPlay }) => {
  const [plays, setPlays] = useState([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [avgMap, setAvgMap] = useState({});
  const seeded = useRef(false);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'plays'), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPlays(
        data.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
      );
      setLoading(false);
      if (data.length === 0 && !seeded.current) {
        seeded.current = true;
        DEFAULT_PLAYS.forEach((p) =>
          addDoc(collection(db, 'plays'), {
            ...p,
            createdAt: serverTimestamp(),
          })
        );
      }
    });
    return unsub;
  }, []);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'reviews'), (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        const r = d.data();
        if (r.status === 'vu' && r.rating > 0) {
          if (!map[r.playId]) map[r.playId] = [];
          map[r.playId].push(r.rating);
        }
      });
      const avgs = {};
      Object.entries(map).forEach(([id, ratings]) => {
        avgs[id] = (
          ratings.reduce((a, b) => a + b, 0) / ratings.length
        ).toFixed(1);
      });
      setAvgMap(avgs);
    });
    return unsub;
  }, []);
  const filtered = plays.filter((p) =>
    [p.title, p.playwright, p.genre, p.theater].some((v) =>
      v?.toLowerCase().includes(search.toLowerCase())
    )
  );
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <div
        style={{
          background:
            'linear-gradient(180deg,var(--red-deeper) 0%,var(--red) 100%)',
          padding: '32px 24px 28px',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            <h1 className="serif" style={{ fontSize: 28, color: 'white' }}>
              Catalogue
            </h1>
            {currentUser && (
              <button
                style={B.gold({ fontSize: 13 })}
                onClick={() => setShowAdd(true)}
              >
                <Ic n="plus" s={16} c="#3D1F00" />
                Ajouter
              </button>
            )}
          </div>
          <div style={{ position: 'relative', maxWidth: 500 }}>
            <div
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            >
              <Ic n="search" s={16} c="rgba(255,255,255,.5)" />
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Titre, auteur, genre, théâtre…"
              style={{
                paddingLeft: 42,
                background: 'rgba(255,255,255,.12)',
                border: '1.5px solid rgba(255,255,255,.2)',
                color: 'white',
                borderRadius: 100,
              }}
            />
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
        {loading ? (
          <div
            style={{ textAlign: 'center', padding: 80, color: 'var(--ink4)' }}
          >
            Chargement…
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{ textAlign: 'center', padding: 80, color: 'var(--ink4)' }}
          >
            Aucune pièce trouvée.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))',
              gap: 20,
            }}
          >
            {filtered.map((play) => (
              <Card key={play.id} hover onClick={() => onSelectPlay(play.id)}>
                <Poster play={play} size={160} />
                <div style={{ padding: '12px 14px 14px' }}>
                  <div
                    className="serif"
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      lineHeight: 1.35,
                      marginBottom: 3,
                    }}
                  >
                    {play.title}
                  </div>
                  <div
                    style={{
                      color: 'var(--ink4)',
                      fontSize: 12,
                      marginBottom: 6,
                    }}
                  >
                    {play.playwright}
                  </div>
                  {avgMap[play.id] ? (
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                      <Stars
                        value={Math.round(avgMap[play.id])}
                        readonly
                        size={12}
                      />
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--red)',
                          fontWeight: 600,
                        }}
                      >
                        {avgMap[play.id]}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--ink4)' }}>
                      Pas encore noté
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      {showAdd && (
        <PlayFormModal
          onClose={() => setShowAdd(false)}
          onSave={async (form) => {
            await addDoc(collection(db, 'plays'), {
              ...form,
              createdAt: serverTimestamp(),
            });
            toast('Pièce ajoutée !', 'success');
          }}
        />
      )}
    </div>
  );
};

// ─── WISHLIST ────────────────────────────────────────────────────────────────
const WishlistPage = ({ currentUser, onSelectPlay }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      query(
        collection(db, 'reviews'),
        where('userId', '==', currentUser.uid),
        where('status', '==', 'a-voir'),
        orderBy('createdAt', 'desc')
      ),
      (snap) => {
        setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );
    return unsub;
  }, [currentUser]);
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <div
        style={{
          background:
            'linear-gradient(180deg,var(--red-deeper) 0%,var(--red) 100%)',
          padding: '32px 24px 28px',
        }}
      >
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h1
            className="serif"
            style={{ fontSize: 28, color: 'white', marginBottom: 4 }}
          >
            Wishlist
          </h1>
          <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 14 }}>
            Les pièces que vous souhaitez voir
          </p>
        </div>
      </div>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
        {!currentUser ? (
          <Empty
            icon="wishlist"
            text="Connectez-vous pour voir votre wishlist."
          />
        ) : loading ? (
          <div
            style={{ textAlign: 'center', padding: 60, color: 'var(--ink4)' }}
          >
            Chargement…
          </div>
        ) : reviews.length === 0 ? (
          <Empty
            icon="wishlist"
            text="Votre wishlist est vide."
            sub="Appuyez sur le ♥ d'une pièce pour l'ajouter !"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reviews.map((r) => (
              <Card
                key={r.id}
                hover
                onClick={() => onSelectPlay(r.playId)}
                style={{
                  padding: 18,
                  display: 'flex',
                  gap: 14,
                  alignItems: 'center',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    className="serif"
                    style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}
                  >
                    {r.playTitle}
                  </div>
                  <div style={{ color: 'var(--ink4)', fontSize: 13 }}>
                    {r.playPlaywright}
                  </div>
                </div>
                <Ic n="heart" s={18} c="var(--red)" fill="var(--red)" />
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── PROFILE ─────────────────────────────────────────────────────────────────
const ProfilePage = ({
  currentUser,
  userProfile,
  onSelectPlay,
  targetUserId,
}) => {
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [friendReqs, setFriendReqs] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(true);
  const isOwn = !targetUserId || targetUserId === currentUser?.uid;
  const uid = targetUserId || currentUser?.uid;
  useEffect(() => {
    if (!uid) return;
    const u1 = onSnapshot(doc(db, 'users', uid), (s) => {
      if (s.exists()) {
        setProfile(s.data());
        setEditForm(s.data());
      }
      setLoading(false);
    });
    const u2 = onSnapshot(
      query(
        collection(db, 'reviews'),
        where('userId', '==', uid),
        where('status', '==', 'vu'),
        orderBy('createdAt', 'desc')
      ),
      (s) => setReviews(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => {
      u1();
      u2();
    };
  }, [uid]);
  useEffect(() => {
    if (!isOwn || !currentUser) return;
    const unsub = onSnapshot(
      query(
        collection(db, 'friendRequests'),
        where('to', '==', currentUser.uid),
        where('status', '==', 'pending')
      ),
      (s) => setFriendReqs(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [currentUser, isOwn]);
  const sendFriendReq = async () => {
    if (!currentUser) return toast("Connectez-vous d'abord", 'error');
    if (uid === currentUser.uid) return;
    if (profile?.friends?.includes(currentUser.uid))
      return toast('Déjà ami', 'info');
    const ex = await getDocs(
      query(
        collection(db, 'friendRequests'),
        where('from', '==', currentUser.uid),
        where('to', '==', uid)
      )
    );
    if (!ex.empty) return toast('Demande déjà envoyée', 'info');
    await addDoc(collection(db, 'friendRequests'), {
      from: currentUser.uid,
      fromPseudo: userProfile?.pseudo || "Quelqu'un",
      to: uid,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    toast("Demande d'ami envoyée !", 'success');
  };
  const acceptFriend = async (req) => {
    await updateDoc(doc(db, 'friendRequests', req.id), { status: 'accepted' });
    await updateDoc(doc(db, 'users', currentUser.uid), {
      friends: arrayUnion(req.from),
    });
    await updateDoc(doc(db, 'users', req.from), {
      friends: arrayUnion(currentUser.uid),
    });
    toast('Ami ajouté !', 'success');
  };
  const declineFriend = async (req) => {
    await updateDoc(doc(db, 'friendRequests', req.id), { status: 'declined' });
  };
  const saveProfile = async () => {
    await updateDoc(doc(db, 'users', currentUser.uid), {
      pseudo: editForm.pseudo,
      photoURL: editForm.photoURL,
      bio: editForm.bio,
    });
    setEditMode(false);
    toast('Profil mis à jour !', 'success');
  };
  if (!currentUser && !targetUserId)
    return (
      <div
        style={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Empty icon="profile" text="Connectez-vous pour voir votre profil." />
      </div>
    );
  if (loading)
    return (
      <div
        style={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink4)',
        }}
      >
        Chargement…
      </div>
    );
  if (!profile)
    return (
      <div
        style={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Empty icon="profile" text="Profil introuvable." />
      </div>
    );
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <div
        style={{
          background:
            'linear-gradient(180deg,var(--red-deeper) 0%,var(--red) 100%)',
          padding: '32px 24px 36px',
        }}
      >
        <div
          style={{
            maxWidth: 820,
            margin: '0 auto',
            display: 'flex',
            gap: 20,
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          <Avatar user={profile} size={76} />
          <div style={{ flex: 1 }}>
            <h1
              className="serif"
              style={{ fontSize: 24, color: 'white', marginBottom: 4 }}
            >
              {profile.pseudo || 'Sans pseudo'}
            </h1>
            {profile.bio && (
              <p
                style={{
                  color: 'rgba(255,255,255,.65)',
                  fontSize: 14,
                  marginBottom: 10,
                }}
              >
                {profile.bio}
              </p>
            )}
            <div
              style={{
                display: 'flex',
                gap: 20,
                fontSize: 13,
                color: 'rgba(255,255,255,.6)',
                marginBottom: 14,
              }}
            >
              <span>
                <b style={{ color: 'white' }}>{reviews.length}</b> vues
              </span>
              <span>
                <b style={{ color: 'white' }}>{profile.friends?.length || 0}</b>{' '}
                amis
              </span>
            </div>
            {isOwn ? (
              <button
                style={B.soft({
                  fontSize: 13,
                  padding: '9px 18px',
                  background: 'rgba(255,255,255,.15)',
                  border: '1px solid rgba(255,255,255,.25)',
                  color: 'white',
                  borderRadius: 100,
                })}
                onClick={() => setEditMode(true)}
              >
                <Ic n="edit" s={14} c="white" />
                Modifier
              </button>
            ) : (
              <button style={B.gold({ fontSize: 13 })} onClick={sendFriendReq}>
                <Ic n="adduser" s={14} c="#3D1F00" />
                Ajouter en ami
              </button>
            )}
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '28px 24px' }}>
        {isOwn && friendReqs.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h3 className="serif" style={{ fontSize: 16, marginBottom: 14 }}>
              Demandes d'amis ({friendReqs.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {friendReqs.map((req) => (
                <Card
                  key={req.id}
                  style={{
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'var(--red)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--gold)',
                    }}
                  >
                    {req.fromPseudo?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <span style={{ flex: 1, fontWeight: 500, fontSize: 14 }}>
                    {req.fromPseudo}
                  </span>
                  <button
                    style={B.gold({ fontSize: 12, padding: '7px 14px' })}
                    onClick={() => acceptFriend(req)}
                  >
                    <Ic n="check" s={13} c="#3D1F00" />
                    Accepter
                  </button>
                  <button
                    style={B.soft({ fontSize: 12, padding: '7px 14px' })}
                    onClick={() => declineFriend(req)}
                  >
                    Refuser
                  </button>
                </Card>
              ))}
            </div>
          </div>
        )}
        <h3 className="serif" style={{ fontSize: 18, marginBottom: 14 }}>
          Pièces vues ({reviews.length})
        </h3>
        {reviews.length === 0 ? (
          <Empty icon="catalogue" text="Aucune pièce vue pour l'instant." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reviews.map((r) => (
              <Card
                key={r.id}
                hover
                onClick={() => onSelectPlay(r.playId)}
                style={{ padding: 16, display: 'flex', gap: 14 }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    className="serif"
                    style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}
                  >
                    {r.playTitle}
                  </div>
                  <div
                    style={{
                      color: 'var(--ink4)',
                      fontSize: 12,
                      marginBottom: 6,
                    }}
                  >
                    {r.playPlaywright}
                  </div>
                  <Stars value={r.rating} readonly size={14} />
                  {r.comment && (
                    <p
                      style={{
                        color: 'var(--ink2)',
                        fontSize: 13,
                        marginTop: 5,
                        lineHeight: 1.55,
                      }}
                    >
                      {r.comment}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      {editMode && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              background: 'var(--white)',
              borderRadius: 'var(--r-xl)',
              width: '100%',
              maxWidth: 440,
              boxShadow: 'var(--shadow-lg)',
              padding: 28,
            }}
            className="fade"
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 22,
              }}
            >
              <h2 className="serif" style={{ fontSize: 20 }}>
                Modifier le profil
              </h2>
              <button style={B.icon(false)} onClick={() => setEditMode(false)}>
                <Ic n="close" s={16} c="var(--ink3)" />
              </button>
            </div>
            {[
              ['pseudo', 'Pseudo'],
              ['photoURL', 'URL de la photo de profil'],
            ].map(([k, label]) => (
              <FRow key={k}>
                <Lbl>{label}</Lbl>
                <input
                  value={editForm[k] || ''}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, [k]: e.target.value }))
                  }
                />
              </FRow>
            ))}
            <FRow>
              <Lbl>Bio</Lbl>
              <textarea
                value={editForm.bio || ''}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, bio: e.target.value }))
                }
                rows={2}
              />
            </FRow>
            <div
              style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}
            >
              <button style={B.soft()} onClick={() => setEditMode(false)}>
                Annuler
              </button>
              <button style={B.gold()} onClick={saveProfile}>
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── COMMUNITY ───────────────────────────────────────────────────────────────
const CommunityPage = ({
  currentUser,
  userProfile,
  onSelectPlay,
  onSelectUser,
}) => {
  const [reviews, setReviews] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    const friends = userProfile?.friends || [];
    const uids = [currentUser.uid, ...friends].slice(0, 10);
    const unsub = onSnapshot(
      query(
        collection(db, 'reviews'),
        where('userId', 'in', uids),
        where('status', '==', 'vu'),
        orderBy('createdAt', 'desc')
      ),
      (snap) => {
        setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );
    return unsub;
  }, [currentUser, userProfile]);

  // Notifications
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(
      query(
        collection(db, 'notifications'),
        where('toUserId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      ),
      (snap) => {
        setNotifs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    return unsub;
  }, [currentUser]);

  const unreadCount = notifs.filter((n) => !n.read).length;

  const markAllRead = async () => {
    const unread = notifs.filter((n) => !n.read);
    await Promise.all(
      unread.map((n) =>
        updateDoc(doc(db, 'notifications', n.id), { read: true })
      )
    );
  };

  const searchUsers = async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    const snap = await getDocs(collection(db, 'users'));
    setResults(
      snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter(
          (u) =>
            u.pseudo?.toLowerCase().includes(searchQ.toLowerCase()) &&
            u.id !== currentUser?.uid
        )
    );
    setSearching(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <div
        style={{
          background:
            'linear-gradient(180deg,var(--red-deeper) 0%,var(--red) 100%)',
          padding: '32px 24px 28px',
        }}
      >
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            <h1 className="serif" style={{ fontSize: 28, color: 'white' }}>
              Communauté
            </h1>
            {/* Cloche notifications */}
            {currentUser && (
              <div style={{ position: 'relative' }}>
                <button
                  style={{
                    ...B.soft({
                      padding: '9px 14px',
                      background: 'rgba(255,255,255,.15)',
                      border: '1px solid rgba(255,255,255,.25)',
                      color: 'white',
                      borderRadius: 100,
                    }),
                    position: 'relative',
                  }}
                  onClick={() => {
                    setShowNotifs((p) => !p);
                    if (!showNotifs) markAllRead();
                  }}
                >
                  <Ic n="bell" s={18} c="white" />
                  {unreadCount > 0 && (
                    <span
                      className="badge-pop"
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: 'var(--gold)',
                        color: '#3D1F00',
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>
                {showNotifs && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 8px)',
                      background: 'var(--white)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--r-lg)',
                      boxShadow: 'var(--shadow-lg)',
                      width: 320,
                      maxHeight: 360,
                      overflowY: 'auto',
                      zIndex: 300,
                      animation: 'slideDown .2s ease',
                    }}
                  >
                    <div
                      style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid var(--border)',
                        fontWeight: 600,
                        fontSize: 14,
                        color: 'var(--ink)',
                      }}
                    >
                      Notifications
                    </div>
                    {notifs.length === 0 ? (
                      <div
                        style={{
                          padding: '20px 16px',
                          textAlign: 'center',
                          color: 'var(--ink4)',
                          fontSize: 13,
                        }}
                      >
                        Aucune notification.
                      </div>
                    ) : (
                      notifs.map((n) => (
                        <div
                          key={n.id}
                          style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid var(--cream2)',
                            background: n.read
                              ? 'transparent'
                              : 'rgba(201,168,76,.06)',
                          }}
                        >
                          <p style={{ fontSize: 13, color: 'var(--ink)' }}>
                            <b>{n.fromPseudo}</b> a commenté votre avis
                          </p>
                          {n.text && (
                            <p
                              style={{
                                fontSize: 12,
                                color: 'var(--ink3)',
                                marginTop: 3,
                                fontStyle: 'italic',
                              }}
                            >
                              "{n.text}"
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Recherche utilisateurs */}
          <div
            style={{
              background: 'rgba(0,0,0,.2)',
              borderRadius: 'var(--r-lg)',
              padding: 18,
            }}
          >
            <p
              style={{
                color: 'rgba(255,255,255,.7)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              Rechercher un utilisateur
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                >
                  <Ic n="search" s={15} c="var(--ink4)" />
                </div>
                <input
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                  placeholder="Pseudo…"
                  style={{ paddingLeft: 36, borderRadius: 100 }}
                />
              </div>
              <button
                style={B.gold({ flexShrink: 0, fontSize: 13 })}
                onClick={searchUsers}
                disabled={searching}
              >
                {searching ? '…' : 'Rechercher'}
              </button>
            </div>
            {results.length > 0 && (
              <div
                style={{
                  marginTop: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {results.map((u) => (
                  <div
                    key={u.id}
                    style={{
                      background: 'var(--white)',
                      borderRadius: 'var(--r-md)',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <Avatar user={u} size={36} />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: 'var(--ink)',
                          fontSize: 14,
                        }}
                      >
                        {u.pseudo}
                      </div>
                      {u.bio && (
                        <div style={{ color: 'var(--ink4)', fontSize: 12 }}>
                          {u.bio}
                        </div>
                      )}
                    </div>
                    <button
                      style={B.gold({ fontSize: 12, padding: '7px 14px' })}
                      onClick={() => onSelectUser(u.id)}
                    >
                      Voir profil
                    </button>
                  </div>
                ))}
              </div>
            )}
            {searchQ && results.length === 0 && !searching && (
              <p
                style={{
                  color: 'rgba(255,255,255,.4)',
                  fontSize: 13,
                  marginTop: 8,
                }}
              >
                Aucun utilisateur trouvé.
              </p>
            )}
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: 24 }}>
        <h2 className="serif" style={{ fontSize: 18, marginBottom: 16 }}>
          Activité récente
        </h2>
        {!currentUser ? (
          <Empty icon="community" text="Connectez-vous pour voir l'activité." />
        ) : loading ? (
          <div
            style={{ textAlign: 'center', padding: 40, color: 'var(--ink4)' }}
          >
            Chargement…
          </div>
        ) : reviews.length === 0 ? (
          <Empty
            icon="community"
            text="Aucune activité."
            sub="Ajoutez des amis pour voir leurs avis ici !"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reviews.map((r) => (
              <Card key={r.id} style={{ padding: 18 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: 'var(--red)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--gold)',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    onClick={() => onSelectUser(r.userId)}
                  >
                    {r.userPseudo?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <span
                      style={{
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: 14,
                      }}
                      onClick={() => onSelectUser(r.userId)}
                    >
                      {r.userPseudo}
                    </span>
                    <span style={{ color: 'var(--ink4)', fontSize: 13 }}>
                      {' '}
                      a vu
                    </span>
                  </div>
                </div>
                <div
                  onClick={() => onSelectPlay(r.playId)}
                  style={{
                    cursor: 'pointer',
                    paddingLeft: 44,
                    marginBottom: 10,
                  }}
                >
                  <div
                    className="serif"
                    style={{ fontWeight: 700, marginBottom: 4 }}
                  >
                    {r.playTitle}
                  </div>
                  <div
                    style={{
                      color: 'var(--ink4)',
                      fontSize: 12,
                      marginBottom: 6,
                    }}
                  >
                    {r.playPlaywright}
                  </div>
                  <Stars value={r.rating} readonly size={14} />
                  {r.comment && (
                    <p
                      style={{
                        color: 'var(--ink2)',
                        fontSize: 13,
                        marginTop: 5,
                        lineHeight: 1.55,
                      }}
                    >
                      {r.comment}
                    </p>
                  )}
                </div>
                <div style={{ paddingLeft: 44 }}>
                  <ReviewComments
                    reviewId={r.id}
                    reviewOwnerId={r.userId}
                    currentUser={currentUser}
                    userProfile={userProfile}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── AUTH PAGE ───────────────────────────────────────────────────────────────
const AuthPage = ({ onSuccess }) => {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', pseudo: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, form.email, form.password);
        toast('Bienvenue !', 'success');
      } else {
        if (!form.pseudo.trim()) return toast('Choisissez un pseudo', 'error');
        const cred = await createUserWithEmailAndPassword(
          auth,
          form.email,
          form.password
        );
        await updateProfile(cred.user, { displayName: form.pseudo });
        await setDoc(doc(db, 'users', cred.user.uid), {
          pseudo: form.pseudo,
          email: form.email,
          photoURL: '',
          bio: '',
          friends: [],
          createdAt: serverTimestamp(),
        });
        toast('Compte créé !', 'success');
      }
      onSuccess?.();
    } catch (e) {
      const msgs = {
        'auth/email-already-in-use': 'Email déjà utilisé',
        'auth/invalid-email': 'Email invalide',
        'auth/wrong-password': 'Mot de passe incorrect',
        'auth/user-not-found': 'Utilisateur introuvable',
        'auth/weak-password': 'Min. 6 caractères',
        'auth/invalid-credential': 'Email ou mot de passe incorrect',
      };
      toast(msgs[e.code] || e.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div
      style={{ minHeight: '100vh', display: 'flex', background: 'var(--red)' }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
          gap: 16,
        }}
      >
        <LogoMark size={80} />
        <h1
          className="serif"
          style={{ fontSize: 36, color: 'white', textAlign: 'center' }}
        >
          MyTheatre
        </h1>
        <p
          style={{
            color: 'rgba(255,255,255,.6)',
            fontSize: 15,
            textAlign: 'center',
            maxWidth: 260,
            lineHeight: 1.6,
            fontStyle: 'italic',
          }}
        >
          Votre journal de bord théâtral. Découvrez, notez, partagez.
        </p>
      </div>
      <div
        style={{
          width: 'min(420px,100%)',
          background: 'var(--white)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
          boxShadow: '-20px 0 60px rgba(0,0,0,.15)',
        }}
      >
        <div style={{ width: '100%' }} className="fade">
          <h2 className="serif" style={{ fontSize: 22, marginBottom: 6 }}>
            {mode === 'login' ? 'Connexion' : 'Créer un compte'}
          </h2>
          <p style={{ color: 'var(--ink4)', fontSize: 14, marginBottom: 28 }}>
            {mode === 'login'
              ? 'Heureux de vous revoir !'
              : 'Rejoignez la communauté.'}
          </p>
          {mode === 'register' && (
            <FRow>
              <Lbl>Pseudo</Lbl>
              <input
                value={form.pseudo}
                onChange={(e) => set('pseudo', e.target.value)}
                placeholder="Votre pseudo"
              />
            </FRow>
          )}
          <FRow>
            <Lbl>Email</Lbl>
            <input
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="votre@email.com"
              type="email"
            />
          </FRow>
          <div style={{ marginBottom: 24 }}>
            <Lbl>Mot de passe</Lbl>
            <input
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder="••••••••"
              type="password"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <button
            style={{
              ...B.primary({
                width: '100%',
                justifyContent: 'center',
                padding: 14,
                fontSize: 15,
                borderRadius: 'var(--r-md)',
              }),
            }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? 'Chargement…'
              : mode === 'login'
              ? 'Se connecter'
              : 'Créer un compte'}
          </button>
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <span style={{ color: 'var(--ink4)', fontSize: 13 }}>
              {mode === 'login' ? 'Pas encore de compte ?' : 'Déjà un compte ?'}
            </span>
            <button
              style={{
                background: 'none',
                color: 'var(--red)',
                fontWeight: 600,
                fontSize: 13,
                marginLeft: 6,
                textDecoration: 'underline',
              }}
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? "S'inscrire" : 'Se connecter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── NAVBAR ──────────────────────────────────────────────────────────────────
const Navbar = ({ page, setPage, currentUser, userProfile, onLogout }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const tabs = [
    { id: 'catalogue', icon: 'catalogue', label: 'Catalogue' },
    { id: 'community', icon: 'community', label: 'Communauté' },
    { id: 'wishlist', icon: 'wishlist', label: 'Wishlist' },
    { id: 'profil', icon: 'profile', label: 'Profil' },
  ];
  return (
    <nav
      style={{
        background: 'var(--red-deeper)',
        position: 'sticky',
        top: 0,
        zIndex: 200,
        height: 56,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        borderBottom: '1px solid rgba(201,168,76,.3)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginRight: 24,
          cursor: 'pointer',
          flexShrink: 0,
        }}
        onClick={() => setPage('catalogue')}
      >
        <LogoMark size={30} />
        <span
          className="serif"
          style={{ fontSize: 17, color: 'var(--gold)', fontWeight: 700 }}
        >
          MyTheatre
        </span>
      </div>
      <div style={{ display: 'flex', gap: 4, flex: 1 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setPage(tab.id)}
            title={tab.label}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background:
                page === tab.id ? 'rgba(201,168,76,.18)' : 'transparent',
              border: `1.5px solid ${
                page === tab.id ? 'rgba(201,168,76,.5)' : 'transparent'
              }`,
              color: page === tab.id ? 'var(--gold)' : 'rgba(255,255,255,.55)',
              transition: 'all .18s',
            }}
          >
            <Ic
              n={tab.icon}
              s={18}
              c={page === tab.id ? 'var(--gold)' : 'rgba(255,255,255,.55)'}
            />
          </button>
        ))}
      </div>
      <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
        {currentUser ? (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: 100,
                border: '1px solid rgba(201,168,76,.35)',
                transition: 'border-color .2s',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = 'var(--gold)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = 'rgba(201,168,76,.35)')
              }
              onClick={() => setOpen((p) => !p)}
            >
              <Avatar user={userProfile || currentUser} size={26} />
              <span
                style={{
                  fontSize: 13,
                  color: 'var(--cream)',
                  maxWidth: 110,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {userProfile?.pseudo || currentUser.displayName}
              </span>
              <Ic n="chevron" s={14} c="var(--gold)" />
            </div>
            {open && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  background: 'var(--white)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-lg)',
                  overflow: 'hidden',
                  minWidth: 180,
                  boxShadow: 'var(--shadow-lg)',
                  animation: 'slideDown .2s ease',
                  zIndex: 300,
                }}
              >
                <button
                  style={{
                    display: 'flex',
                    width: '100%',
                    padding: '13px 16px',
                    background: 'transparent',
                    color: 'var(--ink)',
                    textAlign: 'left',
                    fontSize: 14,
                    border: 'none',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    alignItems: 'center',
                    gap: 10,
                  }}
                  onClick={() => {
                    setPage('profil');
                    setOpen(false);
                  }}
                >
                  <Ic n="profile" s={15} c="var(--ink3)" />
                  Mon profil
                </button>
                <button
                  style={{
                    display: 'flex',
                    width: '100%',
                    padding: '13px 16px',
                    background: 'transparent',
                    color: 'var(--red)',
                    textAlign: 'left',
                    fontSize: 14,
                    border: 'none',
                    cursor: 'pointer',
                    alignItems: 'center',
                    gap: 10,
                  }}
                  onClick={() => {
                    onLogout();
                    setOpen(false);
                  }}
                >
                  <Ic n="logout" s={15} c="var(--red)" />
                  Déconnexion
                </button>
              </div>
            )}
          </>
        ) : (
          <button
            style={B.gold({ fontSize: 13, padding: '8px 18px' })}
            onClick={() => setPage('auth')}
          >
            Connexion
          </button>
        )}
      </div>
    </nav>
  );
};

// ─── APP ROOT ────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState('catalogue');
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [selectedPlayId, setSelectedPlayId] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) setUserProfile(snap.data());
        else {
          const p = {
            pseudo: user.displayName || 'Spectateur',
            email: user.email,
            photoURL: '',
            bio: '',
            friends: [],
            createdAt: serverTimestamp(),
          };
          await setDoc(doc(db, 'users', user.uid), p);
          setUserProfile(p);
        }
      } else setUserProfile(null);
      setAuthLoading(false);
    });
    return unsub;
  }, []);
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
      if (snap.exists()) setUserProfile(snap.data());
    });
    return unsub;
  }, [currentUser]);
  const selectPlay = (id) => {
    setSelectedPlayId(id);
    setSelectedUserId(null);
    window.scrollTo(0, 0);
  };
  const selectUser = (id) => {
    setSelectedUserId(id);
    setSelectedPlayId(null);
    setPage('profil');
    window.scrollTo(0, 0);
  };
  const logout = async () => {
    await signOut(auth);
    setPage('catalogue');
    setSelectedPlayId(null);
    setSelectedUserId(null);
    toast('À bientôt !', 'info');
  };
  const changePage = (p) => {
    setSelectedPlayId(null);
    setSelectedUserId(null);
    setPage(p);
  };
  if (authLoading)
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--red)',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <style>{CSS}</style>
        <LogoMark size={72} />
        <div className="serif" style={{ color: 'var(--gold)', fontSize: 24 }}>
          MyTheatre
        </div>
        <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 13 }}>
          Chargement…
        </div>
      </div>
    );
  const renderContent = () => {
    if (selectedPlayId)
      return (
        <PlayDetail
          playId={selectedPlayId}
          currentUser={currentUser}
          userProfile={userProfile}
          onBack={() => setSelectedPlayId(null)}
        />
      );
    if (page === 'auth')
      return <AuthPage onSuccess={() => setPage('catalogue')} />;
    if (page === 'profil')
      return (
        <ProfilePage
          currentUser={currentUser}
          userProfile={userProfile}
          onSelectPlay={selectPlay}
          targetUserId={selectedUserId}
        />
      );
    if (page === 'wishlist')
      return (
        <WishlistPage currentUser={currentUser} onSelectPlay={selectPlay} />
      );
    if (page === 'community')
      return (
        <CommunityPage
          currentUser={currentUser}
          userProfile={userProfile}
          onSelectPlay={selectPlay}
          onSelectUser={selectUser}
        />
      );
    return (
      <CataloguePage currentUser={currentUser} onSelectPlay={selectPlay} />
    );
  };
  return (
    <>
      <style>{CSS}</style>
      {page !== 'auth' && (
        <Navbar
          page={page}
          setPage={changePage}
          currentUser={currentUser}
          userProfile={userProfile}
          onLogout={logout}
        />
      )}
      <main>{renderContent()}</main>
      {page !== 'auth' && (
        <footer
          style={{
            background: 'var(--red-deeper)',
            borderTop: '1px solid rgba(201,168,76,.2)',
            padding: '18px 24px',
            textAlign: 'center',
          }}
        >
          <span
            className="serif"
            style={{ color: 'var(--gold)', fontSize: 13 }}
          >
            MyTheatre
          </span>
          <span
            style={{
              color: 'rgba(255,255,255,.3)',
              fontSize: 12,
              marginLeft: 10,
            }}
          >
            Votre journal de bord théâtral
          </span>
        </footer>
      )}
      <Toast />
    </>
  );
}
