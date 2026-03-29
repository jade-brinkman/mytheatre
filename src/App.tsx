import { useState, useEffect, useCallback, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile
} from "firebase/auth";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, query, where, orderBy, onSnapshot, arrayUnion,
  serverTimestamp, Timestamp
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAxCI5_TWOy0hNBWJTw9OokDrbJP1cawuw",
  authDomain: "mytheatre-82be0.firebaseapp.com",
  projectId: "mytheatre-82be0",
  storageBucket: "mytheatre-82be0.firebasestorage.app",
  messagingSenderId: "521330541081",
  appId: "1:521330541081:web:3ac1da16b25295373a2088"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ─── DATA ─────────────────────────────────────────────────────────────────────
const DAYS = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
const LOGO_URL = "https://static.vecteezy.com/ti/vecteur-libre/p1/19997981-comedie-et-la-tragedie-theatral-masques-theatre-ou-drame-ecole-logo-conception-symbole-vectoriel.jpg";

const DEFAULT_PLAYS = [
  { title:"Phèdre", playwright:"Jean Racine", year:"1677", genre:"Tragédie", duration:"2h15", cast:"Marie Dupont, Jean-Pierre Martin", synopsis:"La passion dévastatrice de Phèdre pour son beau-fils Hippolyte.", theater:"Comédie-Française", posterUrl:"", billetReducUrl:"", priceMin:"", availableDays:[], under26Available:false, under26Price:"", under26Conditions:"" },
  { title:"Le Misanthrope", playwright:"Molière", year:"1666", genre:"Comédie", duration:"2h00", cast:"Antoine Leblanc, Clara Rousseau", synopsis:"Alceste se heurte à l'hypocrisie de la société du XVIIe siècle.", theater:"Odéon - Théâtre de l'Europe", posterUrl:"", billetReducUrl:"", priceMin:"", availableDays:[], under26Available:false, under26Price:"", under26Conditions:"" },
  { title:"En attendant Godot", playwright:"Samuel Beckett", year:"1953", genre:"Théâtre de l'absurde", duration:"2h30", cast:"Pierre Durand, Luc Bernard", synopsis:"Vladimir et Estragon attendent indéfiniment Godot.", theater:"Théâtre de la Ville", posterUrl:"", billetReducUrl:"", priceMin:"", availableDays:[], under26Available:false, under26Price:"", under26Conditions:"" },
  { title:"Cyrano de Bergerac", playwright:"Edmond Rostand", year:"1897", genre:"Comédie héroïque", duration:"3h00", cast:"François Girard, Isabelle Martin", synopsis:"Cyrano, poète au grand nez, aime Roxane mais n'ose se déclarer.", theater:"Comédie-Française", posterUrl:"", billetReducUrl:"", priceMin:"", availableDays:[], under26Available:false, under26Price:"", under26Conditions:"" },
];

// ─── CLAUDE API AUTO-FILL ─────────────────────────────────────────────────────
const autoFillPlay = async (title) => {
  const prompt = `Tu es un expert du théâtre parisien. Pour la pièce intitulée "${title}", donne-moi les informations suivantes en JSON uniquement, sans markdown ni explication :
{
  "title": "titre exact",
  "playwright": "auteur",
  "year": "année de création",
  "genre": "genre théâtral",
  "duration": "durée approximative ex: 2h30",
  "cast": "comédiens principaux séparés par des virgules si disponible",
  "synopsis": "synopsis de 2-3 phrases",
  "theater": "théâtre parisien où elle est actuellement jouée ou le plus connu",
  "priceMin": "prix minimum en euros ex: 15",
  "availableDays": ["Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"],
  "under26Available": true,
  "under26Price": "10",
  "under26Conditions": "Sur présentation d'une pièce d'identité, dans la limite des places disponibles",
  "billetReducUrl": ""
}
Si tu ne connais pas une information, laisse le champ vide ou false. Réponds UNIQUEMENT avec le JSON.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await res.json();
  const text = data.content?.[0]?.text || "{}";
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch { return { title }; }
};

// ─── LOGO ─────────────────────────────────────────────────────────────────────
const LogoMark = ({ size = 36 }) => (
  <div style={{ width:size, height:size, borderRadius:size*0.22, background:"var(--red)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, overflow:"hidden" }}>
    <img src={LOGO_URL} alt="MyTheatre" style={{ width:size*0.78, height:size*0.78, objectFit:"contain", filter:"brightness(0) invert(1)" }}
      onError={e => { e.currentTarget.style.display="none"; }} />
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
    --shadow-sm:0 1px 3px rgba(0,0,0,0.08);
    --shadow-md:0 4px 16px rgba(0,0,0,0.10);
    --shadow-lg:0 12px 40px rgba(0,0,0,0.14);
    --r-sm:8px;--r-md:12px;--r-lg:18px;--r-xl:24px;
  }
  html,body{scroll-behavior:smooth;-webkit-font-smoothing:antialiased;width:100%;overflow-x:hidden}
  body{background:var(--cream);color:var(--ink);font-family:'Inter',-apple-system,sans-serif;min-height:100vh}
  #root{width:100%;overflow-x:hidden}
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
  @keyframes spin{to{transform:rotate(360deg)}}
  .spin{animation:spin .8s linear infinite;display:inline-block}
  .serif{font-family:'Libre Baskerville',Georgia,serif}
  @media(max-width:600px){
    nav .nav-label{display:none}
    .hero-flex{flex-direction:column}
    .grid-plays{grid-template-columns:repeat(auto-fill,minmax(140px,1fr)) !important}
  }
`;

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Ic = ({ n, s=20, c="currentColor", fill="none" }) => {
  const p = {
    catalogue:<><rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/></>,
    ranking:<><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></>,
    community:<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    profile:<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    wishlist:<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>,
    heart:<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>,
    search:<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></>,
    plus:<><path d="M12 5v14"/><path d="M5 12h14"/></>,
    edit:<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    trash:<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>,
    back:<><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></>,
    logout:<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    check:<polyline points="20 6 9 17 4 12"/>,
    close:<><path d="M18 6L6 18"/><path d="M6 6l12 12"/></>,
    clock:<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    location:<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
    star:<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>,
    adduser:<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></>,
    chevron:<polyline points="6 9 12 15 18 9"/>,
    comment:<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>,
    bell:<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    ticket:<><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/></>,
    filter:<><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></>,
    sparkle:<><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></>,
    euro:<><circle cx="12" cy="12" r="9"/><path d="M15 9.4a4 4 0 1 0 0 5.2M8 12h6"/></>,
  };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{p[n]}</svg>;
};

// ─── BUTTONS ─────────────────────────────────────────────────────────────────
const B = {
  primary:(x={})=>({padding:"11px 22px",borderRadius:100,fontWeight:600,fontSize:14,background:"var(--red)",color:"white",boxShadow:"0 2px 8px rgba(185,28,28,.3)",display:"inline-flex",alignItems:"center",gap:7,...x}),
  gold:(x={})=>({padding:"11px 22px",borderRadius:100,fontWeight:600,fontSize:14,background:"linear-gradient(135deg,var(--gold),var(--gold-light))",color:"#3D1F00",boxShadow:"0 2px 8px rgba(201,168,76,.35)",display:"inline-flex",alignItems:"center",gap:7,...x}),
  soft:(x={})=>({padding:"10px 20px",borderRadius:100,fontWeight:500,fontSize:14,background:"var(--cream2)",color:"var(--ink2)",border:"1.5px solid var(--border)",display:"inline-flex",alignItems:"center",gap:7,...x}),
  ghost:(x={})=>({padding:"10px 20px",borderRadius:100,fontWeight:500,fontSize:14,background:"transparent",color:"var(--red)",border:"1.5px solid var(--red)",display:"inline-flex",alignItems:"center",gap:7,...x}),
  icon:(active=false,x={})=>({width:36,height:36,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:active?"rgba(201,168,76,.15)":"transparent",border:`1.5px solid ${active?"var(--gold)":"var(--border)"}`,color:active?"var(--gold)":"var(--ink3)",...x}),
};

// ─── CARD ────────────────────────────────────────────────────────────────────
const Card = ({ children, style={}, onClick, hover=false }) => {
  const [hov,setHov]=useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>hover&&setHov(true)} onMouseLeave={()=>hover&&setHov(false)}
      style={{background:"var(--white)",borderRadius:"var(--r-lg)",boxShadow:hov?"var(--shadow-lg)":"var(--shadow-sm)",border:"1px solid var(--border)",overflow:"hidden",transition:"box-shadow .2s,transform .2s",transform:hov?"translateY(-3px)":"none",cursor:onClick?"pointer":"default",...style}}>
      {children}
    </div>
  );
};

// ─── TOAST ───────────────────────────────────────────────────────────────────
let _toast: any = null;
const Toast = () => {
  const [list,setList]=useState<any[]>([]);
  _toast=useCallback((msg: string,type="info")=>{const id=Date.now();setList(p=>[...p,{id,msg,type}]);setTimeout(()=>setList(p=>p.filter((t:any)=>t.id!==id)),3000);},[]);
  const colors: any={success:"#166534",error:"#991B1B",info:"#1A1A1A"};
  return <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",zIndex:9999,display:"flex",flexDirection:"column",gap:8,alignItems:"center"}}>{list.map((t:any)=><div key={t.id} style={{background:colors[t.type],color:"white",padding:"12px 22px",borderRadius:100,fontSize:14,fontWeight:500,boxShadow:"var(--shadow-lg)",whiteSpace:"nowrap",animation:"fadeUp .3s ease"}}>{t.msg}</div>)}</div>;
};
const toast = (m: string, t?: string) => _toast?.(m, t);

// ─── STARS ───────────────────────────────────────────────────────────────────
const Stars = ({ value=0, onChange, size=18, readonly=false }: any) => {
  const [hover,setHover]=useState(0);
  return <div style={{display:"flex",gap:3}}>{[1,2,3,4,5].map(i=><span key={i} onClick={()=>!readonly&&onChange?.(i)} onMouseEnter={()=>!readonly&&setHover(i)} onMouseLeave={()=>!readonly&&setHover(0)} style={{fontSize:size,cursor:readonly?"default":"pointer",color:i<=(hover||value)?"var(--gold)":"var(--border)",transition:"color .1s",userSelect:"none",lineHeight:1}}>★</span>)}</div>;
};

// ─── AVATAR ──────────────────────────────────────────────────────────────────
const Avatar = ({ user, size=36 }: any) => {
  const name=user?.pseudo||user?.displayName||"?";
  return user?.photoURL
    ?<img src={user.photoURL} alt={name} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",border:"2px solid var(--gold)",flexShrink:0}}/>
    :<div style={{width:size,height:size,borderRadius:"50%",background:"var(--red)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Libre Baskerville,serif",fontWeight:700,fontSize:size*.38,color:"var(--gold)",border:"2px solid var(--gold)",flexShrink:0}}>{name.charAt(0).toUpperCase()}</div>;
};

const Lbl = ({ children }: any) => <label style={{fontSize:11,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase" as const,color:"var(--ink4)",marginBottom:6,display:"block"}}>{children}</label>;
const FRow = ({ children }: any) => <div style={{marginBottom:16}}>{children}</div>;
const Empty = ({ icon, text, sub }: any) => (
  <div style={{textAlign:"center",padding:"52px 20px"}}>
    <div style={{width:60,height:60,borderRadius:"50%",background:"var(--cream2)",border:"1.5px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><Ic n={icon} s={24} c="var(--ink4)"/></div>
    <p style={{color:"var(--ink3)",fontSize:15,fontWeight:500}}>{text}</p>
    {sub&&<p style={{color:"var(--ink4)",fontSize:13,marginTop:5}}>{sub}</p>}
  </div>
);
const Pill = ({ children, light=false }: any) => (
  <span style={{background:light?"rgba(255,255,255,.15)":"var(--cream2)",color:light?"rgba(255,255,255,.85)":"var(--ink2)",padding:"4px 12px",borderRadius:100,fontSize:12,display:"inline-flex",alignItems:"center",gap:5,border:`1px solid ${light?"rgba(255,255,255,.2)":"var(--border)"}`}}>{children}</span>
);

// ─── POSTER ──────────────────────────────────────────────────────────────────
const Poster = ({ play, size=120 }: any) => {
  const h=Math.round(size*1.42);
  if(play?.posterUrl) return <img src={play.posterUrl} alt={play.title} style={{width:size,height:h,objectFit:"cover",borderRadius:"var(--r-md)",display:"block",flexShrink:0}}/>;
  return(
    <div style={{width:size,height:h,background:"linear-gradient(160deg,var(--red) 0%,var(--red-deeper) 100%)",borderRadius:"var(--r-md)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
      <img src={LOGO_URL} alt="" style={{width:size*.45,height:size*.45,objectFit:"contain",filter:"brightness(0) invert(1)",opacity:.85}}/>
      <div className="serif" style={{fontSize:Math.max(8,size*.088),color:"rgba(255,255,255,.82)",textAlign:"center",padding:"5px 8px",marginTop:7,lineHeight:1.3,fontStyle:"italic"}}>{play?.title}</div>
    </div>
  );
};

// ─── PLAY FORM MODAL ─────────────────────────────────────────────────────────
const PlayFormModal = ({ play, onClose, onSave }: any) => {
  const empty = { title:"",playwright:"",year:"",genre:"",duration:"",cast:"",synopsis:"",theater:"",posterUrl:"",billetReducUrl:"",priceMin:"",availableDays:[] as string[],under26Available:false,under26Price:"",under26Conditions:"" };
  const [form,setForm]=useState<any>(play?{...empty,...play,availableDays:play.availableDays||[]}:empty);
  const [loading,setLoading]=useState(false);
  const [autoFilling,setAutoFilling]=useState(false);
  const [step,setStep]=useState<"search"|"edit">(play?"edit":"search");
  const [titleInput,setTitleInput]=useState("");
  const set=(k: string,v: any)=>setForm((p: any)=>({...p,[k]:v}));

  const handleAutoFill = async () => {
    if(!titleInput.trim()) return toast("Entrez un titre","error");
    setAutoFilling(true);
    try {
      const data = await autoFillPlay(titleInput);
      setForm({...empty,...data,availableDays:data.availableDays||[]});
      setStep("edit");
    } catch(e) { toast("Impossible de récupérer les infos, remplissez manuellement","error"); setForm({...empty,title:titleInput}); setStep("edit"); }
    finally { setAutoFilling(false); }
  };

  const handleSave = async () => {
    if(!form.title.trim()) return toast("Titre obligatoire","error");
    setLoading(true);
    try { await onSave(form); onClose(); } catch(e) { toast("Erreur","error"); } finally { setLoading(false); }
  };

  const toggleDay = (day: string) => {
    const days = form.availableDays||[];
    set("availableDays", days.includes(day) ? days.filter((d: string)=>d!==day) : [...days,day]);
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16,backdropFilter:"blur(4px)"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"var(--white)",borderRadius:"var(--r-xl)",width:"100%",maxWidth:560,maxHeight:"92vh",overflowY:"auto",boxShadow:"var(--shadow-lg)"}} className="fade">
        <div style={{padding:"24px 28px 0",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h2 className="serif" style={{fontSize:20}}>{play?"Modifier la pièce":"Ajouter une pièce"}</h2>
          <button style={B.icon(false)} onClick={onClose}><Ic n="close" s={16} c="var(--ink3)"/></button>
        </div>

        {step==="search" && !play ? (
          <div style={{padding:"0 28px 28px"}}>
            <p style={{color:"var(--ink3)",fontSize:14,marginBottom:16}}>Entrez le titre de la pièce — les informations seront récupérées automatiquement.</p>
            <FRow><Lbl>Titre de la pièce</Lbl>
              <input value={titleInput} onChange={e=>setTitleInput(e.target.value)} placeholder="Ex: Phèdre, Le Misanthrope…" onKeyDown={e=>e.key==="Enter"&&handleAutoFill()} autoFocus/>
            </FRow>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button style={B.soft()} onClick={onClose}>Annuler</button>
              <button style={B.gold()} onClick={handleAutoFill} disabled={autoFilling}>
                {autoFilling ? <><span className="spin">⟳</span> Recherche…</> : <><Ic n="sparkle" s={15} c="#3D1F00"/>Rechercher</>}
              </button>
            </div>
            <div style={{textAlign:"center",marginTop:16}}>
              <button style={{background:"none",color:"var(--ink4)",fontSize:13,textDecoration:"underline"}} onClick={()=>{setForm({...empty,title:titleInput});setStep("edit");}}>
                Remplir manuellement
              </button>
            </div>
          </div>
        ) : (
          <div style={{padding:"0 28px 28px"}}>
            {autoFilling && <div style={{textAlign:"center",padding:20,color:"var(--ink3)",fontSize:14}}><span className="spin" style={{fontSize:24}}>⟳</span><br/>Recherche des informations…</div>}
            <FRow><Lbl>Titre</Lbl><input value={form.title} onChange={e=>set("title",e.target.value)}/></FRow>
            <FRow><Lbl>Auteur</Lbl><input value={form.playwright} onChange={e=>set("playwright",e.target.value)}/></FRow>
            <FRow><Lbl>Synopsis</Lbl><textarea value={form.synopsis} onChange={e=>set("synopsis",e.target.value)} rows={3} style={{resize:"vertical"}}/></FRow>
            <FRow><Lbl>URL de l'affiche</Lbl><input value={form.posterUrl} onChange={e=>set("posterUrl",e.target.value)} placeholder="https://…"/></FRow>
            <FRow><Lbl>Théâtre</Lbl><input value={form.theater} onChange={e=>set("theater",e.target.value)}/></FRow>
            <FRow><Lbl>Genre</Lbl><input value={form.genre} onChange={e=>set("genre",e.target.value)}/></FRow>
            <FRow><Lbl>Durée</Lbl><input value={form.duration} onChange={e=>set("duration",e.target.value)} placeholder="Ex: 2h30"/></FRow>
            <FRow><Lbl>Année</Lbl><input value={form.year} onChange={e=>set("year",e.target.value)}/></FRow>
            <FRow><Lbl>Comédiens</Lbl><input value={form.cast} onChange={e=>set("cast",e.target.value)} placeholder="Séparés par des virgules"/></FRow>
            <FRow><Lbl>Prix minimum (€)</Lbl><input value={form.priceMin} onChange={e=>set("priceMin",e.target.value)} placeholder="Ex: 15" type="number"/></FRow>
            <FRow>
              <Lbl>Jours de représentation</Lbl>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}}>
                {DAYS.map(day=>(
                  <button key={day} onClick={()=>toggleDay(day)}
                    style={{padding:"6px 14px",borderRadius:100,fontSize:13,fontWeight:500,background:(form.availableDays||[]).includes(day)?"var(--red)":"var(--cream2)",color:(form.availableDays||[]).includes(day)?"white":"var(--ink3)",border:`1.5px solid ${(form.availableDays||[]).includes(day)?"var(--red)":"var(--border)"}`,transition:"all .15s"}}>
                    {day.slice(0,3)}
                  </button>
                ))}
              </div>
            </FRow>
            <FRow>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <input type="checkbox" checked={form.under26Available} onChange={e=>set("under26Available",e.target.checked)} style={{width:18,height:18,accentColor:"var(--red)"}}/>
                <Lbl>Tarif moins de 26 ans disponible</Lbl>
              </div>
            </FRow>
            {form.under26Available && (<>
              <FRow><Lbl>Prix moins de 26 ans (€)</Lbl><input value={form.under26Price} onChange={e=>set("under26Price",e.target.value)} placeholder="Ex: 10" type="number"/></FRow>
              <FRow><Lbl>Conditions de la réduction</Lbl><textarea value={form.under26Conditions} onChange={e=>set("under26Conditions",e.target.value)} rows={2} placeholder="Ex: Sur présentation d'une pièce d'identité, dans la limite des places disponibles"/></FRow>
            </>)}
            <FRow><Lbl>Lien BilletRéduc</Lbl><input value={form.billetReducUrl} onChange={e=>set("billetReducUrl",e.target.value)} placeholder="https://www.billetreduc.com/…"/></FRow>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
              {!play&&<button style={B.soft()} onClick={()=>setStep("search")}>← Retour</button>}
              <button style={B.soft()} onClick={onClose}>Annuler</button>
              <button style={B.gold()} onClick={handleSave} disabled={loading}>{loading?"Enregistrement…":"Enregistrer"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── REVIEW MODAL ────────────────────────────────────────────────────────────
const ReviewModal = ({ play, existing, onClose, onSave }: any) => {
  const [rating,setRating]=useState(existing?.rating||0);
  const [comment,setComment]=useState(existing?.comment||"");
  const [loading,setLoading]=useState(false);
  const handleSave=async()=>{
    if(!rating) return toast("Choisissez une note","error");
    setLoading(true);
    try{await onSave({rating,comment,status:"vu"});onClose();}catch(e){toast("Erreur","error");}finally{setLoading(false);}
  };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16,backdropFilter:"blur(4px)"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"var(--white)",borderRadius:"var(--r-xl)",width:"100%",maxWidth:460,boxShadow:"var(--shadow-lg)"}} className="fade">
        <div style={{padding:"24px 28px 0",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <h2 className="serif" style={{fontSize:20}}>Votre avis</h2>
          <button style={B.icon(false)} onClick={onClose}><Ic n="close" s={16} c="var(--ink3)"/></button>
        </div>
        <p style={{padding:"0 28px",color:"var(--ink3)",fontSize:14,marginBottom:22}}>{play.title} — {play.playwright}</p>
        <div style={{padding:"0 28px 28px"}}>
          <FRow><Lbl>Note</Lbl><Stars value={rating} onChange={setRating} size={28}/></FRow>
          <FRow><Lbl>Commentaire (optionnel)</Lbl><textarea value={comment} onChange={e=>setComment(e.target.value)} rows={4} placeholder="Vos impressions…" style={{resize:"vertical"}}/></FRow>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button style={B.soft()} onClick={onClose}>Annuler</button>
            <button style={B.gold()} onClick={handleSave} disabled={loading}>{loading?"…":"Enregistrer"}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── REVIEW COMMENTS ─────────────────────────────────────────────────────────
const ReviewComments = ({ reviewId, reviewOwnerId, currentUser, userProfile }: any) => {
  const [comments,setComments]=useState<any[]>([]);
  const [open,setOpen]=useState(false);
  const [text,setText]=useState("");
  const [loading,setLoading]=useState(false);
  useEffect(()=>{
    if(!open)return;
    const unsub=onSnapshot(query(collection(db,"reviewComments"),where("reviewId","==",reviewId),orderBy("createdAt","asc")),snap=>{setComments(snap.docs.map(d=>({id:d.id,...d.data()})));});
    return unsub;
  },[reviewId,open]);
  const sendComment=async()=>{
    if(!text.trim()||!currentUser)return;
    setLoading(true);
    try{
      await addDoc(collection(db,"reviewComments"),{reviewId,userId:currentUser.uid,userPseudo:userProfile?.pseudo||"Anonyme",text:text.trim(),createdAt:serverTimestamp()});
      if(reviewOwnerId&&reviewOwnerId!==currentUser.uid){
        await addDoc(collection(db,"notifications"),{toUserId:reviewOwnerId,fromPseudo:userProfile?.pseudo||"Quelqu'un",type:"comment",reviewId,text:text.trim(),read:false,createdAt:serverTimestamp()});
      }
      setText("");
    }catch(e){toast("Erreur","error");}finally{setLoading(false);}
  };
  return(
    <div style={{marginTop:10}}>
      <button style={{background:"transparent",color:"var(--ink4)",fontSize:13,display:"flex",alignItems:"center",gap:5,padding:"4px 0"}} onClick={()=>setOpen(p=>!p)}>
        <Ic n="comment" s={14} c="var(--ink4)"/>{open?"Masquer":"Commenter"}
      </button>
      {open&&(
        <div style={{marginTop:10,paddingLeft:12,borderLeft:"2px solid var(--border)"}}>
          {comments.length===0&&<p style={{color:"var(--ink4)",fontSize:13,marginBottom:8,fontStyle:"italic"}}>Aucun commentaire.</p>}
          {comments.map((c:any)=>(
            <div key={c.id} style={{marginBottom:10,fontSize:13}}>
              <span style={{fontWeight:600,color:"var(--ink)"}}>{c.userPseudo} </span>
              <span style={{color:"var(--ink2)"}}>{c.text}</span>
            </div>
          ))}
          {currentUser&&(
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <input value={text} onChange={e=>setText(e.target.value)} placeholder="Écrire un commentaire…" style={{fontSize:13,padding:"8px 12px",borderRadius:100}} onKeyDown={e=>e.key==="Enter"&&sendComment()}/>
              <button style={B.gold({padding:"8px 16px",fontSize:13,flexShrink:0})} onClick={sendComment} disabled={loading||!text.trim()}>Envoyer</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── HEART BUTTON ────────────────────────────────────────────────────────────
const HeartButton = ({ playId, playTitle, playPlaywright, currentUser, userProfile }: any) => {
  const [inWishlist,setInWishlist]=useState(false);
  const [reviewId,setReviewId]=useState<string|null>(null);
  const [animating,setAnimating]=useState(false);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    if(!currentUser||!playId){setLoading(false);return;}
    const unsub=onSnapshot(query(collection(db,"reviews"),where("playId","==",playId),where("userId","==",currentUser.uid),where("status","==","a-voir")),snap=>{setInWishlist(!snap.empty);setReviewId(snap.empty?null:snap.docs[0].id);setLoading(false);});
    return unsub;
  },[currentUser,playId]);
  const toggle=async()=>{
    if(!currentUser)return toast("Connectez-vous pour utiliser la wishlist","error");
    setAnimating(true);setTimeout(()=>setAnimating(false),400);setLoading(true);
    try{
      if(inWishlist&&reviewId){await deleteDoc(doc(db,"reviews",reviewId));toast("Retiré de la wishlist","info");}
      else{await addDoc(collection(db,"reviews"),{playId,userId:currentUser.uid,userPseudo:userProfile?.pseudo||"Anonyme",rating:0,comment:"",status:"a-voir",playTitle,playPlaywright,createdAt:serverTimestamp()});toast("Ajouté à la wishlist !","success");}
    }catch(e){toast("Erreur","error");}finally{setLoading(false);}
  };
  return(
    <button onClick={toggle} disabled={loading} className={animating?"heart-pop":""}
      style={{width:44,height:44,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:inWishlist?"rgba(185,28,28,.08)":"var(--cream2)",border:`1.5px solid ${inWishlist?"var(--red)":"var(--border)"}`,transition:"all .2s",flexShrink:0}}>
      <Ic n="heart" s={20} c={inWishlist?"var(--red)":"var(--ink4)"} fill={inWishlist?"var(--red)":"none"}/>
    </button>
  );
};

// ─── DELETE PLAY (with cleanup) ───────────────────────────────────────────────
const deletePlayWithCleanup = async (playId: string) => {
  // Delete reviews
  const reviewsSnap = await getDocs(query(collection(db,"reviews"),where("playId","==",playId)));
  for(const r of reviewsSnap.docs){
    // Delete comments for each review
    const commentsSnap = await getDocs(query(collection(db,"reviewComments"),where("reviewId","==",r.id)));
    for(const c of commentsSnap.docs) await deleteDoc(doc(db,"reviewComments",c.id));
    await deleteDoc(doc(db,"reviews",r.id));
  }
  await deleteDoc(doc(db,"plays",playId));
};

// ─── PLAY DETAIL ─────────────────────────────────────────────────────────────
const PlayDetail = ({ playId, currentUser, userProfile, onBack }: any) => {
  const [play,setPlay]=useState<any>(null);
  const [reviews,setReviews]=useState<any[]>([]);
  const [myReview,setMyReview]=useState<any>(null);
  const [showReview,setShowReview]=useState(false);
  const [showEdit,setShowEdit]=useState(false);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    const u1=onSnapshot(doc(db,"plays",playId),snap=>{setPlay(snap.exists()?{id:snap.id,...snap.data()}:null);setLoading(false);});
    const u2=onSnapshot(query(collection(db,"reviews"),where("playId","==",playId),where("status","==","vu"),orderBy("createdAt","desc")),snap=>{
      const revs=snap.docs.map(d=>({id:d.id,...d.data()}));
      setReviews(revs);
      if(currentUser) setMyReview(revs.find((r:any)=>r.userId===currentUser.uid)||null);
    });
    return()=>{u1();u2();};
  },[playId,currentUser]);

  const avg=reviews.length?(reviews.reduce((a:number,r:any)=>a+r.rating,0)/reviews.length).toFixed(1):null;

  const saveReview=async({rating,comment,status}: any)=>{
    const data={playId,userId:currentUser.uid,userPseudo:userProfile?.pseudo||"Anonyme",rating,comment,status,playTitle:play.title,playPlaywright:play.playwright,createdAt:serverTimestamp()};
    if(myReview){await updateDoc(doc(db,"reviews",myReview.id),data);toast("Avis mis à jour !","success");}
    else{await addDoc(collection(db,"reviews"),data);toast("Avis ajouté !","success");}
  };
  const deleteReview=async()=>{if(!myReview||!window.confirm("Supprimer votre avis ?"))return;await deleteDoc(doc(db,"reviews",myReview.id));toast("Avis supprimé","info");};
  const handleDeletePlay=async()=>{
    if(!window.confirm("Supprimer cette pièce et tous ses avis ?"))return;
    await deletePlayWithCleanup(playId);
    toast("Pièce supprimée","info");
    onBack();
  };

  if(loading)return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vh",color:"var(--ink4)"}}>Chargement…</div>;
  if(!play)return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vh",color:"var(--ink4)"}}>Pièce introuvable.</div>;

  const todayDay = DAYS[new Date().getDay()===0?6:new Date().getDay()-1];
  const availableToday = play.availableDays?.includes(todayDay);

  return(
    <div className="fade" style={{minHeight:"100vh",background:"var(--cream)"}}>
      <div style={{background:"linear-gradient(180deg,var(--red-deeper) 0%,var(--red) 100%)"}}>
        <div style={{maxWidth:900,margin:"0 auto",padding:"20px 24px 32px"}}>
          <button style={{...B.soft({fontSize:13,padding:"8px 16px",marginBottom:24,background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.25)",color:"white",borderRadius:100})}} onClick={onBack}>
            <Ic n="back" s={15} c="white"/> Retour
          </button>
          <div className="hero-flex" style={{display:"flex",gap:28,alignItems:"flex-start",flexWrap:"wrap"}}>
            <Poster play={play} size={160}/>
            <div style={{flex:1,minWidth:240}}>
              <h1 className="serif" style={{fontSize:30,color:"white",lineHeight:1.2,marginBottom:8}}>{play.title}</h1>
              <p style={{color:"rgba(255,255,255,.75)",fontSize:16,marginBottom:16,fontStyle:"italic"}}>{play.playwright}{play.year?` · ${play.year}`:""}</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
                {play.genre&&<Pill light>{play.genre}</Pill>}
                {play.duration&&<Pill light><Ic n="clock" s={12} c="rgba(255,255,255,.7)"/>{play.duration}</Pill>}
                {play.theater&&<Pill light><Ic n="location" s={12} c="rgba(255,255,255,.7)"/>{play.theater}</Pill>}
                {availableToday&&<span style={{background:"rgba(46,160,67,.3)",border:"1px solid rgba(46,160,67,.6)",color:"#7fff9a",padding:"4px 12px",borderRadius:100,fontSize:12,fontWeight:600}}>Disponible ce soir</span>}
              </div>
              {avg&&<div style={{display:"inline-flex",alignItems:"center",gap:10,background:"rgba(0,0,0,.2)",padding:"8px 16px",borderRadius:100,marginBottom:16}}><Stars value={Math.round(Number(avg))} onChange={()=>{}} readonly size={16}/><span style={{color:"var(--gold-light)",fontWeight:700,fontSize:17}}>{avg}</span><span style={{color:"rgba(255,255,255,.5)",fontSize:13}}>/ 5 · {reviews.length} avis</span></div>}

              {/* Prix */}
              <div style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:16}}>
                {play.priceMin&&<div style={{background:"rgba(0,0,0,.2)",padding:"8px 14px",borderRadius:10,display:"flex",alignItems:"center",gap:6}}>
                  <Ic n="euro" s={14} c="var(--gold-light)"/><span style={{color:"white",fontSize:14}}>À partir de <b style={{color:"var(--gold-light)"}}>{play.priceMin}€</b></span>
                </div>}
                {play.under26Available&&<div style={{background:"rgba(201,168,76,.15)",border:"1px solid rgba(201,168,76,.4)",padding:"8px 14px",borderRadius:10}}>
                  <span style={{color:"var(--gold-light)",fontSize:13,fontWeight:600}}>— 26 ans : {play.under26Price}€</span>
                  {play.under26Conditions&&<p style={{color:"rgba(255,255,255,.6)",fontSize:11,marginTop:3}}>{play.under26Conditions}</p>}
                </div>}
              </div>

              {/* Jours dispo */}
              {play.availableDays?.length>0&&<div style={{marginBottom:16}}>
                <p style={{color:"rgba(255,255,255,.6)",fontSize:12,marginBottom:6}}>Représentations</p>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {DAYS.map(d=>(
                    <span key={d} style={{padding:"4px 10px",borderRadius:100,fontSize:12,fontWeight:500,background:play.availableDays.includes(d)?"rgba(255,255,255,.25)":"rgba(255,255,255,.07)",color:play.availableDays.includes(d)?"white":"rgba(255,255,255,.35)",border:`1px solid ${play.availableDays.includes(d)?"rgba(255,255,255,.4)":"transparent"}`}}>{d.slice(0,3)}</span>
                  ))}
                </div>
              </div>}

              <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                {currentUser&&<HeartButton playId={playId} playTitle={play.title} playPlaywright={play.playwright} currentUser={currentUser} userProfile={userProfile}/>}
                {currentUser&&<button style={B.gold({fontSize:13})} onClick={()=>setShowReview(true)}><Ic n="star" s={14} c="#3D1F00" fill="#3D1F00"/>{myReview?"Modifier mon avis":"Donner mon avis"}</button>}
                {play.billetReducUrl&&<a href={play.billetReducUrl} target="_blank" rel="noopener noreferrer" style={{...B.soft({fontSize:13,background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",color:"white",borderRadius:100,textDecoration:"none"})}}>
                  <Ic n="ticket" s={14} c="white"/>BilletRéduc
                </a>}
                {currentUser&&myReview&&<button style={B.ghost({fontSize:13,color:"rgba(255,255,255,.7)",borderColor:"rgba(255,255,255,.3)"})} onClick={deleteReview}><Ic n="trash" s={14} c="rgba(255,255,255,.7)"/>Supprimer mon avis</button>}
              </div>
              {currentUser&&<div style={{display:"flex",gap:8,marginTop:10}}>
                <button style={{fontSize:12,color:"rgba(255,255,255,.5)",background:"transparent",textDecoration:"underline"}} onClick={()=>setShowEdit(true)}>Modifier</button>
                <span style={{color:"rgba(255,255,255,.3)"}}>·</span>
                <button style={{fontSize:12,color:"rgba(255,100,100,.7)",background:"transparent",textDecoration:"underline"}} onClick={handleDeletePlay}>Supprimer</button>
              </div>}
            </div>
          </div>
        </div>
      </div>
      <div style={{maxWidth:900,margin:"0 auto",padding:"32px 24px"}}>
        {play.synopsis&&<section style={{marginBottom:36}}><h3 className="serif" style={{fontSize:18,marginBottom:14}}>Synopsis</h3><p style={{color:"var(--ink2)",fontSize:16,lineHeight:1.8,fontStyle:"italic",fontFamily:"Libre Baskerville,serif"}}>{play.synopsis}</p></section>}
        {play.cast&&<section style={{marginBottom:36}}><h3 className="serif" style={{fontSize:18,marginBottom:14}}>Distribution</h3><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{play.cast.split(",").map((a:string,i:number)=><span key={i} style={{background:"var(--cream2)",border:"1px solid var(--border)",padding:"5px 14px",borderRadius:100,fontSize:13}}>{a.trim()}</span>)}</div></section>}
        <section>
          <h3 className="serif" style={{fontSize:18,marginBottom:16}}>Avis ({reviews.length})</h3>
          {reviews.length===0
            ?<div style={{textAlign:"center",padding:"40px 20px",background:"var(--white)",borderRadius:"var(--r-lg)",border:"1px solid var(--border)"}}><p style={{color:"var(--ink4)",fontSize:14}}>Aucun avis pour l'instant.</p></div>
            :<div style={{display:"flex",flexDirection:"column",gap:12}}>
              {reviews.map((r:any)=>(
                <Card key={r.id} style={{padding:20,borderLeft:`3px solid ${r.userId===currentUser?.uid?"var(--gold)":"transparent"}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                    <div style={{width:34,height:34,borderRadius:"50%",background:"var(--red)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"var(--gold)",flexShrink:0}}>{r.userPseudo?.charAt(0)?.toUpperCase()||"?"}</div>
                    <div><div style={{fontWeight:600,fontSize:14}}>{r.userPseudo}</div><Stars value={r.rating} onChange={()=>{}} readonly size={13}/></div>
                  </div>
                  {r.comment&&<p style={{color:"var(--ink2)",fontSize:14,lineHeight:1.65,paddingLeft:46,marginBottom:6}}>{r.comment}</p>}
                  <div style={{paddingLeft:46}}><ReviewComments reviewId={r.id} reviewOwnerId={r.userId} currentUser={currentUser} userProfile={userProfile}/></div>
                </Card>
              ))}
            </div>
          }
        </section>
      </div>
      {showReview&&<ReviewModal play={play} existing={myReview} onClose={()=>setShowReview(false)} onSave={saveReview}/>}
      {showEdit&&<PlayFormModal play={play} onClose={()=>setShowEdit(false)} onSave={async(form:any)=>{await updateDoc(doc(db,"plays",playId),form);toast("Pièce modifiée !","success");}}/>}
    </div>
  );
};

// ─── CATALOGUE ───────────────────────────────────────────────────────────────
const CataloguePage = ({ currentUser, onSelectPlay, userReviews }: any) => {
  const [plays,setPlays]=useState<any[]>([]);
  const [search,setSearch]=useState("");
  const [showAdd,setShowAdd]=useState(false);
  const [loading,setLoading]=useState(true);
  const [avgMap,setAvgMap]=useState<any>({});
  const [showFilters,setShowFilters]=useState(false);
  const [filterDay,setFilterDay]=useState("");
  const [filterUnder26,setFilterUnder26]=useState(false);
  const [filterNotSeen,setFilterNotSeen]=useState(false);
  const [sortBy,setSortBy]=useState("title");
  const seeded=useRef(false);

  useEffect(()=>{
    const unsub=onSnapshot(collection(db,"plays"),snap=>{
      const data=snap.docs.map(d=>({id:d.id,...d.data()}));
      setPlays(data);setLoading(false);
      if(data.length===0&&!seeded.current){seeded.current=true;DEFAULT_PLAYS.forEach(p=>addDoc(collection(db,"plays"),{...p,createdAt:serverTimestamp()}));}
    });
    return unsub;
  },[]);

  useEffect(()=>{
    const unsub=onSnapshot(collection(db,"reviews"),snap=>{
      const map: any={};
      snap.docs.forEach(d=>{const r:any=d.data();if(r.status==="vu"&&r.rating>0){if(!map[r.playId])map[r.playId]=[];map[r.playId].push(r.rating);}});
      const avgs: any={};Object.entries(map).forEach(([id,ratings]:any)=>{avgs[id]=(ratings.reduce((a:number,b:number)=>a+b,0)/ratings.length).toFixed(1);});
      setAvgMap(avgs);
    });
    return unsub;
  },[]);

  const seenPlayIds = new Set((userReviews||[]).filter((r:any)=>r.status==="vu").map((r:any)=>r.playId));

  let filtered = plays.filter(p=>[p.title,p.playwright,p.genre,p.theater].some((v:any)=>v?.toLowerCase().includes(search.toLowerCase())));
  if(filterDay) filtered=filtered.filter(p=>p.availableDays?.includes(filterDay));
  if(filterUnder26) filtered=filtered.filter(p=>p.under26Available);
  if(filterNotSeen&&currentUser) filtered=filtered.filter(p=>!seenPlayIds.has(p.id));

  filtered=[...filtered].sort((a,b)=>{
    if(sortBy==="rating") return (parseFloat(avgMap[b.id])||0)-(parseFloat(avgMap[a.id])||0);
    if(sortBy==="price") return (parseFloat(a.priceMin)||9999)-(parseFloat(b.priceMin)||9999);
    return (a.title||"").localeCompare(b.title||"");
  });

  const todayDay = DAYS[new Date().getDay()===0?6:new Date().getDay()-1];

  return(
    <div style={{minHeight:"100vh",background:"var(--cream)"}}>
      <div style={{background:"linear-gradient(180deg,var(--red-deeper) 0%,var(--red) 100%)",padding:"32px 24px 20px"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <h1 className="serif" style={{fontSize:28,color:"white"}}>Catalogue</h1>
            {currentUser&&<button style={B.gold({fontSize:13})} onClick={()=>setShowAdd(true)}><Ic n="plus" s={16} c="#3D1F00"/>Ajouter</button>}
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <div style={{position:"relative",flex:1,minWidth:200}}>
              <div style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)"}}><Ic n="search" s={16} c="rgba(255,255,255,.5)"/></div>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Titre, auteur, genre…" style={{paddingLeft:42,background:"rgba(255,255,255,.12)",border:"1.5px solid rgba(255,255,255,.2)",color:"white",borderRadius:100}}/>
            </div>
            <button style={{...B.soft({fontSize:13,background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.25)",color:"white",borderRadius:100}),background:showFilters?"rgba(201,168,76,.3)":"rgba(255,255,255,.15)"}} onClick={()=>setShowFilters(p=>!p)}>
              <Ic n="filter" s={15} c="white"/>Filtres
            </button>
          </div>
          {showFilters&&(
            <div style={{background:"rgba(0,0,0,.2)",borderRadius:"var(--r-lg)",padding:16,marginTop:12,animation:"slideDown .2s ease"}}>
              <div style={{display:"flex",flexWrap:"wrap",gap:16,alignItems:"flex-start"}}>
                <div>
                  <p style={{color:"rgba(255,255,255,.7)",fontSize:11,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",marginBottom:8}}>Trier par</p>
                  <div style={{display:"flex",gap:6}}>
                    {[["title","A-Z"],["rating","Note"],["price","Prix"]].map(([v,l])=>(
                      <button key={v} onClick={()=>setSortBy(v)} style={{padding:"5px 12px",borderRadius:100,fontSize:12,fontWeight:500,background:sortBy===v?"white":"transparent",color:sortBy===v?"var(--red)":"rgba(255,255,255,.7)",border:`1px solid ${sortBy===v?"white":"rgba(255,255,255,.3)"}`,transition:"all .15s"}}>{l}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p style={{color:"rgba(255,255,255,.7)",fontSize:11,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",marginBottom:8}}>Jour</p>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <button onClick={()=>setFilterDay(filterDay===todayDay?"":todayDay)} style={{padding:"5px 12px",borderRadius:100,fontSize:12,fontWeight:600,background:filterDay===todayDay?"var(--gold)":"transparent",color:filterDay===todayDay?"#3D1F00":"rgba(255,255,255,.7)",border:`1px solid ${filterDay===todayDay?"var(--gold)":"rgba(255,255,255,.3)"}`,transition:"all .15s"}}>Ce soir</button>
                    {DAYS.map(d=>(
                      <button key={d} onClick={()=>setFilterDay(filterDay===d?"":d)} style={{padding:"5px 10px",borderRadius:100,fontSize:12,background:filterDay===d?"white":"transparent",color:filterDay===d?"var(--red)":"rgba(255,255,255,.7)",border:`1px solid ${filterDay===d?"white":"rgba(255,255,255,.3)"}`,transition:"all .15s"}}>{d.slice(0,3)}</button>
                    ))}
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                    <input type="checkbox" checked={filterUnder26} onChange={e=>setFilterUnder26(e.target.checked)} style={{accentColor:"var(--gold)"}}/>
                    <span style={{color:"rgba(255,255,255,.8)",fontSize:13}}>Tarif — 26 ans</span>
                  </label>
                  {currentUser&&<label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                    <input type="checkbox" checked={filterNotSeen} onChange={e=>setFilterNotSeen(e.target.checked)} style={{accentColor:"var(--gold)"}}/>
                    <span style={{color:"rgba(255,255,255,.8)",fontSize:13}}>Pas encore vues</span>
                  </label>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div style={{maxWidth:1100,margin:"0 auto",padding:24}}>
        {loading?<div style={{textAlign:"center",padding:80,color:"var(--ink4)"}}>Chargement…</div>
          :filtered.length===0?<Empty icon="search" text="Aucune pièce trouvée." sub="Essayez d'autres filtres."/>
          :<div className="grid-plays" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:20}}>
            {filtered.map((play:any)=>(
              <Card key={play.id} hover onClick={()=>onSelectPlay(play.id)}>
                <div style={{position:"relative"}}>
                  <Poster play={play} size={160}/>
                  {play.availableDays?.includes(DAYS[new Date().getDay()===0?6:new Date().getDay()-1])&&(
                    <span style={{position:"absolute",top:8,left:8,background:"rgba(46,160,67,.9)",color:"white",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:100}}>Ce soir</span>
                  )}
                  {play.under26Available&&<span style={{position:"absolute",top:8,right:8,background:"rgba(201,168,76,.9)",color:"#3D1F00",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:100}}>-26ans</span>}
                </div>
                <div style={{padding:"12px 14px 14px"}}>
                  <div className="serif" style={{fontWeight:700,fontSize:13,lineHeight:1.35,marginBottom:3}}>{play.title}</div>
                  <div style={{color:"var(--ink4)",fontSize:12,marginBottom:4}}>{play.playwright}</div>
                  {play.priceMin&&<div style={{color:"var(--ink3)",fontSize:11,marginBottom:4}}>À partir de {play.priceMin}€</div>}
                  {avgMap[play.id]?<div style={{display:"flex",alignItems:"center",gap:5}}><Stars value={Math.round(avgMap[play.id])} onChange={()=>{}} readonly size={12}/><span style={{fontSize:11,color:"var(--red)",fontWeight:600}}>{avgMap[play.id]}</span></div>:<span style={{fontSize:11,color:"var(--ink4)"}}>Pas encore noté</span>}
                </div>
              </Card>
            ))}
          </div>
        }
      </div>
      {showAdd&&<PlayFormModal onClose={()=>setShowAdd(false)} onSave={async(form:any)=>{await addDoc(collection(db,"plays"),{...form,createdAt:serverTimestamp()});toast("Pièce ajoutée !","success");}}/>}
    </div>
  );
};

// ─── RANKING PAGE ────────────────────────────────────────────────────────────
const RankingPage = ({ onSelectPlay }: any) => {
  const [ranking,setRanking]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate()-7);
    const unsub = onSnapshot(collection(db,"reviews"), async snap => {
      const recentReviews = snap.docs
        .map(d=>({id:d.id,...d.data()} as any))
        .filter(r=>r.status==="vu"&&r.rating>0&&r.createdAt?.toDate&&r.createdAt.toDate()>=weekAgo);
      const map: any={};
      recentReviews.forEach(r=>{
        if(!map[r.playId])map[r.playId]={ratings:[],playTitle:r.playTitle,playPlaywright:r.playPlaywright};
        map[r.playId].ratings.push(r.rating);
      });
      const ranked = Object.entries(map)
        .map(([playId,data]:any)=>({playId,avg:(data.ratings.reduce((a:number,b:number)=>a+b,0)/data.ratings.length),count:data.ratings.length,playTitle:data.playTitle,playPlaywright:data.playPlaywright}))
        .sort((a,b)=>b.avg-a.avg||b.count-a.count)
        .slice(0,10);
      // Fetch play details
      const withDetails = await Promise.all(ranked.map(async r=>{
        try{const snap=await getDoc(doc(db,"plays",r.playId));return{...r,play:snap.exists()?{id:snap.id,...snap.data()}:null};}
        catch{return{...r,play:null};}
      }));
      setRanking(withDetails);
      setLoading(false);
    });
    return unsub;
  },[]);

  const medals = ["🥇","🥈","🥉"];

  return(
    <div style={{minHeight:"100vh",background:"var(--cream)"}}>
      <div style={{background:"linear-gradient(180deg,var(--red-deeper) 0%,var(--red) 100%)",padding:"32px 24px 28px"}}>
        <div style={{maxWidth:800,margin:"0 auto"}}>
          <h1 className="serif" style={{fontSize:28,color:"white",marginBottom:4}}>Classement</h1>
          <p style={{color:"rgba(255,255,255,.6)",fontSize:14}}>Les 10 meilleures pièces de la semaine</p>
        </div>
      </div>
      <div style={{maxWidth:800,margin:"0 auto",padding:24}}>
        {loading?<div style={{textAlign:"center",padding:60,color:"var(--ink4)"}}>Chargement…</div>
          :ranking.length===0?<Empty icon="ranking" text="Pas encore assez d'avis cette semaine." sub="Revenez après avoir noté quelques pièces !"/>
          :<div style={{display:"flex",flexDirection:"column",gap:12}}>
            {ranking.map((item:any,i:number)=>(
              <Card key={item.playId} hover onClick={()=>onSelectPlay(item.playId)} style={{padding:0,overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",gap:0}}>
                  <div style={{width:60,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:i<3?"linear-gradient(135deg,var(--gold),var(--gold-light))":"var(--cream2)",height:"100%",minHeight:80,fontSize:i<3?24:18,fontWeight:700,color:i<3?"#3D1F00":"var(--ink4)"}}>
                    {i<3?medals[i]:`#${i+1}`}
                  </div>
                  {item.play&&<div style={{width:56,flexShrink:0}}><Poster play={item.play} size={56}/></div>}
                  <div style={{flex:1,padding:"14px 16px"}}>
                    <div className="serif" style={{fontWeight:700,fontSize:15,marginBottom:3}}>{item.playTitle}</div>
                    <div style={{color:"var(--ink4)",fontSize:12,marginBottom:6}}>{item.playPlaywright}</div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <Stars value={Math.round(item.avg)} onChange={()=>{}} readonly size={14}/>
                      <span style={{fontWeight:700,color:"var(--red)",fontSize:14}}>{item.avg.toFixed(1)}</span>
                      <span style={{color:"var(--ink4)",fontSize:12}}>({item.count} avis)</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        }
      </div>
    </div>
  );
};

// ─── WISHLIST ────────────────────────────────────────────────────────────────
const WishlistPage = ({ currentUser, onSelectPlay }: any) => {
  const [reviews,setReviews]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    if(!currentUser){setLoading(false);return;}
    const unsub=onSnapshot(query(collection(db,"reviews"),where("userId","==",currentUser.uid),where("status","==","a-voir"),orderBy("createdAt","desc")),snap=>{setReviews(snap.docs.map(d=>({id:d.id,...d.data()})));setLoading(false);});
    return unsub;
  },[currentUser]);
  return(
    <div style={{minHeight:"100vh",background:"var(--cream)"}}>
      <div style={{background:"linear-gradient(180deg,var(--red-deeper) 0%,var(--red) 100%)",padding:"32px 24px 28px"}}>
        <div style={{maxWidth:800,margin:"0 auto"}}>
          <h1 className="serif" style={{fontSize:28,color:"white",marginBottom:4}}>Wishlist</h1>
          <p style={{color:"rgba(255,255,255,.6)",fontSize:14}}>Les pièces que vous souhaitez voir</p>
        </div>
      </div>
      <div style={{maxWidth:800,margin:"0 auto",padding:24}}>
        {!currentUser?<Empty icon="wishlist" text="Connectez-vous pour voir votre wishlist."/>
          :loading?<div style={{textAlign:"center",padding:60}}>Chargement…</div>
          :reviews.length===0?<Empty icon="wishlist" text="Votre wishlist est vide." sub="Appuyez sur le ♥ d'une pièce pour l'ajouter !"/>
          :<div style={{display:"flex",flexDirection:"column",gap:12}}>
            {reviews.map((r:any)=>(
              <Card key={r.id} hover onClick={()=>onSelectPlay(r.playId)} style={{padding:18,display:"flex",gap:14,alignItems:"center"}}>
                <div style={{flex:1}}><div className="serif" style={{fontWeight:700,fontSize:15,marginBottom:3}}>{r.playTitle}</div><div style={{color:"var(--ink4)",fontSize:13}}>{r.playPlaywright}</div></div>
                <Ic n="heart" s={18} c="var(--red)" fill="var(--red)"/>
              </Card>
            ))}
          </div>
        }
      </div>
    </div>
  );
};

// ─── PROFILE ─────────────────────────────────────────────────────────────────
const ProfilePage = ({ currentUser, userProfile, onSelectPlay, targetUserId }: any) => {
  const [profile,setProfile]=useState<any>(null);
  const [reviews,setReviews]=useState<any[]>([]);
  const [friendReqs,setFriendReqs]=useState<any[]>([]);
  const [editMode,setEditMode]=useState(false);
  const [editForm,setEditForm]=useState<any>({});
  const [loading,setLoading]=useState(true);
  const isOwn=!targetUserId||targetUserId===currentUser?.uid;
  const uid=targetUserId||currentUser?.uid;
  useEffect(()=>{
    if(!uid)return;
    const u1=onSnapshot(doc(db,"users",uid),(s:any)=>{if(s.exists()){setProfile(s.data());setEditForm(s.data());}setLoading(false);});
    const u2=onSnapshot(query(collection(db,"reviews"),where("userId","==",uid),where("status","==","vu"),orderBy("createdAt","desc")),s=>setReviews(s.docs.map(d=>({id:d.id,...d.data()}))));
    return()=>{u1();u2();};
  },[uid]);
  useEffect(()=>{
    if(!isOwn||!currentUser)return;
    const unsub=onSnapshot(query(collection(db,"friendRequests"),where("to","==",currentUser.uid),where("status","==","pending")),s=>setFriendReqs(s.docs.map(d=>({id:d.id,...d.data()}))));
    return unsub;
  },[currentUser,isOwn]);
  const sendFriendReq=async()=>{
    if(!currentUser)return toast("Connectez-vous","error");
    if(uid===currentUser.uid)return;
    if(profile?.friends?.includes(currentUser.uid))return toast("Déjà ami","info");
    const ex=await getDocs(query(collection(db,"friendRequests"),where("from","==",currentUser.uid),where("to","==",uid)));
    if(!ex.empty)return toast("Demande déjà envoyée","info");
    await addDoc(collection(db,"friendRequests"),{from:currentUser.uid,fromPseudo:userProfile?.pseudo||"Quelqu'un",to:uid,status:"pending",createdAt:serverTimestamp()});
    toast("Demande d'ami envoyée !","success");
  };
  const acceptFriend=async(req:any)=>{await updateDoc(doc(db,"friendRequests",req.id),{status:"accepted"});await updateDoc(doc(db,"users",currentUser.uid),{friends:arrayUnion(req.from)});await updateDoc(doc(db,"users",req.from),{friends:arrayUnion(currentUser.uid)});toast("Ami ajouté !","success");};
  const declineFriend=async(req:any)=>{await updateDoc(doc(db,"friendRequests",req.id),{status:"declined"});};
  const saveProfile=async()=>{await updateDoc(doc(db,"users",currentUser.uid),{pseudo:editForm.pseudo,photoURL:editForm.photoURL,bio:editForm.bio});setEditMode(false);toast("Profil mis à jour !","success");};
  if(!currentUser&&!targetUserId)return <div style={{minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center"}}><Empty icon="profile" text="Connectez-vous."/></div>;
  if(loading)return <div style={{minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--ink4)"}}>Chargement…</div>;
  if(!profile)return <div style={{minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center"}}><Empty icon="profile" text="Profil introuvable."/></div>;
  return(
    <div style={{minHeight:"100vh",background:"var(--cream)"}}>
      <div style={{background:"linear-gradient(180deg,var(--red-deeper) 0%,var(--red) 100%)",padding:"32px 24px 36px"}}>
        <div style={{maxWidth:820,margin:"0 auto",display:"flex",gap:20,alignItems:"flex-start",flexWrap:"wrap"}}>
          <Avatar user={profile} size={76}/>
          <div style={{flex:1}}>
            <h1 className="serif" style={{fontSize:24,color:"white",marginBottom:4}}>{profile.pseudo||"Sans pseudo"}</h1>
            {profile.bio&&<p style={{color:"rgba(255,255,255,.65)",fontSize:14,marginBottom:10}}>{profile.bio}</p>}
            <div style={{display:"flex",gap:20,fontSize:13,color:"rgba(255,255,255,.6)",marginBottom:14}}>
              <span><b style={{color:"white"}}>{reviews.length}</b> vues</span>
              <span><b style={{color:"white"}}>{profile.friends?.length||0}</b> amis</span>
            </div>
            {isOwn?<button style={B.soft({fontSize:13,padding:"9px 18px",background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.25)",color:"white",borderRadius:100})} onClick={()=>setEditMode(true)}><Ic n="edit" s={14} c="white"/>Modifier</button>
              :<button style={B.gold({fontSize:13})} onClick={sendFriendReq}><Ic n="adduser" s={14} c="#3D1F00"/>Ajouter en ami</button>}
          </div>
        </div>
      </div>
      <div style={{maxWidth:820,margin:"0 auto",padding:"28px 24px"}}>
        {isOwn&&friendReqs.length>0&&(
          <div style={{marginBottom:28}}>
            <h3 className="serif" style={{fontSize:16,marginBottom:14}}>Demandes d'amis ({friendReqs.length})</h3>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {friendReqs.map((req:any)=>(
                <Card key={req.id} style={{padding:16,display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:"var(--red)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"var(--gold)"}}>{req.fromPseudo?.charAt(0)?.toUpperCase()||"?"}</div>
                  <span style={{flex:1,fontWeight:500,fontSize:14}}>{req.fromPseudo}</span>
                  <button style={B.gold({fontSize:12,padding:"7px 14px"})} onClick={()=>acceptFriend(req)}><Ic n="check" s={13} c="#3D1F00"/>Accepter</button>
                  <button style={B.soft({fontSize:12,padding:"7px 14px"})} onClick={()=>declineFriend(req)}>Refuser</button>
                </Card>
              ))}
            </div>
          </div>
        )}
        <h3 className="serif" style={{fontSize:18,marginBottom:14}}>Pièces vues ({reviews.length})</h3>
        {reviews.length===0?<Empty icon="catalogue" text="Aucune pièce vue pour l'instant."/>
          :<div style={{display:"flex",flexDirection:"column",gap:10}}>
            {reviews.map((r:any)=>(
              <Card key={r.id} hover onClick={()=>onSelectPlay(r.playId)} style={{padding:16,display:"flex",gap:14}}>
                <div style={{flex:1}}>
                  <div className="serif" style={{fontWeight:700,fontSize:15,marginBottom:3}}>{r.playTitle}</div>
                  <div style={{color:"var(--ink4)",fontSize:12,marginBottom:6}}>{r.playPlaywright}</div>
                  <Stars value={r.rating} onChange={()=>{}} readonly size={14}/>
                  {r.comment&&<p style={{color:"var(--ink2)",fontSize:13,marginTop:5,lineHeight:1.55}}>{r.comment}</p>}
                </div>
              </Card>
            ))}
          </div>
        }
      </div>
      {editMode&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16,backdropFilter:"blur(4px)"}}>
          <div style={{background:"var(--white)",borderRadius:"var(--r-xl)",width:"100%",maxWidth:440,boxShadow:"var(--shadow-lg)",padding:28}} className="fade">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
              <h2 className="serif" style={{fontSize:20}}>Modifier le profil</h2>
              <button style={B.icon(false)} onClick={()=>setEditMode(false)}><Ic n="close" s={16} c="var(--ink3)"/></button>
            </div>
            {[["pseudo","Pseudo"],["photoURL","URL de la photo"]].map(([k,label])=>(
              <FRow key={k}><Lbl>{label}</Lbl><input value={editForm[k]||""} onChange={e=>setEditForm((p:any)=>({...p,[k]:e.target.value}))}/></FRow>
            ))}
            <FRow><Lbl>Bio</Lbl><textarea value={editForm.bio||""} onChange={e=>setEditForm((p:any)=>({...p,bio:e.target.value}))} rows={2}/></FRow>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button style={B.soft()} onClick={()=>setEditMode(false)}>Annuler</button>
              <button style={B.gold()} onClick={saveProfile}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── COMMUNITY ───────────────────────────────────────────────────────────────
const CommunityPage = ({ currentUser, userProfile, onSelectPlay, onSelectUser }: any) => {
  const [reviews,setReviews]=useState<any[]>([]);
  const [notifs,setNotifs]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [searchQ,setSearchQ]=useState("");
  const [results,setResults]=useState<any[]>([]);
  const [searching,setSearching]=useState(false);
  const [showNotifs,setShowNotifs]=useState(false);

  useEffect(()=>{
    if(!currentUser){setLoading(false);return;}
    const friends=userProfile?.friends||[];
    const uids=[currentUser.uid,...friends].slice(0,10);
    const unsub=onSnapshot(query(collection(db,"reviews"),where("userId","in",uids),where("status","==","vu"),orderBy("createdAt","desc")),snap=>{setReviews(snap.docs.map(d=>({id:d.id,...d.data()})));setLoading(false);});
    return unsub;
  },[currentUser,userProfile]);

  useEffect(()=>{
    if(!currentUser)return;
    const unsub=onSnapshot(query(collection(db,"notifications"),where("toUserId","==",currentUser.uid),orderBy("createdAt","desc")),snap=>{setNotifs(snap.docs.map(d=>({id:d.id,...d.data()})));});
    return unsub;
  },[currentUser]);

  const unreadCount=notifs.filter((n:any)=>!n.read).length;
  const markAllRead=async()=>{const unread=notifs.filter((n:any)=>!n.read);await Promise.all(unread.map((n:any)=>updateDoc(doc(db,"notifications",n.id),{read:true})));};

  const searchUsers=async()=>{
    if(!searchQ.trim())return;setSearching(true);
    const snap=await getDocs(collection(db,"users"));
    setResults(snap.docs.map(d=>({id:d.id,...d.data()} as any)).filter((u:any)=>u.pseudo?.toLowerCase().includes(searchQ.toLowerCase())&&u.id!==currentUser?.uid));
    setSearching(false);
  };

  return(
    <div style={{minHeight:"100vh",background:"var(--cream)"}}>
      <div style={{background:"linear-gradient(180deg,var(--red-deeper) 0%,var(--red) 100%)",padding:"32px 24px 28px"}}>
        <div style={{maxWidth:760,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <h1 className="serif" style={{fontSize:28,color:"white"}}>Communauté</h1>
            {currentUser&&(
              <div style={{position:"relative"}}>
                <button style={{...B.soft({padding:"9px 14px",background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.25)",color:"white",borderRadius:100}),position:"relative"}} onClick={()=>{setShowNotifs(p=>!p);if(!showNotifs)markAllRead();}}>
                  <Ic n="bell" s={18} c="white"/>
                  {unreadCount>0&&<span style={{position:"absolute",top:-4,right:-4,width:18,height:18,borderRadius:"50%",background:"var(--gold)",color:"#3D1F00",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{unreadCount}</span>}
                </button>
                {showNotifs&&(
                  <div style={{position:"absolute",right:0,top:"calc(100% + 8px)",background:"var(--white)",border:"1px solid var(--border)",borderRadius:"var(--r-lg)",boxShadow:"var(--shadow-lg)",width:300,maxHeight:320,overflowY:"auto",zIndex:300,animation:"slideDown .2s ease"}}>
                    <div style={{padding:"14px 16px",borderBottom:"1px solid var(--border)",fontWeight:600,fontSize:14}}>Notifications</div>
                    {notifs.length===0?<div style={{padding:"20px 16px",textAlign:"center",color:"var(--ink4)",fontSize:13}}>Aucune notification.</div>
                      :notifs.map((n:any)=>(
                        <div key={n.id} style={{padding:"12px 16px",borderBottom:"1px solid var(--cream2)",background:n.read?"transparent":"rgba(201,168,76,.06)"}}>
                          <p style={{fontSize:13}}><b>{n.fromPseudo}</b> a commenté votre avis</p>
                          {n.text&&<p style={{fontSize:12,color:"var(--ink3)",marginTop:3,fontStyle:"italic"}}>"{n.text}"</p>}
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{background:"rgba(0,0,0,.2)",borderRadius:"var(--r-lg)",padding:18}}>
            <p style={{color:"rgba(255,255,255,.7)",fontSize:11,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",marginBottom:10}}>Rechercher un utilisateur</p>
            <div style={{display:"flex",gap:10}}>
              <div style={{position:"relative",flex:1}}>
                <div style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)"}}><Ic n="search" s={15} c="var(--ink4)"/></div>
                <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchUsers()} placeholder="Pseudo…" style={{paddingLeft:36,borderRadius:100}}/>
              </div>
              <button style={B.gold({flexShrink:0,fontSize:13})} onClick={searchUsers} disabled={searching}>{searching?"…":"Rechercher"}</button>
            </div>
            {results.length>0&&(
              <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:8}}>
                {results.map((u:any)=>(
                  <div key={u.id} style={{background:"var(--white)",borderRadius:"var(--r-md)",padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
                    <Avatar user={u} size={36}/>
                    <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>{u.pseudo}</div>{u.bio&&<div style={{color:"var(--ink4)",fontSize:12}}>{u.bio}</div>}</div>
                    <button style={B.gold({fontSize:12,padding:"7px 14px"})} onClick={()=>onSelectUser(u.id)}>Voir profil</button>
                  </div>
                ))}
              </div>
            )}
            {searchQ&&results.length===0&&!searching&&<p style={{color:"rgba(255,255,255,.4)",fontSize:13,marginTop:8}}>Aucun utilisateur trouvé.</p>}
          </div>
        </div>
      </div>
      <div style={{maxWidth:760,margin:"0 auto",padding:24}}>
        <h2 className="serif" style={{fontSize:18,marginBottom:16}}>Activité récente</h2>
        {!currentUser?<Empty icon="community" text="Connectez-vous pour voir l'activité."/>
          :loading?<div style={{textAlign:"center",padding:40}}>Chargement…</div>
          :reviews.length===0?<Empty icon="community" text="Aucune activité." sub="Ajoutez des amis pour voir leurs avis !"/>
          :<div style={{display:"flex",flexDirection:"column",gap:12}}>
            {reviews.map((r:any)=>(
              <Card key={r.id} style={{padding:18}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                  <div style={{width:34,height:34,borderRadius:"50%",background:"var(--red)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"var(--gold)",cursor:"pointer",flexShrink:0}} onClick={()=>onSelectUser(r.userId)}>{r.userPseudo?.charAt(0)?.toUpperCase()||"?"}</div>
                  <div><span style={{fontWeight:600,cursor:"pointer",fontSize:14}} onClick={()=>onSelectUser(r.userId)}>{r.userPseudo}</span><span style={{color:"var(--ink4)",fontSize:13}}> a vu</span></div>
                </div>
                <div onClick={()=>onSelectPlay(r.playId)} style={{cursor:"pointer",paddingLeft:44,marginBottom:10}}>
                  <div className="serif" style={{fontWeight:700,marginBottom:4}}>{r.playTitle}</div>
                  <div style={{color:"var(--ink4)",fontSize:12,marginBottom:6}}>{r.playPlaywright}</div>
                  <Stars value={r.rating} onChange={()=>{}} readonly size={14}/>
                  {r.comment&&<p style={{color:"var(--ink2)",fontSize:13,marginTop:5,lineHeight:1.55}}>{r.comment}</p>}
                </div>
                <div style={{paddingLeft:44}}><ReviewComments reviewId={r.id} reviewOwnerId={r.userId} currentUser={currentUser} userProfile={userProfile}/></div>
              </Card>
            ))}
          </div>
        }
      </div>
    </div>
  );
};

// ─── AUTH ────────────────────────────────────────────────────────────────────
const AuthPage = ({ onSuccess }: any) => {
  const [mode,setMode]=useState("login");
  const [form,setForm]=useState({email:"",password:"",pseudo:""});
  const [loading,setLoading]=useState(false);
  const set=(k: string,v: string)=>setForm(p=>({...p,[k]:v}));
  const handleSubmit=async()=>{
    setLoading(true);
    try{
      if(mode==="login"){await signInWithEmailAndPassword(auth,form.email,form.password);toast("Bienvenue !","success");}
      else{
        if(!form.pseudo.trim())return toast("Choisissez un pseudo","error");
        const cred=await createUserWithEmailAndPassword(auth,form.email,form.password);
        await updateProfile(cred.user,{displayName:form.pseudo});
        await setDoc(doc(db,"users",cred.user.uid),{pseudo:form.pseudo,email:form.email,photoURL:"",bio:"",friends:[],createdAt:serverTimestamp()});
        toast("Compte créé !","success");
      }
      onSuccess?.();
    }catch(e: any){
      const msgs: any={"auth/email-already-in-use":"Email déjà utilisé","auth/invalid-email":"Email invalide","auth/wrong-password":"Mot de passe incorrect","auth/user-not-found":"Utilisateur introuvable","auth/weak-password":"Min. 6 caractères","auth/invalid-credential":"Email ou mot de passe incorrect"};
      toast(msgs[e.code]||e.message,"error");
    }finally{setLoading(false);}
  };
  return(
    <div style={{minHeight:"100vh",display:"flex",background:"var(--red)"}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40,gap:16}}>
        <LogoMark size={80}/>
        <h1 className="serif" style={{fontSize:36,color:"white",textAlign:"center"}}>MyTheatre</h1>
        <p style={{color:"rgba(255,255,255,.6)",fontSize:15,textAlign:"center",maxWidth:260,lineHeight:1.6,fontStyle:"italic"}}>Votre journal de bord théâtral.</p>
      </div>
      <div style={{width:"min(420px,100%)",background:"var(--white)",display:"flex",alignItems:"center",justifyContent:"center",padding:40,boxShadow:"-20px 0 60px rgba(0,0,0,.15)"}}>
        <div style={{width:"100%"}} className="fade">
          <h2 className="serif" style={{fontSize:22,marginBottom:6}}>{mode==="login"?"Connexion":"Créer un compte"}</h2>
          <p style={{color:"var(--ink4)",fontSize:14,marginBottom:28}}>{mode==="login"?"Heureux de vous revoir !":"Rejoignez la communauté."}</p>
          {mode==="register"&&<FRow><Lbl>Pseudo</Lbl><input value={form.pseudo} onChange={e=>set("pseudo",e.target.value)} placeholder="Votre pseudo"/></FRow>}
          <FRow><Lbl>Email</Lbl><input value={form.email} onChange={e=>set("email",e.target.value)} placeholder="votre@email.com" type="email"/></FRow>
          <div style={{marginBottom:24}}><Lbl>Mot de passe</Lbl><input value={form.password} onChange={e=>set("password",e.target.value)} placeholder="••••••••" type="password" onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/></div>
          <button style={{...B.primary({width:"100%",justifyContent:"center",padding:14,fontSize:15,borderRadius:"var(--r-md)"})}} onClick={handleSubmit} disabled={loading}>{loading?"Chargement…":mode==="login"?"Se connecter":"Créer un compte"}</button>
          <div style={{textAlign:"center",marginTop:20}}>
            <span style={{color:"var(--ink4)",fontSize:13}}>{mode==="login"?"Pas encore de compte ?":"Déjà un compte ?"}</span>
            <button style={{background:"none",color:"var(--red)",fontWeight:600,fontSize:13,marginLeft:6,textDecoration:"underline"}} onClick={()=>setMode(mode==="login"?"register":"login")}>{mode==="login"?"S'inscrire":"Se connecter"}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── NAVBAR ──────────────────────────────────────────────────────────────────
const Navbar = ({ page, setPage, currentUser, userProfile, onLogout }: any) => {
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{const h=(e: MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false)};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h)},[]);
  const tabs=[
    {id:"catalogue",icon:"catalogue",label:"Catalogue"},
    {id:"ranking",icon:"ranking",label:"Classement"},
    {id:"community",icon:"community",label:"Communauté"},
    {id:"wishlist",icon:"wishlist",label:"Wishlist"},
    {id:"profil",icon:"profile",label:"Profil"},
  ];
  return(
    <nav style={{background:"var(--red-deeper)",position:"sticky",top:0,zIndex:200,height:56,display:"flex",alignItems:"center",padding:"0 16px",borderBottom:"1px solid rgba(201,168,76,.3)",width:"100%"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginRight:16,cursor:"pointer",flexShrink:0}} onClick={()=>setPage("catalogue")}>
        <LogoMark size={28}/>
        <span className="serif nav-label" style={{fontSize:16,color:"var(--gold)",fontWeight:700}}>MyTheatre</span>
      </div>
      <div style={{display:"flex",gap:2,flex:1}}>
        {tabs.map(tab=>(
          <button key={tab.id} onClick={()=>setPage(tab.id)} title={tab.label}
            style={{width:40,height:40,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:page===tab.id?"rgba(201,168,76,.18)":"transparent",border:`1.5px solid ${page===tab.id?"rgba(201,168,76,.5)":"transparent"}`,color:page===tab.id?"var(--gold)":"rgba(255,255,255,.55)",transition:"all .18s"}}>
            <Ic n={tab.icon} s={18} c={page===tab.id?"var(--gold)":"rgba(255,255,255,.55)"}/>
          </button>
        ))}
      </div>
      <div ref={ref} style={{position:"relative",flexShrink:0}}>
        {currentUser?(
          <>
            <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"5px 10px",borderRadius:100,border:"1px solid rgba(201,168,76,.35)",transition:"border-color .2s"}}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.borderColor="var(--gold)"}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.borderColor="rgba(201,168,76,.35)"}
              onClick={()=>setOpen(p=>!p)}>
              <Avatar user={userProfile||currentUser} size={26}/>
              <span style={{fontSize:13,color:"var(--cream)",maxWidth:90,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{userProfile?.pseudo||currentUser.displayName}</span>
              <Ic n="chevron" s={14} c="var(--gold)"/>
            </div>
            {open&&(
              <div style={{position:"absolute",right:0,top:"calc(100% + 8px)",background:"var(--white)",border:"1px solid var(--border)",borderRadius:"var(--r-lg)",overflow:"hidden",minWidth:170,boxShadow:"var(--shadow-lg)",animation:"slideDown .2s ease",zIndex:300}}>
                <button style={{display:"flex",width:"100%",padding:"13px 16px",background:"transparent",color:"var(--ink)",fontSize:14,border:"none",borderBottom:"1px solid var(--border)",cursor:"pointer",alignItems:"center",gap:10}} onClick={()=>{setPage("profil");setOpen(false);}}>
                  <Ic n="profile" s={15} c="var(--ink3)"/>Mon profil
                </button>
                <button style={{display:"flex",width:"100%",padding:"13px 16px",background:"transparent",color:"var(--red)",fontSize:14,border:"none",cursor:"pointer",alignItems:"center",gap:10}} onClick={()=>{onLogout();setOpen(false);}}>
                  <Ic n="logout" s={15} c="var(--red)"/>Déconnexion
                </button>
              </div>
            )}
          </>
        ):(
          <button style={B.gold({fontSize:13,padding:"8px 16px"})} onClick={()=>setPage("auth")}>Connexion</button>
        )}
      </div>
    </nav>
  );
};

// ─── APP ROOT ────────────────────────────────────────────────────────────────
export default function App() {
  const [page,setPage]=useState("catalogue");
  const [currentUser,setCurrentUser]=useState<any>(null);
  const [userProfile,setUserProfile]=useState<any>(null);
  const [userReviews,setUserReviews]=useState<any[]>([]);
  const [selectedPlayId,setSelectedPlayId]=useState<string|null>(null);
  const [selectedUserId,setSelectedUserId]=useState<string|null>(null);
  const [authLoading,setAuthLoading]=useState(true);

  useEffect(()=>{
    const unsub=onAuthStateChanged(auth,async(user: any)=>{
      setCurrentUser(user);
      if(user){
        const snap=await getDoc(doc(db,"users",user.uid));
        if(snap.exists())setUserProfile(snap.data());
        else{const p={pseudo:user.displayName||"Spectateur",email:user.email,photoURL:"",bio:"",friends:[],createdAt:serverTimestamp()};await setDoc(doc(db,"users",user.uid),p);setUserProfile(p);}
      }else setUserProfile(null);
      setAuthLoading(false);
    });
    return unsub;
  },[]);

  useEffect(()=>{
    if(!currentUser)return;
    const u1=onSnapshot(doc(db,"users",currentUser.uid),(snap: any)=>{if(snap.exists())setUserProfile(snap.data());});
    const u2=onSnapshot(query(collection(db,"reviews"),where("userId","==",currentUser.uid)),snap=>setUserReviews(snap.docs.map(d=>({id:d.id,...d.data()}))));
    return()=>{u1();u2();};
  },[currentUser]);

  const selectPlay=(id: string)=>{setSelectedPlayId(id);setSelectedUserId(null);window.scrollTo(0,0);};
  const selectUser=(id: string)=>{setSelectedUserId(id);setSelectedPlayId(null);setPage("profil");window.scrollTo(0,0);};
  const logout=async()=>{await signOut(auth);setPage("catalogue");setSelectedPlayId(null);setSelectedUserId(null);toast("À bientôt !","info");};
  const changePage=(p: string)=>{setSelectedPlayId(null);setSelectedUserId(null);setPage(p);};

  if(authLoading)return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--red)",flexDirection:"column",gap:16}}>
      <style>{CSS}</style>
      <LogoMark size={72}/>
      <div className="serif" style={{color:"var(--gold)",fontSize:24}}>MyTheatre</div>
      <div style={{color:"rgba(255,255,255,.5)",fontSize:13}}>Chargement…</div>
    </div>
  );

  const renderContent=()=>{
    if(selectedPlayId)return <PlayDetail playId={selectedPlayId} currentUser={currentUser} userProfile={userProfile} onBack={()=>setSelectedPlayId(null)}/>;
    if(page==="auth")return <AuthPage onSuccess={()=>setPage("catalogue")}/>;
    if(page==="profil")return <ProfilePage currentUser={currentUser} userProfile={userProfile} onSelectPlay={selectPlay} targetUserId={selectedUserId}/>;
    if(page==="wishlist")return <WishlistPage currentUser={currentUser} onSelectPlay={selectPlay}/>;
    if(page==="ranking")return <RankingPage onSelectPlay={selectPlay}/>;
    if(page==="community")return <CommunityPage currentUser={currentUser} userProfile={userProfile} onSelectPlay={selectPlay} onSelectUser={selectUser}/>;
    return <CataloguePage currentUser={currentUser} onSelectPlay={selectPlay} userReviews={userReviews}/>;
  };

  return(
    <>
      <style>{CSS}</style>
      {page!=="auth"&&<Navbar page={page} setPage={changePage} currentUser={currentUser} userProfile={userProfile} onLogout={logout}/>}
      <main style={{width:"100%",overflowX:"hidden"}}>{renderContent()}</main>
      {page!=="auth"&&<footer style={{background:"var(--red-deeper)",borderTop:"1px solid rgba(201,168,76,.2)",padding:"18px 24px",textAlign:"center"}}><span className="serif" style={{color:"var(--gold)",fontSize:13}}>MyTheatre</span><span style={{color:"rgba(255,255,255,.3)",fontSize:12,marginLeft:10}}>Votre journal de bord théâtral</span></footer>}
      <Toast/>
    </>
  );
}
