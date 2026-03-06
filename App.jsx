import { useState, useEffect, useMemo, useCallback, useRef } from "https://esm.sh/react@18";
import * as XLSX from "https://cdn.sheetjs.com/xlsx-latest/package/xlsx.mjs";

/* ═══════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════ */
const parseCSVLine = (line) => {
  const result = []; let cur = ""; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') inQ = !inQ;
    else if (line[i] === ',' && !inQ) { result.push(cur.trim()); cur = ""; }
    else cur += line[i];
  }
  result.push(cur.trim());
  return result;
};
const parseBRL = (v) => v ? parseFloat(v.replace(/\./g, "").replace(",", ".")) || 0 : 0;
const fmtBRL = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const fmtDate = (str) => {
  if (!str) return null;
  const [dp] = str.split(","); const [d, m, y] = dp.trim().split("/");
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
};
const fmtDateStr = (d) => d ? d.toLocaleDateString("pt-BR") : "";
const uid = () => `_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const STORAGE_KEY = "voo_dos_gansos_v2";

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);

    // Rehidrata datas (sales.date vem como string)
    if (Array.isArray(s.sales)) {
      s.sales = s.sales.map(x => ({
        ...x,
        date: x.date ? new Date(x.date) : null,
      }));
    }
    return s;
  } catch (e) {
    return null;
  }
};

const saveState = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // se o navegador bloquear ou lotar espaço, ignora
  }
};
/* ═══════════════════════════════════════════
   THEME — LIGHT, Duolingo/Ornament inspired
   ═══════════════════════════════════════════ */
const C = {
  bg: "#F7F8FA",
  card: "#FFFFFF",
  cardHover: "#F0FFF0",
  border: "#E8ECF0",
  borderLight: "#F0F2F5",
  text: "#1A2B3C",
  textSec: "#5A7084",
  textMuted: "#8FA3B3",
  primary: "#58CC02",
  primaryDark: "#46A302",
  primaryBg: "#E8F9D4",
  orange: "#FF9600",
  orangeBg: "#FFF3E0",
  purple: "#CE82FF",
  purpleBg: "#F3E8FF",
  blue: "#1CB0F6",
  blueBg: "#E3F5FD",
  red: "#FF4B4B",
  redBg: "#FFF0F0",
  gold: "#FFC800",
  goldBg: "#FFFDE7",
  teal: "#00D68F",
  tealBg: "#E0FFF4",
  pink: "#FF6B9D",
  pinkBg: "#FFF0F5",
  shadow: "0 2px 12px rgba(0,0,0,0.06)",
  shadowLg: "0 8px 32px rgba(0,0,0,0.08)",
  palette: ["#58CC02","#FF9600","#CE82FF","#1CB0F6","#FF4B4B","#FFC800","#00D68F","#FF6B9D","#45AAFB","#FFA94D","#A855F7","#F43F5E"],
};

/* ═══════════════════════════════════════════
   ICONS (inline SVG)
   ═══════════════════════════════════════════ */
const I = {
  Bird: (p) => <svg width={p.s||22} height={p.s||22} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 7h.01M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20"/><path d="m20 7 2 .5-2 .5M10 18v3M14 17.75V21M7 18a6 6 0 0 0 3.84-10.61"/></svg>,
  Egg: (p) => <svg width={p.s||22} height={p.s||22} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="14" rx="7" ry="9"/></svg>,
  Chart: (p) => <svg width={p.s||22} height={p.s||22} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>,
  Users: (p) => <svg width={p.s||22} height={p.s||22} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Plus: (p) => <svg width={p.s||22} height={p.s||22} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>,
  Upload: (p) => <svg width={p.s||22} height={p.s||22} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  Download: (p) => <svg width={p.s||22} height={p.s||22} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Home: (p) => <svg width={p.s||22} height={p.s||22} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Settings: (p) => <svg width={p.s||22} height={p.s||22} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Trash: (p) => <svg width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Right: (p) => <svg width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Left: (p) => <svg width={p.s||22} height={p.s||22} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  Dollar: (p) => <svg width={p.s||22} height={p.s||22} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  X: (p) => <svg width={p.s||20} height={p.s||20} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Edit: (p) => <svg width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Eye: (p) => <svg width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Lock: (p) => <svg width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  TrendUp: (p) => <svg width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
};

/* ═══════════════════════════════════════════
   BIRD SPECIES DATABASE
   ═══════════════════════════════════════════ */
const SPECIES = [
  "Ameraucana","Angola Branca","Angola Canela (João de Barro)","Angola Francesa (Carijó)","Angola Lavanda","Angola Negra (Black)",
  "Ayam Cemani","Belgium Mil Flores","Brahma Azul","Brahma Black","Brahma Branca (White)","Brahma Buff","Brahma Carijó",
  "Brahma Dark","Brahma Isabella","Brahma Lemon Pyle","Brahma Light","Brahma Mottled","Brahma Perdiz","Brahma Silver","Brahma Splash",
  "Cara de Palhaço (White Face)","Faisão Canário","Faisão Coleira","Faisão Dourado","Faisão Versicolor",
  "Fenix Prateada","GSB - Galinha Sertaneja Balão","Ganso da Pomerania Pardo","Ganso Sinaleiro Chinês",
  "Ko Shamo","Índio Gigante","Marreco Carolina","Marreco Corredor Indiano","Marreco Mini Cool","Marreco Mini Cool Alerquim",
  "Marreco Pequim","Marreco Pompom Branco","Marreco Pompom Colorido","Marreco Rouen",
  "Mini Cochin Azul","Mini Cochin Branca","Mini Cochin Preta","Músico Brasileiro",
  "Pato Cayuga","Pato Chocolate","Pato Gigante Alemão","Pavão Arlequim","Pavão Azul","Pavão Ombros Negros",
  "Peru Bourbon Red","Peru Branco","Peru Bronze","Peru Lavanda","Peru Tricolor",
  "Plymouth Rock Barrada","Polonesa Branca","Polonesa Camurça","Polonesa Dourada","Polonesa Prateada",
  "Rhode Island Red","Sebright Dourada","Sebright Prateada",
  "Sedosa do Japão","Sedosa Dourada","Sedosa Preta (Black)","Sedosa Splash",
  "Serama","Vorwerk","Wyadotte Dourada Laceada",
].sort();

/* ═══════════════════════════════════════════
   SAMPLE DATA
   ═══════════════════════════════════════════ */
const INIT_INVESTORS = [
  { id:"inv1", name:"Carlos Mendes", email:"carlos@email.com", phone:"(19)99888-7766", joinDate:"2025-01-15", eggPct:10, salePct:6.4 },
  { id:"inv2", name:"Ana Beatriz Silva", email:"ana@email.com", phone:"(11)98877-6655", joinDate:"2025-02-01", eggPct:10, salePct:6.4 },
  { id:"inv3", name:"Roberto Almeida", email:"roberto@email.com", phone:"(21)97766-5544", joinDate:"2025-03-10", eggPct:10, salePct:6.4 },
  { id:"inv4", name:"Juliana Costa", email:"juliana@email.com", phone:"(31)96655-4433", joinDate:"2025-04-01", eggPct:10, salePct:6.4 },
  { id:"inv5", name:"Marcos Paulo", email:"marcos@email.com", phone:"(41)95544-3322", joinDate:"2025-05-15", eggPct:10, salePct:6.4 },
];

const INIT_BIRDS = [
  { id:"b1", species:"Brahma Light", investorId:"inv1", matrizes:2, reprodutores:1, tag:"BL-001", purchasePrice:350 },
  { id:"b2", species:"Brahma Dark", investorId:"inv1", matrizes:1, reprodutores:1, tag:"BD-002", purchasePrice:400 },
  { id:"b3", species:"Pavão Azul", investorId:"inv2", matrizes:3, reprodutores:1, tag:"PA-003", purchasePrice:1200 },
  { id:"b4", species:"Faisão Dourado", investorId:"inv2", matrizes:2, reprodutores:1, tag:"FD-004", purchasePrice:600 },
  { id:"b5", species:"Peru Bronze", investorId:"inv3", matrizes:2, reprodutores:1, tag:"PB-005", purchasePrice:500 },
  { id:"b6", species:"Peru Branco", investorId:"inv3", matrizes:1, reprodutores:0, tag:"PBR-006", purchasePrice:450 },
  { id:"b7", species:"Sedosa do Japão", investorId:"inv4", matrizes:3, reprodutores:1, tag:"SJ-007", purchasePrice:200 },
  { id:"b8", species:"Sedosa Preta (Black)", investorId:"inv4", matrizes:2, reprodutores:0, tag:"SP-008", purchasePrice:250 },
  { id:"b9", species:"Angola Branca", investorId:"inv5", matrizes:1, reprodutores:1, tag:"AB-009", purchasePrice:180 },
  { id:"b10", species:"Marreco Mini Cool", investorId:"inv5", matrizes:2, reprodutores:1, tag:"MC-010", purchasePrice:150 },
  { id:"b11", species:"Faisão Canário", investorId:"inv2", matrizes:2, reprodutores:0, tag:"FC-011", purchasePrice:700 },
  { id:"b12", species:"Angola Negra (Black)", investorId:"inv5", matrizes:1, reprodutores:0, tag:"AN-012", purchasePrice:200 },
  { id:"b13", species:"Sebright Prateada", investorId:"inv1", matrizes:2, reprodutores:1, tag:"SP-013", purchasePrice:300 },
  { id:"b14", species:"Peru Lavanda", investorId:"inv3", matrizes:1, reprodutores:1, tag:"PL-014", purchasePrice:550 },
  { id:"b15", species:"Polonesa Dourada", investorId:"inv4", matrizes:2, reprodutores:1, tag:"PD-015", purchasePrice:280 },
];

const INIT_INVESTMENTS = [
  { id:"fi1", investorId:"inv1", amount:5000, date:"2025-01-15", description:"Aporte inicial" },
  { id:"fi2", investorId:"inv2", amount:8000, date:"2025-02-01", description:"Aporte inicial" },
  { id:"fi3", investorId:"inv3", amount:3000, date:"2025-06-01", description:"Aporte adicional" },
];

/* ═══════════════════════════════════════════
   CHART COMPONENTS
   ═══════════════════════════════════════════ */
const BarChart = ({ data, w = 320, h = 130 }) => {
  if (!data?.length) return <div style={{color:C.textMuted,fontSize:13,padding:20,textAlign:"center"}}>Sem dados para exibir</div>;
  const mx = Math.max(...data.map(d=>d.value),1);
  const bw = Math.min(28, (w-20)/data.length-4);
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{overflow:"visible"}}>
      {data.map((d,i)=>{
        const bh=(d.value/mx)*(h-28); const x=12+i*(bw+5); const y=h-22-bh;
        return (<g key={i}>
          <rect x={x} y={y} width={bw} height={bh} rx={5} fill={d.color||C.primary} opacity={0.85}><animate attributeName="height" from="0" to={bh} dur="0.5s" fill="freeze"/><animate attributeName="y" from={h-22} to={y} dur="0.5s" fill="freeze"/></rect>
          <text x={x+bw/2} y={h-5} textAnchor="middle" fill={C.textMuted} fontSize={9} fontWeight="700">{d.label}</text>
        </g>);
      })}
    </svg>
  );
};

const Donut = ({ data, size=170 }) => {
  const total = data.reduce((s,d)=>s+d.value,0);
  if(total===0) return <div style={{color:C.textMuted,padding:20,textAlign:"center",fontSize:13}}>Sem dados</div>;
  const cx=size/2,cy=size/2,r=size*0.35,sw=size*0.13;
  let cum=-Math.PI/2;
  const arcs=data.map((d,i)=>{
    const a=(d.value/total)*2*Math.PI;
    const sx=cx+r*Math.cos(cum),sy=cy+r*Math.sin(cum);
    cum+=a;
    const ex=cx+r*Math.cos(cum),ey=cy+r*Math.sin(cum);
    return {path:`M ${sx} ${sy} A ${r} ${r} 0 ${a>Math.PI?1:0} 1 ${ex} ${ey}`,color:d.color||C.palette[i%12]};
  });
  return (
    <svg width={size} height={size} style={{overflow:"visible"}}>
      {arcs.map((a,i)=><path key={i} d={a.path} fill="none" stroke={a.color} strokeWidth={sw} strokeLinecap="round" opacity={0.9}/>)}
      <text x={cx} y={cy-4} textAnchor="middle" fill={C.text} fontSize={16} fontWeight="900">{fmtBRL(total)}</text>
      <text x={cx} y={cy+14} textAnchor="middle" fill={C.textMuted} fontSize={10}>Total</text>
    </svg>
  );
};

/* ═══════════════════════════════════════════
   STYLES HELPER
   ═══════════════════════════════════════════ */
const S = {
  card: {background:C.card,borderRadius:18,padding:18,marginBottom:12,border:`1px solid ${C.border}`,boxShadow:C.shadow},
  input: {background:C.bg,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"12px 16px",fontSize:14,color:C.text,width:"100%",boxSizing:"border-box",outline:"none",fontFamily:"inherit",transition:"border 0.2s"},
  select: {background:C.bg,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"12px 16px",fontSize:14,color:C.text,width:"100%",boxSizing:"border-box",outline:"none",fontFamily:"inherit",appearance:"none"},
  label: {fontSize:11,fontWeight:800,color:C.textMuted,marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:0.8},
  btn: (c=C.primary) => ({background:c,color:"#fff",border:"none",borderRadius:14,padding:"13px 22px",fontSize:14,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",gap:8,justifyContent:"center",width:"100%",transition:"all 0.15s",boxShadow:`0 4px 14px ${c}40`}),
  btnOut: (c=C.primary) => ({background:"transparent",color:c,border:`2.5px solid ${c}`,borderRadius:14,padding:"11px 20px",fontSize:14,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",gap:8,justifyContent:"center",width:"100%"}),
  chip: (on) => ({padding:"7px 16px",borderRadius:24,fontSize:12,fontWeight:800,cursor:"pointer",border:"none",background:on?C.primary:C.bg,color:on?"#fff":C.textMuted,transition:"all 0.15s",whiteSpace:"nowrap",boxShadow:on?`0 2px 8px ${C.primary}40`:"none"}),
  badge: (c) => ({display:"inline-block",padding:"3px 11px",borderRadius:20,fontSize:10,fontWeight:800,background:`${c}18`,color:c}),
  avatar: (c,sz=46) => ({width:sz,height:sz,borderRadius:Math.round(sz*0.32),background:`linear-gradient(135deg, ${c}, ${c}BB)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:Math.round(sz*0.34),fontWeight:900,color:"#fff",flexShrink:0,boxShadow:`0 4px 12px ${c}30`}),
  stat: (c) => ({background:`linear-gradient(135deg, ${c}10, ${c}05)`,border:`1.5px solid ${c}25`,borderRadius:16,padding:16,flex:1,minWidth:0}),
  overlay: {position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.35)",backdropFilter:"blur(4px)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"},
  modal: {background:C.card,borderRadius:"24px 24px 0 0",padding:"24px 22px 40px",width:"100%",maxWidth:480,maxHeight:"88vh",overflowY:"auto",position:"relative"},
  handle: {width:42,height:5,borderRadius:3,background:C.border,margin:"0 auto 20px"},
};

/* ═══════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════ */
export default function App() {
  const [page, setPage] = useState("dashboard");
  const initial = useMemo(() => loadState(), []);

const [investors, setInvestors] = useState(initial?.investors || INIT_INVESTORS);
const [birds, setBirds] = useState(initial?.birds || INIT_BIRDS);
const [sales, setSales] = useState(initial?.sales || []);
const [investments, setInvestments] = useState(initial?.investments || INIT_INVESTMENTS);
  const [selInv, setSelInv] = useState(null);
  const [modal, setModal] = useState(null); // 'addInv','addBird','addInvest','import','editInv','editBird'
  const [editInvData, setEditInvData] = useState(null);
  const [editBirdData, setEditBirdData] = useState(null);
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);

  const showToast = (msg,type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };
  const getAvatar = (name) => name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const getColor = (idx) => C.palette[idx % C.palette.length];

  // ── CSV PARSER ──
  const parseCSV = (text) => {
    const lines = text.split("\n").filter(l=>l.trim());
    if(lines.length<3) return [];
    const parsed=[];
    for(let i=2;i<lines.length;i++){
      const c=parseCSVLine(lines[i]);
      if(!c[0]||c[8]!=="Bem-sucedido"||c[43]!=="eCom Platform") continue;
      const date=fmtDate(c[0]), total=parseBRL(c[4]), productStr=c[45]||"", qty=parseInt(c[46])||0, discount=parseBRL(c[47]), shipping=parseBRL(c[48]);
      const products = productStr.split(",").map(p=>p.trim()).filter(Boolean);
      parsed.push({ id:c[1], date, total, products, productStr, qty, discount, shipping, buyerName:`${c[16]||""} ${c[17]||""}`.trim(), orderId:c[44] });
    }
    return parsed;
  };

  const handleFile = (e) => {
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=(ev)=>{
      try{
        const buf=new Uint8Array(ev.target.result);
        const wb=XLSX.read(buf,{type:"array",cellDates:true});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const raw=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
        if(raw.length<3){showToast("Arquivo vazio","error");return;}
        const ns=[];
        for(let i=2;i<raw.length;i++){
          const row=raw[i];
          const status=String(row[8]||"").trim();
          if(status!=="Bem-sucedido")continue;
          const ot=String(row[43]||"").trim();
          if(ot!=="eCom Platform")continue;
          const ps=String(row[45]||"");
          if(!ps||ps.startsWith("Payment for order"))continue;
          let dv=row[2];let dt=dv instanceof Date?dv:new Date(String(dv));
          if(!dt||isNaN(dt.getTime()))continue;
          const val=parseFloat(row[4])||0;
          const liq=parseFloat(row[7])||0;
          const total=liq>0?liq:val;
          const shipping=parseFloat(row[48])||0;
          const qty=parseInt(row[46])||1;
          const products=ps.split(",").map(p=>p.trim()).filter(p=>{const u=p.toUpperCase();return p&&!u.includes("TAXA EXTRA")&&!u.includes("FRETE")&&!p.startsWith("Payment ");});
          if(!products.length)continue;
          ns.push({id:String(row[1]||uid()),date:dt,total,products,productStr:ps,qty,discount:0,shipping,buyerName:"",orderId:String(row[44]||"")});
        }
        setSales(prev=>{const ids=new Set(prev.map(s=>s.id));return[...prev,...ns.filter(s=>!ids.has(s.id))].sort((a,b)=>b.date-a.date);});
        showToast(`${ns.length} vendas eCom importadas!`);
        setModal(null);
      }catch(err){showToast("Erro: "+err.message,"error");}
    };
    r.readAsArrayBuffer(f);
    e.target.value="";
  };

  // ── SPECIES→INVESTOR MAP ──
  const specMap = useMemo(()=>{
    const m={};
    birds.forEach(b=>{ m[b.species.toLowerCase()]=b.investorId; });
    return m;
  },[birds]);

  // ── PROFIT DISTRIBUTION ──
  const profitDist = useMemo(()=>{
    const d={};
    investors.forEach(inv=>{ d[inv.id]={eggs:0,birds:0,total:0,count:0,details:[]}; });
    sales.forEach(sale=>{
      sale.products.forEach(product=>{
        const isEgg = product.startsWith("OVO -") || product.startsWith("OVO -");
        const clean = product.replace(/^OVO\s*-\s*/i,"").replace(/\s*Sexo:.*$/,"").trim().toLowerCase();
        const invId = specMap[clean];
        if(!invId||!d[invId]) return;
        const inv = investors.find(i=>i.id===invId);
        if(!inv) return;
        const perItem = sale.products.length>0 ? (sale.total - sale.shipping) / sale.products.length : 0;
        const profit = isEgg ? perItem*(inv.eggPct/100) : perItem*(inv.salePct/100);
        d[invId].total+=profit;
        if(isEgg) d[invId].eggs+=profit; else d[invId].birds+=profit;
        d[invId].count++;
        d[invId].details.push({ date:sale.date, product, orderId:sale.orderId, saleTotal:sale.total, isEgg, profit, species:clean });
      });
    });
    return d;
  },[sales,investors,birds,specMap]);

  // ── FILTERED BY PERIOD ──
  const filtDist = useMemo(()=>{
    if(filterPeriod==="all") return profitDist;
    const now=new Date(), cut=new Date();
    if(filterPeriod==="day") cut.setDate(now.getDate()-1);
    else if(filterPeriod==="week") cut.setDate(now.getDate()-7);
    else if(filterPeriod==="biweek") cut.setDate(now.getDate()-15);
    else if(filterPeriod==="month") cut.setMonth(now.getMonth()-1);
    else if(filterPeriod==="year") cut.setFullYear(now.getFullYear()-1);
    const d={};
    investors.forEach(inv=>{ d[inv.id]={eggs:0,birds:0,total:0,count:0,details:[]}; });
    Object.entries(profitDist).forEach(([id,data])=>{
      data.details.forEach(det=>{
        if(det.date>=cut){
          d[id].total+=det.profit; d[id].count++;
          if(det.isEgg) d[id].eggs+=det.profit; else d[id].birds+=det.profit;
          d[id].details.push(det);
        }
      });
    });
    return d;
  },[profitDist,filterPeriod,investors]);

  // ── COMPOUND INTEREST CALC ──
  const calcCompound = (invId) => {
    const invInvestments = investments.filter(i=>i.investorId===invId);
    let totalPrincipal=0, totalRendimento=0;
    const now = new Date();
    invInvestments.forEach(inv=>{
      const start = new Date(inv.date);
      const months = Math.max(0, (now.getFullYear()-start.getFullYear())*12 + (now.getMonth()-start.getMonth()));
      const montante = inv.amount * Math.pow(1.03, months);
      totalPrincipal += inv.amount;
      totalRendimento += (montante - inv.amount);
    });
    return { principal: totalPrincipal, rendimento: totalRendimento, montante: totalPrincipal+totalRendimento };
  };

  // ── INVESTOR TOTAL INVESTED IN BIRDS ──
  const birdInvestment = (invId) => birds.filter(b=>b.investorId===invId).reduce((s,b)=>s+(b.purchasePrice||0),0);

  // ── MONTHLY CHART ──
  const monthlyData = useMemo(()=>{
    const m={};
    sales.forEach(s=>{ if(!s.date) return; const k=`${s.date.getFullYear()}-${String(s.date.getMonth()+1).padStart(2,"0")}`; m[k]=(m[k]||0)+s.total; });
    return Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0])).slice(-8).map(([k,v])=>({label:k.split("-")[1]+"/"+k.split("-")[0].slice(2),value:v,color:C.primary}));
  },[sales]);

  // ── TOTALS ──
  const totalSales = sales.reduce((s,d)=>s+d.total,0);
  const totalDistrib = Object.values(filtDist).reduce((s,d)=>s+d.total,0);
  const totalEggs = Object.values(filtDist).reduce((s,d)=>s+d.eggs,0);
  const totalBirds = Object.values(filtDist).reduce((s,d)=>s+d.birds,0);

  /* ═══════════════════════════════════════════
     GENERATE INDIVIDUAL PDF (Private)
     ═══════════════════════════════════════════ */
  const genPDF = (invId) => {
    const inv=investors.find(i=>i.id===invId); if(!inv) return;
    const dist=filtDist[invId]||{total:0,eggs:0,birds:0,details:[]};
    const invBirds=birds.filter(b=>b.investorId===invId);
    const comp=calcCompound(invId);
    const bInv=birdInvestment(invId);
    const pLabel={all:"Acumulado Total",day:"Diário",week:"Semanal",biweek:"Quinzenal",month:"Mensal",year:"Anual"}[filterPeriod];

    const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Nunito',sans-serif;padding:48px;color:#1A2B3C;max-width:800px;margin:0 auto;background:#fff}
      .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;padding-bottom:20px;border-bottom:3px solid #58CC02}
      .logo{font-size:26px;font-weight:900;color:#58CC02}
      .sub{font-size:12px;color:#8FA3B3;margin-top:2px}
      .name{font-size:20px;font-weight:900;text-align:right}
      .date{font-size:12px;color:#8FA3B3;text-align:right;margin-top:4px}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:24px 0}
      .stat{border-radius:14px;padding:18px;text-align:center;border:1.5px solid #E8ECF0}
      .stat.green{background:#E8F9D4;border-color:#58CC0240}
      .stat.orange{background:#FFF3E0;border-color:#FF960040}
      .stat.purple{background:#F3E8FF;border-color:#CE82FF40}
      .stat.blue{background:#E3F5FD;border-color:#1CB0F640}
      .stat.gold{background:#FFFDE7;border-color:#FFC80040}
      .val{font-size:22px;font-weight:900}
      .val.green{color:#58CC02}.val.orange{color:#FF9600}.val.purple{color:#CE82FF}.val.blue{color:#1CB0F6}.val.gold{color:#FFC800}
      .lbl{font-size:10px;color:#8FA3B3;text-transform:uppercase;font-weight:800;margin-top:4px;letter-spacing:0.5px}
      h2{font-size:16px;font-weight:900;margin:30px 0 12px;color:#1A2B3C}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
      th{background:#58CC02;color:#fff;padding:10px 8px;text-align:left;font-weight:800;font-size:11px}
      td{padding:10px 8px;border-bottom:1px solid #E8ECF0}
      tr:nth-child(even){background:#F7F8FA}
      .footer{margin-top:40px;padding-top:16px;border-top:2px solid #E8ECF0;color:#8FA3B3;font-size:9px;text-align:center;line-height:1.6}
      .conf{background:#FFF3E0;border:1px solid #FF960030;border-radius:10px;padding:12px;margin-top:10px;font-size:10px;color:#FF9600;font-weight:700;text-align:center}
    </style></head><body>
      <div class="hdr"><div><div class="logo">🪿 Sítio Voo dos Gansos</div><div class="sub">Relatório Individual de Investidor — CONFIDENCIAL</div></div><div><div class="name">${inv.name}</div><div class="date">${pLabel} — ${new Date().toLocaleDateString("pt-BR")}</div></div></div>

      <div class="grid">
        <div class="stat green"><div class="val green">${fmtBRL(dist.total)}</div><div class="lbl">Lucro Vendas</div></div>
        <div class="stat orange"><div class="val orange">${fmtBRL(dist.eggs)}</div><div class="lbl">Lucro Ovos (${inv.eggPct}%)</div></div>
        <div class="stat purple"><div class="val purple">${fmtBRL(dist.birds)}</div><div class="lbl">Lucro Aves (${inv.salePct}%)</div></div>
      </div>

      <h2>💰 Investimentos</h2>
      <div class="grid">
        <div class="stat blue"><div class="val blue">${fmtBRL(bInv)}</div><div class="lbl">Aves Compradas</div></div>
        <div class="stat gold"><div class="val gold">${fmtBRL(comp.principal)}</div><div class="lbl">Aporte Financeiro</div></div>
        <div class="stat green"><div class="val green">${fmtBRL(comp.rendimento)}</div><div class="lbl">Rendimento (3%/mês)</div></div>
      </div>

      <h2>🐔 Aves no Sítio (${invBirds.length})</h2>
      <table><tr><th>Espécie</th><th>Matrizes</th><th>Reprodutores</th><th>Tag</th><th>Valor Pago</th></tr>
      ${invBirds.map(b=>`<tr><td><strong>${b.species}</strong></td><td>${b.matrizes||0}</td><td>${b.reprodutores||0}</td><td>${b.tag||"-"}</td><td>${fmtBRL(b.purchasePrice)}</td></tr>`).join("")}
      <tr style="background:#E8F9D4;font-weight:900"><td colspan="4">TOTAL INVESTIDO EM AVES</td><td>${fmtBRL(bInv)}</td></tr>
      </table>

      ${investments.filter(fi=>fi.investorId===invId).length>0?`
      <h2>📊 Aportes Financeiros (3% a.m. juros compostos)</h2>
      <table><tr><th>Data</th><th>Descrição</th><th>Valor</th><th>Rendimento Atual</th></tr>
      ${investments.filter(fi=>fi.investorId===invId).map(fi=>{
        const start=new Date(fi.date),now=new Date();
        const months=Math.max(0,(now.getFullYear()-start.getFullYear())*12+(now.getMonth()-start.getMonth()));
        const rend=fi.amount*Math.pow(1.03,months)-fi.amount;
        return `<tr><td>${new Date(fi.date).toLocaleDateString("pt-BR")}</td><td>${fi.description}</td><td>${fmtBRL(fi.amount)}</td><td style="color:#58CC02;font-weight:900">+${fmtBRL(rend)}</td></tr>`;
      }).join("")}
      </table>`:""}

      <h2>📋 Detalhamento de Vendas (${dist.details.length})</h2>
      <table><tr><th>Data</th><th>Pedido</th><th>Produto</th><th>Tipo</th><th>Lucro</th></tr>
      ${dist.details.sort((a,b)=>b.date-a.date).slice(0,60).map(d=>`<tr><td>${fmtDateStr(d.date)}</td><td>#${d.orderId}</td><td>${d.product}</td><td>${d.isEgg?"🥚 Ovo":"🐔 Ave"}</td><td style="color:#58CC02;font-weight:900">+${fmtBRL(d.profit)}</td></tr>`).join("")}
      </table>

      <div class="conf">⚠️ DOCUMENTO CONFIDENCIAL — Destinado exclusivamente ao investidor ${inv.name}</div>
      <div class="footer">Gerado automaticamente pelo sistema Sítio Voo dos Gansos em ${new Date().toLocaleString("pt-BR")}<br>Percentuais: ${inv.eggPct}% sobre ovos férteis | ${inv.salePct}% sobre venda de aves | 3% a.m. sobre aportes financeiros</div>
    </body></html>`;

    const blob=new Blob([html],{type:"text/html;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=`Relatorio_${inv.name.replace(/\s+/g,"_")}_${new Date().toISOString().split("T")[0]}.html`;
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Relatório baixado! Abra o arquivo e imprima como PDF.");
  };

  /* ═══════════════════════════════════════════
     MODALS
     ═══════════════════════════════════════════ */
  const Modal = ({children,onClose}) => (
    <div style={S.overlay} onClick={onClose}><div style={S.modal} onClick={e=>e.stopPropagation()}><div style={S.handle}/>{children}</div></div>
  );

  const AddInvestorModal = () => {
    const [f,setF]=useState({name:"",email:"",phone:"",eggPct:"10",salePct:"6.4"});
    const submit=()=>{
      if(!f.name) return showToast("Nome obrigatório","error");
      setInvestors(p=>[...p,{id:uid(),name:f.name,email:f.email,phone:f.phone,joinDate:new Date().toISOString().split("T")[0],eggPct:parseFloat(f.eggPct)||10,salePct:parseFloat(f.salePct)||6.4}]);
      setModal(null); showToast(`${f.name} adicionado!`);
    };
    return <Modal onClose={()=>setModal(null)}>
      <h3 style={{fontSize:20,fontWeight:900,marginBottom:20,color:C.text}}>Novo Investidor</h3>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div><label style={S.label}>Nome completo *</label><input style={S.input} value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="Nome do investidor"/></div>
        <div><label style={S.label}>Email</label><input style={S.input} value={f.email} onChange={e=>setF({...f,email:e.target.value})} placeholder="email@exemplo.com"/></div>
        <div><label style={S.label}>Telefone</label><input style={S.input} value={f.phone} onChange={e=>setF({...f,phone:e.target.value})} placeholder="(00) 00000-0000"/></div>
        <div style={{display:"flex",gap:12}}>
          <div style={{flex:1}}><label style={S.label}>% Ovo Fértil</label><input style={S.input} type="number" step="0.1" value={f.eggPct} onChange={e=>setF({...f,eggPct:e.target.value})}/></div>
          <div style={{flex:1}}><label style={S.label}>% Venda Ave</label><input style={S.input} type="number" step="0.1" value={f.salePct} onChange={e=>setF({...f,salePct:e.target.value})}/></div>
        </div>
        <button style={S.btn()} onClick={submit}><I.Plus s={18}/> Adicionar Investidor</button>
      </div>
    </Modal>;
  };

  const AddBirdModal = () => {
    const [f,setF]=useState({species:"",investorId:investors[0]?.id||"",matrizes:"1",reprodutores:"0",tag:"",purchasePrice:""});
    const [spQuery,setSpQuery]=useState("");
    const [spOpen,setSpOpen]=useState(false);
    const allSpecies = useMemo(()=>{
      const fromBirds = birds.map(b=>b.species);
      const merged = [...new Set([...SPECIES,...fromBirds])].sort();
      return merged;
    },[birds]);
    const filtered = spQuery ? allSpecies.filter(s=>s.toLowerCase().includes(spQuery.toLowerCase())) : allSpecies;
    const submit=()=>{
      if(!f.species.trim()) return showToast("Informe a espécie / raça","error");
      if(!f.investorId) return showToast("Selecione um investidor","error");
      setBirds(p=>[...p,{id:uid(),species:f.species.trim(),investorId:f.investorId,matrizes:parseInt(f.matrizes)||0,reprodutores:parseInt(f.reprodutores)||0,tag:f.tag,purchasePrice:parseFloat(f.purchasePrice)||0}]);
      setModal(null); showToast(`${f.species} cadastrada!`);
    };
    return <Modal onClose={()=>setModal(null)}>
      <h3 style={{fontSize:20,fontWeight:900,marginBottom:20,color:C.text}}>Cadastrar Nova Ave</h3>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{position:"relative"}}>
          <label style={S.label}>Espécie / Raça (digite ou selecione)</label>
          <input style={S.input} value={spQuery||f.species} onChange={e=>{setSpQuery(e.target.value);setF({...f,species:e.target.value});setSpOpen(true);}} onFocus={()=>setSpOpen(true)} placeholder="Ex: Brahma Splash, Pavão Branco..."/>
          {spOpen && (spQuery||!f.species) && <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:10,background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,maxHeight:200,overflowY:"auto",boxShadow:"0 8px 24px rgba(0,0,0,0.1)",marginTop:4}}>
            {spQuery && !filtered.find(s=>s.toLowerCase()===spQuery.toLowerCase()) && <div style={{padding:"10px 16px",cursor:"pointer",fontWeight:800,color:C.primary,borderBottom:`1px solid ${C.borderLight}`,display:"flex",alignItems:"center",gap:8}} onClick={()=>{setF({...f,species:spQuery.trim()});setSpOpen(false);}}>
              <I.Plus s={16} c={C.primary}/> Criar nova: "{spQuery}"
            </div>}
            {filtered.slice(0,15).map(sp=><div key={sp} style={{padding:"10px 16px",cursor:"pointer",fontSize:14,borderBottom:`1px solid ${C.borderLight}`,color:C.text}} onClick={()=>{setF({...f,species:sp});setSpQuery(sp);setSpOpen(false);}}
              onMouseEnter={e=>e.currentTarget.style.background=C.primaryBg}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{sp}</div>)}
            {filtered.length===0 && spQuery && <div style={{padding:"10px 16px",cursor:"pointer",fontWeight:800,color:C.primary}} onClick={()=>{setF({...f,species:spQuery.trim()});setSpOpen(false);}}><I.Plus s={16} c={C.primary}/> Criar: "{spQuery}"</div>}
          </div>}
        </div>
        <div><label style={S.label}>Investidor (Proprietário)</label><select style={S.select} value={f.investorId} onChange={e=>setF({...f,investorId:e.target.value})}>{investors.map(inv=><option key={inv.id} value={inv.id}>{inv.name}</option>)}</select></div>
        <div style={{display:"flex",gap:12}}>
          <div style={{flex:1}}><label style={S.label}>Qtd Matrizes</label><input style={S.input} type="number" min="0" value={f.matrizes} onChange={e=>setF({...f,matrizes:e.target.value})}/></div>
          <div style={{flex:1}}><label style={S.label}>Qtd Reprodutores</label><input style={S.input} type="number" min="0" value={f.reprodutores} onChange={e=>setF({...f,reprodutores:e.target.value})}/></div>
        </div>
        <div style={{display:"flex",gap:12}}>
          <div style={{flex:1}}><label style={S.label}>Tag / Anilha</label><input style={S.input} value={f.tag} onChange={e=>setF({...f,tag:e.target.value})} placeholder="BL-001"/></div>
          <div style={{flex:1}}><label style={S.label}>Valor Total (R$)</label><input style={S.input} type="number" step="0.01" value={f.purchasePrice} onChange={e=>setF({...f,purchasePrice:e.target.value})} placeholder="0,00"/></div>
        </div>
        <button style={S.btn()} onClick={submit}><I.Plus s={18}/> Cadastrar Ave</button>
      </div>
    </Modal>;
  };

  // ── ADD MANUAL ORDER MODAL ──
  const AddOrderModal = () => {
    const [items,setItems]=useState([{product:"",unitPrice:"",qty:"1"}]);
    const [orderId,setOrderId]=useState("");
    const [orderDate,setOrderDate]=useState(new Date().toISOString().split("T")[0]);
    const addItem=()=>setItems(p=>[...p,{product:"",unitPrice:"",qty:"1"}]);
    const removeItem=(i)=>setItems(p=>p.filter((_,idx)=>idx!==i));
    const updateItem=(i,k,v)=>setItems(p=>p.map((item,idx)=>idx===i?{...item,[k]:v}:item));
    const submit=()=>{
      const validItems=items.filter(it=>it.product.trim()&&parseFloat(it.unitPrice)>0);
      if(!validItems.length) return showToast("Adicione ao menos 1 item válido","error");
      const products=[];
      let total=0;
      validItems.forEach(it=>{
        const q=parseInt(it.qty)||1;
        const price=parseFloat(it.unitPrice);
        for(let j=0;j<q;j++) products.push(it.product.trim());
        total+=price*q;
      });
      const newSale={id:uid(),date:new Date(orderDate),total,products,productStr:products.join(", "),qty:products.length,discount:0,shipping:0,buyerName:"Manual",orderId:orderId||"M-"+Date.now().toString().slice(-6)};
      setSales(prev=>[newSale,...prev].sort((a,b)=>b.date-a.date));
      setModal(null);
      showToast(`Pedido com ${validItems.length} item(ns) adicionado!`);
    };
    return <Modal onClose={()=>setModal(null)}>
      <h3 style={{fontSize:20,fontWeight:900,marginBottom:6,color:C.text}}>Adicionar Venda Manual</h3>
      <p style={{fontSize:12,color:C.textMuted,marginBottom:16}}>Insira os itens do pedido. Use "OVO - Nome" para ovos férteis.</p>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"flex",gap:12}}>
          <div style={{flex:1}}><label style={S.label}>Nº Pedido</label><input style={S.input} value={orderId} onChange={e=>setOrderId(e.target.value)} placeholder="Ex: 10249"/></div>
          <div style={{flex:1}}><label style={S.label}>Data</label><input style={S.input} type="date" value={orderDate} onChange={e=>setOrderDate(e.target.value)}/></div>
        </div>
        <div style={{fontSize:14,fontWeight:800,color:C.text}}>Itens do Pedido:</div>
        {items.map((it,i)=>(
          <div key={i} style={{background:C.bg,borderRadius:14,padding:14,border:`1px solid ${C.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:12,fontWeight:800,color:C.textMuted}}>Item {i+1}</span>
              {items.length>1&&<div style={{cursor:"pointer"}} onClick={()=>removeItem(i)}><I.Trash s={14} c={C.red}/></div>}
            </div>
            <div style={{marginBottom:8}}><input style={{...S.input,background:C.card}} value={it.product} onChange={e=>updateItem(i,"product",e.target.value)} placeholder="Ex: OVO - Brahma Light ou Sebright Dourada Sexo:Casal"/></div>
            <div style={{display:"flex",gap:10}}>
              <div style={{flex:1}}><label style={{...S.label,fontSize:10}}>Preço Unit. (R$)</label><input style={{...S.input,background:C.card}} type="number" step="0.01" value={it.unitPrice} onChange={e=>updateItem(i,"unitPrice",e.target.value)} placeholder="24,00"/></div>
              <div style={{flex:1}}><label style={{...S.label,fontSize:10}}>Qtd</label><input style={{...S.input,background:C.card}} type="number" min="1" value={it.qty} onChange={e=>updateItem(i,"qty",e.target.value)}/></div>
              <div style={{flex:1,display:"flex",alignItems:"flex-end"}}><div style={{fontSize:14,fontWeight:900,color:C.primary,paddingBottom:12}}>{fmtBRL((parseFloat(it.unitPrice)||0)*(parseInt(it.qty)||0))}</div></div>
            </div>
          </div>
        ))}
        <button style={S.btnOut(C.blue)} onClick={addItem}><I.Plus s={16}/> Adicionar Item</button>
        <div style={{padding:12,background:C.primaryBg,borderRadius:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontWeight:800,color:C.text}}>Total do Pedido:</span>
          <span style={{fontWeight:900,fontSize:18,color:C.primary}}>{fmtBRL(items.reduce((s,it)=>s+(parseFloat(it.unitPrice)||0)*(parseInt(it.qty)||0),0))}</span>
        </div>
        <button style={S.btn()} onClick={submit}><I.Plus s={18}/> Registrar Venda</button>
      </div>
    </Modal>;
  };

  const AddInvestmentModal = () => {
    const [f,setF]=useState({investorId:selInv||investors[0]?.id||"",amount:"",date:new Date().toISOString().split("T")[0],description:"Aporte financeiro"});
    const submit=()=>{
      if(!f.investorId||!f.amount) return showToast("Preencha todos os campos","error");
      setInvestments(p=>[...p,{id:uid(),investorId:f.investorId,amount:parseFloat(f.amount)||0,date:f.date,description:f.description}]);
      setModal(null); showToast("Aporte registrado!");
    };
    return <Modal onClose={()=>setModal(null)}>
      <h3 style={{fontSize:20,fontWeight:900,marginBottom:6,color:C.text}}>Novo Aporte Financeiro</h3>
      <p style={{fontSize:12,color:C.textMuted,marginBottom:20}}>Rendimento: 3% ao mês com juros compostos</p>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div><label style={S.label}>Investidor</label><select style={S.select} value={f.investorId} onChange={e=>setF({...f,investorId:e.target.value})}>{investors.map(inv=><option key={inv.id} value={inv.id}>{inv.name}</option>)}</select></div>
        <div><label style={S.label}>Valor do Aporte (R$)</label><input style={S.input} type="number" step="0.01" value={f.amount} onChange={e=>setF({...f,amount:e.target.value})} placeholder="5000.00"/></div>
        <div><label style={S.label}>Data do Aporte</label><input style={S.input} type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/></div>
        <div><label style={S.label}>Descrição</label><input style={S.input} value={f.description} onChange={e=>setF({...f,description:e.target.value})} placeholder="Aporte inicial"/></div>
        <button style={S.btn(C.gold)} onClick={submit}><I.Dollar s={18}/> Registrar Aporte</button>
      </div>
    </Modal>;
  };

  const ImportModal = () => (
    <Modal onClose={()=>setModal(null)}>
      <h3 style={{fontSize:20,fontWeight:900,marginBottom:6,color:C.text}}>Importar Vendas do Wix</h3>
      <p style={{color:C.textMuted,fontSize:13,marginBottom:20}}>Exporte o arquivo de pagamentos do Wix Store (.xlsx ou .csv).</p>
      <div style={{border:`2.5px dashed ${C.primary}50`,borderRadius:18,padding:36,textAlign:"center",cursor:"pointer",background:C.primaryBg+"50",transition:"all 0.2s"}} onClick={()=>fileRef.current?.click()}>
        <I.Upload s={44} c={C.primary}/>
        <p style={{color:C.text,fontSize:15,fontWeight:800,marginTop:14}}>Clique para selecionar o arquivo</p>
        <p style={{color:C.textMuted,fontSize:12,marginTop:4}}>Formatos: .xlsx ou .csv do Wix Payments</p>
      </div>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={handleFile}/>
      <div style={{marginTop:18,padding:16,background:C.goldBg,borderRadius:14,border:`1px solid ${C.gold}30`}}>
        <p style={{fontSize:12,color:C.orange,fontWeight:800,marginBottom:6}}>Regras de importação:</p>
        <p style={{fontSize:11,color:C.textSec,lineHeight:1.7}}>
          ✅ Apenas vendas "eCom Platform"<br/>
          ✅ Status "Bem-sucedido" apenas<br/>
          ❌ Remove Recusado / Reembolsado<br/>
          💰 Usa Valor Líquido quando disponível<br/>
          🥚 OVO → {`10%`} lucro | 🐔 Ave → {`6,4%`} lucro
        </p>
      </div>
    </Modal>
  );

  // ── EDIT INVESTOR MODAL ──
  const EditInvestorModal = () => {
    const [f,setF]=useState(editInvData ? {...editInvData} : {});
    if(!editInvData) return null;
    const save=()=>{
      if(!f.name) return showToast("Nome obrigatório","error");
      setInvestors(p=>p.map(i=>i.id===f.id?{...i,name:f.name,email:f.email,phone:f.phone,eggPct:parseFloat(f.eggPct)||10,salePct:parseFloat(f.salePct)||6.4}:i));
      setModal(null); setEditInvData(null); showToast(`${f.name} atualizado!`);
    };
    const remove=()=>{
      setInvestors(p=>p.filter(i=>i.id!==f.id));
      setModal(null); setEditInvData(null); setSelInv(null); setPage("dashboard");
      showToast(`${f.name} removido`);
    };
    return <Modal onClose={()=>{setModal(null);setEditInvData(null);}}>
      <h3 style={{fontSize:20,fontWeight:900,marginBottom:20,color:C.text}}>Editar Investidor</h3>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div><label style={S.label}>Nome *</label><input style={S.input} value={f.name||""} onChange={e=>setF({...f,name:e.target.value})}/></div>
        <div><label style={S.label}>Email</label><input style={S.input} value={f.email||""} onChange={e=>setF({...f,email:e.target.value})}/></div>
        <div><label style={S.label}>Telefone</label><input style={S.input} value={f.phone||""} onChange={e=>setF({...f,phone:e.target.value})}/></div>
        <div style={{display:"flex",gap:12}}>
          <div style={{flex:1}}><label style={S.label}>% Ovo</label><input style={S.input} type="number" step="0.1" value={f.eggPct||""} onChange={e=>setF({...f,eggPct:e.target.value})}/></div>
          <div style={{flex:1}}><label style={S.label}>% Ave</label><input style={S.input} type="number" step="0.1" value={f.salePct||""} onChange={e=>setF({...f,salePct:e.target.value})}/></div>
        </div>
        <button style={S.btn()} onClick={save}>Salvar Alterações</button>
        <button style={S.btn(C.red)} onClick={remove}><I.Trash s={16}/> Remover Investidor</button>
      </div>
    </Modal>;
  };

  // ── EDIT BIRD MODAL ──
  const EditBirdModal = () => {
    const [f,setF]=useState(editBirdData ? {...editBirdData} : {});
    const [spQuery,setSpQuery]=useState(editBirdData?.species||"");
    const [spOpen,setSpOpen]=useState(false);
    if(!editBirdData) return null;
    const allSpecies = useMemo(()=>[...new Set([...SPECIES,...birds.map(b=>b.species)])].sort(),[birds]);
    const filtered = spQuery ? allSpecies.filter(s=>s.toLowerCase().includes(spQuery.toLowerCase())) : allSpecies;
    const save=()=>{
      if(!f.species?.trim()) return showToast("Informe a espécie","error");
      setBirds(p=>p.map(b=>b.id===f.id?{...b,species:f.species.trim(),investorId:f.investorId,matrizes:parseInt(f.matrizes)||0,reprodutores:parseInt(f.reprodutores)||0,tag:f.tag,purchasePrice:parseFloat(f.purchasePrice)||0}:b));
      setModal(null); setEditBirdData(null); showToast(`${f.species} atualizada!`);
    };
    const remove=()=>{setBirds(p=>p.filter(b=>b.id!==f.id));setModal(null);setEditBirdData(null);showToast("Ave removida");};
    return <Modal onClose={()=>{setModal(null);setEditBirdData(null);}}>
      <h3 style={{fontSize:20,fontWeight:900,marginBottom:20,color:C.text}}>Editar Ave</h3>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{position:"relative"}}>
          <label style={S.label}>Espécie / Raça</label>
          <input style={S.input} value={spQuery} onChange={e=>{setSpQuery(e.target.value);setF({...f,species:e.target.value});setSpOpen(true);}} onFocus={()=>setSpOpen(true)}/>
          {spOpen && <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:10,background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,maxHeight:200,overflowY:"auto",boxShadow:"0 8px 24px rgba(0,0,0,0.1)",marginTop:4}}>
            {spQuery && !filtered.find(s=>s.toLowerCase()===spQuery.toLowerCase()) && <div style={{padding:"10px 16px",cursor:"pointer",fontWeight:800,color:C.primary,borderBottom:`1px solid ${C.borderLight}`}} onClick={()=>{setF({...f,species:spQuery.trim()});setSpOpen(false);}}><I.Plus s={16} c={C.primary}/> Criar: "{spQuery}"</div>}
            {filtered.slice(0,15).map(sp=><div key={sp} style={{padding:"10px 16px",cursor:"pointer",fontSize:14,borderBottom:`1px solid ${C.borderLight}`}} onClick={()=>{setF({...f,species:sp});setSpQuery(sp);setSpOpen(false);}} onMouseEnter={e=>e.currentTarget.style.background=C.primaryBg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{sp}</div>)}
          </div>}
        </div>
        <div><label style={S.label}>Investidor</label><select style={S.select} value={f.investorId||""} onChange={e=>setF({...f,investorId:e.target.value})}>{investors.map(inv=><option key={inv.id} value={inv.id}>{inv.name}</option>)}</select></div>
        <div style={{display:"flex",gap:12}}>
          <div style={{flex:1}}><label style={S.label}>Qtd Matrizes</label><input style={S.input} type="number" min="0" value={f.matrizes||0} onChange={e=>setF({...f,matrizes:e.target.value})}/></div>
          <div style={{flex:1}}><label style={S.label}>Qtd Reprodutores</label><input style={S.input} type="number" min="0" value={f.reprodutores||0} onChange={e=>setF({...f,reprodutores:e.target.value})}/></div>
        </div>
        <div style={{display:"flex",gap:12}}>
          <div style={{flex:1}}><label style={S.label}>Tag</label><input style={S.input} value={f.tag||""} onChange={e=>setF({...f,tag:e.target.value})}/></div>
          <div style={{flex:1}}><label style={S.label}>Valor (R$)</label><input style={S.input} type="number" step="0.01" value={f.purchasePrice||""} onChange={e=>setF({...f,purchasePrice:e.target.value})}/></div>
        </div>
        <button style={S.btn()} onClick={save}>Salvar Alterações</button>
        <button style={S.btn(C.red)} onClick={remove}><I.Trash s={16}/> Remover Ave</button>
      </div>
    </Modal>;
  };

  /* ═══════════════════════════════════════════
     PAGE: DASHBOARD
     ═══════════════════════════════════════════ */
  const Dashboard = () => (
    <div>
      {/* Header */}
      <div style={{background:`linear-gradient(135deg, ${C.primary}, #3DA601)`,padding:"22px 22px 18px",borderRadius:"0 0 28px 28px",boxShadow:`0 6px 24px ${C.primary}30`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:24,fontWeight:900,color:"#fff",letterSpacing:-0.5}}>🪿 Voo dos Gansos</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.75)",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginTop:2}}>Painel Administrativo</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <div style={{width:38,height:38,borderRadius:12,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}} title="Adicionar Venda Manual" onClick={()=>setModal("addOrder")}><I.Plus s={18} c="#fff"/></div>
            <div style={{width:38,height:38,borderRadius:12,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}} title="Importar XLSX" onClick={()=>setModal("import")}><I.Upload s={18} c="#fff"/></div>
          </div>
        </div>
      </div>

      <div style={{padding:"16px 18px 0"}}>
        {/* Period chips */}
        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:14}}>
          {[["all","Todos"],["day","Hoje"],["week","Semana"],["biweek","Quinzena"],["month","Mês"],["year","Ano"]].map(([k,v])=>(
            <button key={k} style={S.chip(filterPeriod===k)} onClick={()=>setFilterPeriod(k)}>{v}</button>
          ))}
        </div>

        {/* Stats row */}
        <div style={{display:"flex",gap:10,marginBottom:14}}>
          <div style={S.stat(C.primary)}>
            <div style={{fontSize:10,color:C.textMuted,fontWeight:800,textTransform:"uppercase"}}>Vendas Total</div>
            <div style={{fontSize:20,fontWeight:900,color:C.primary,marginTop:4}}>{fmtBRL(totalSales)}</div>
            <div style={{fontSize:11,color:C.textMuted}}>{sales.length} pedidos</div>
          </div>
          <div style={S.stat(C.gold)}>
            <div style={{fontSize:10,color:C.textMuted,fontWeight:800,textTransform:"uppercase"}}>Distribuído</div>
            <div style={{fontSize:20,fontWeight:900,color:C.gold,marginTop:4}}>{fmtBRL(totalDistrib)}</div>
            <div style={{fontSize:11,color:C.textMuted}}>{investors.length} investidores</div>
          </div>
        </div>

        <div style={{display:"flex",gap:10,marginBottom:16}}>
          <div style={S.stat(C.orange)}><I.Egg s={16} c={C.orange}/><div style={{fontSize:14,fontWeight:900,color:C.orange,marginTop:4}}>{fmtBRL(totalEggs)}</div><div style={{fontSize:10,color:C.textMuted}}>Lucro Ovos</div></div>
          <div style={S.stat(C.purple)}><I.Bird s={16} c={C.purple}/><div style={{fontSize:14,fontWeight:900,color:C.purple,marginTop:4}}>{fmtBRL(totalBirds)}</div><div style={{fontSize:10,color:C.textMuted}}>Lucro Aves</div></div>
          <div style={S.stat(C.blue)}><I.TrendUp s={16} c={C.blue}/><div style={{fontSize:14,fontWeight:900,color:C.blue,marginTop:4}}>{birds.length}</div><div style={{fontSize:10,color:C.textMuted}}>Plantel</div></div>
        </div>

        {/* Chart */}
        {monthlyData.length>0 && <div style={S.card}><div style={{fontSize:15,fontWeight:900,marginBottom:10,color:C.text}}>Faturamento Mensal</div><BarChart data={monthlyData} w={360} h={120}/></div>}

        {/* Investors list */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,marginTop:8}}>
          <div style={{fontSize:17,fontWeight:900,color:C.text}}>Investidores</div>
          <div style={{display:"flex",gap:6}}>
            <button style={{...S.chip(false),display:"flex",alignItems:"center",gap:4,background:C.goldBg,color:C.gold}} onClick={()=>setModal("addInvest")}><I.Dollar s={14}/> Aporte</button>
            <button style={{...S.chip(false),display:"flex",alignItems:"center",gap:4,background:C.primaryBg,color:C.primary}} onClick={()=>setModal("addInv")}><I.Plus s={14}/> Novo</button>
          </div>
        </div>

        {investors.map((inv,idx)=>{
          const dist=filtDist[inv.id]||{total:0,count:0};
          const bc=birds.filter(b=>b.investorId===inv.id).length;
          const comp=calcCompound(inv.id);
          const bInv=birdInvestment(inv.id);
          const clr=getColor(idx);
          return (
            <div key={inv.id} style={{...S.card,cursor:"pointer",transition:"all 0.15s"}} onClick={()=>{setSelInv(inv.id);setPage("investor");}}>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <div style={S.avatar(clr)}>{getAvatar(inv.name)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:900,fontSize:15,color:C.text}}>{inv.name}</div>
                  <div style={{display:"flex",gap:6,fontSize:11,color:C.textMuted,marginTop:3,flexWrap:"wrap"}}>
                    <span style={S.badge(C.blue)}>{bc} aves</span>
                    <span style={S.badge(C.primary)}>{dist.count} vendas</span>
                    {comp.principal>0 && <span style={S.badge(C.gold)}>Aporte</span>}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontWeight:900,fontSize:16,color:clr}}>{fmtBRL(dist.total)}</div>
                  <div style={{fontSize:10,color:C.textMuted}}>lucro vendas</div>
                </div>
                <I.Right s={18} c={C.textMuted}/>
              </div>
              {/* Bird mini-list */}
              {bc>0 && <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:12,paddingTop:12,borderTop:`1px solid ${C.borderLight}`}}>
                {birds.filter(b=>b.investorId===inv.id).slice(0,6).map(b=>(
                  <span key={b.id} style={{fontSize:10,fontWeight:700,background:C.orangeBg,color:C.orange,padding:"3px 8px",borderRadius:8}}>{b.species} <span style={{color:C.textMuted}}>({b.matrizes||0}M {b.reprodutores||0}R)</span></span>
                ))}
                {bc>6 && <span style={{fontSize:10,fontWeight:700,color:C.textMuted,padding:"3px 8px"}}>+{bc-6}</span>}
              </div>}
              {/* Investment summary */}
              {(bInv>0||comp.principal>0)&&<div style={{display:"flex",gap:10,marginTop:10,paddingTop:10,borderTop:`1px solid ${C.borderLight}`}}>
                {bInv>0&&<div style={{fontSize:11,color:C.textSec}}><strong style={{color:C.blue}}>Aves:</strong> {fmtBRL(bInv)}</div>}
                {comp.principal>0&&<div style={{fontSize:11,color:C.textSec}}><strong style={{color:C.gold}}>Aporte:</strong> {fmtBRL(comp.principal)} <span style={{color:C.primary,fontWeight:800}}>+{fmtBRL(comp.rendimento)}</span></div>}
              </div>}
            </div>
          );
        })}

        {/* CTA */}
        {sales.length===0 && <div style={{...S.card,textAlign:"center",padding:36}}>
          <I.Upload s={48} c={C.primary}/><p style={{fontWeight:900,fontSize:17,marginTop:16,color:C.text}}>Importe ou adicione vendas</p>
          <p style={{color:C.textMuted,fontSize:13,marginBottom:22}}>Importe o XLSX do Wix ou adicione pedidos manualmente.</p>
          <div style={{display:"flex",gap:10}}><button style={{...S.btn(),flex:1}} onClick={()=>setModal("import")}><I.Upload s={18}/> Importar</button><button style={{...S.btnOut(C.blue),flex:1}} onClick={()=>setModal("addOrder")}><I.Plus s={18}/> Venda Manual</button></div>
        </div>}
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════
     PAGE: INVESTOR DETAIL (Private view)
     ═══════════════════════════════════════════ */
  const InvestorDetail = () => {
    const inv=investors.find(i=>i.id===selInv);
    if(!inv) return null;
    const dist=filtDist[inv.id]||{total:0,eggs:0,birds:0,details:[],count:0};
    const invBirds=birds.filter(b=>b.investorId===inv.id);
    const idx=investors.indexOf(inv);
    const clr=getColor(idx);
    const comp=calcCompound(inv.id);
    const bInv=birdInvestment(inv.id);
    const invInvestments=investments.filter(fi=>fi.investorId===inv.id);

    // Species breakdown
    const speciesProfit={};
    dist.details.forEach(d=>{
      const sp=d.product.replace(/^OVO\s*-\s*/i,"").replace(/\s*Sexo:.*$/,"").trim();
      if(!speciesProfit[sp]) speciesProfit[sp]={eggs:0,birds:0,total:0};
      if(d.isEgg) speciesProfit[sp].eggs+=d.profit; else speciesProfit[sp].birds+=d.profit;
      speciesProfit[sp].total+=d.profit;
    });

    const donutData=[
      {value:dist.eggs,color:C.orange,label:"Ovos"},
      {value:dist.birds,color:C.purple,label:"Aves"},
    ].filter(d=>d.value>0);

    return (
      <div>
        {/* Header */}
        <div style={{background:`linear-gradient(135deg, ${clr}, ${clr}CC)`,padding:"20px 20px 22px",borderRadius:"0 0 28px 28px",boxShadow:`0 6px 24px ${clr}30`}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{cursor:"pointer",padding:4}} onClick={()=>setPage("dashboard")}><I.Left s={24} c="#fff"/></div>
            <div style={S.avatar("#ffffff30",48)}>{getAvatar(inv.name)}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:900,fontSize:20,color:"#fff"}}>{inv.name}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.75)",fontWeight:700}}>Desde {new Date(inv.joinDate).toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}</div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <div style={{width:36,height:36,borderRadius:12,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}} onClick={()=>{setEditInvData(inv);setModal("editInv");}}><I.Edit s={16} c="#fff"/></div>
              <div style={{width:36,height:36,borderRadius:12,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}} onClick={()=>genPDF(inv.id)}><I.Download s={16} c="#fff"/></div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:14}}>
            <I.Lock s={12} c="rgba(255,255,255,0.6)"/>
            <span style={{fontSize:10,color:"rgba(255,255,255,0.6)",fontWeight:700}}>RELATÓRIO INDIVIDUAL — CONFIDENCIAL</span>
          </div>
        </div>

        <div style={{padding:"16px 18px"}}>
          {/* Period Filter */}
          <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:14}}>
            {[["all","Todos"],["day","Hoje"],["week","Semana"],["biweek","Quinzena"],["month","Mês"],["year","Ano"]].map(([k,v])=>(
              <button key={k} style={S.chip(filterPeriod===k)} onClick={()=>setFilterPeriod(k)}>{v}</button>
            ))}
          </div>

          {/* Big profit card */}
          <div style={{...S.card,background:`linear-gradient(135deg, ${clr}08, ${clr}03)`,border:`2px solid ${clr}25`}}>
            <div style={{textAlign:"center",marginBottom:18}}>
              <div style={{fontSize:11,color:C.textMuted,fontWeight:800,textTransform:"uppercase"}}>Lucro Total com Vendas</div>
              <div style={{fontSize:38,fontWeight:900,color:clr,marginTop:4}}>{fmtBRL(dist.total)}</div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <div style={{flex:1,textAlign:"center",padding:14,background:C.orangeBg,borderRadius:14}}>
                <I.Egg s={18} c={C.orange}/>
                <div style={{fontSize:17,fontWeight:900,color:C.orange,marginTop:6}}>{fmtBRL(dist.eggs)}</div>
                <div style={{fontSize:10,color:C.textMuted,marginTop:2}}>Ovos Férteis ({inv.eggPct}%)</div>
              </div>
              <div style={{flex:1,textAlign:"center",padding:14,background:C.purpleBg,borderRadius:14}}>
                <I.Bird s={18} c={C.purple}/>
                <div style={{fontSize:17,fontWeight:900,color:C.purple,marginTop:6}}>{fmtBRL(dist.birds)}</div>
                <div style={{fontSize:10,color:C.textMuted,marginTop:2}}>Aves/Filhotes ({inv.salePct}%)</div>
              </div>
            </div>
          </div>

          {/* Donut */}
          {donutData.length>0 && <div style={{...S.card,display:"flex",flexDirection:"column",alignItems:"center"}}>
            <div style={{fontSize:15,fontWeight:900,marginBottom:8,alignSelf:"flex-start",color:C.text}}>Distribuição de Lucros</div>
            <Donut data={donutData} size={160}/>
            <div style={{display:"flex",gap:16,marginTop:12}}>{donutData.map((d,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:10,height:10,borderRadius:"50%",background:d.color}}/><span style={{fontSize:12,color:C.textMuted,fontWeight:700}}>{d.label}</span></div>)}</div>
          </div>}

          {/* Investment Card */}
          <div style={{...S.card,background:`linear-gradient(135deg,${C.goldBg},#fff)`,border:`1.5px solid ${C.gold}30`}}>
            <div style={{fontSize:15,fontWeight:900,marginBottom:14,color:C.text,display:"flex",alignItems:"center",gap:8}}>
              <I.Dollar s={18} c={C.gold}/> Investimentos
              <button style={{marginLeft:"auto",fontSize:11,fontWeight:800,color:C.gold,background:`${C.gold}15`,border:"none",borderRadius:20,padding:"4px 12px",cursor:"pointer"}} onClick={()=>setModal("addInvest")}>+ Aporte</button>
            </div>
            <div style={{display:"flex",gap:10,marginBottom:invInvestments.length>0?14:0}}>
              <div style={{flex:1,textAlign:"center",padding:12,background:C.blueBg,borderRadius:12}}>
                <div style={{fontSize:16,fontWeight:900,color:C.blue}}>{fmtBRL(bInv)}</div>
                <div style={{fontSize:10,color:C.textMuted}}>Aves Compradas</div>
              </div>
              <div style={{flex:1,textAlign:"center",padding:12,background:C.goldBg,borderRadius:12}}>
                <div style={{fontSize:16,fontWeight:900,color:C.gold}}>{fmtBRL(comp.principal)}</div>
                <div style={{fontSize:10,color:C.textMuted}}>Aporte Capital</div>
              </div>
              <div style={{flex:1,textAlign:"center",padding:12,background:C.primaryBg,borderRadius:12}}>
                <div style={{fontSize:16,fontWeight:900,color:C.primary}}>+{fmtBRL(comp.rendimento)}</div>
                <div style={{fontSize:10,color:C.textMuted}}>Rendimento 3%</div>
              </div>
            </div>
            {invInvestments.map(fi=>{
              const start=new Date(fi.date),now=new Date();
              const months=Math.max(0,(now.getFullYear()-start.getFullYear())*12+(now.getMonth()-start.getMonth()));
              const rend=fi.amount*Math.pow(1.03,months)-fi.amount;
              return <div key={fi.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderTop:`1px solid ${C.border}`}}>
                <div><div style={{fontWeight:800,fontSize:13,color:C.text}}>{fi.description}</div><div style={{fontSize:11,color:C.textMuted}}>{new Date(fi.date).toLocaleDateString("pt-BR")} • {months} meses</div></div>
                <div style={{textAlign:"right"}}><div style={{fontWeight:900,fontSize:14,color:C.gold}}>{fmtBRL(fi.amount)}</div><div style={{fontSize:11,fontWeight:800,color:C.primary}}>+{fmtBRL(rend)}</div></div>
              </div>;
            })}
          </div>

          {/* Birds in the farm */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,marginTop:6}}>
            <div style={{fontSize:16,fontWeight:900,color:C.text}}>Aves no Sítio ({invBirds.length})</div>
            <button style={{...S.chip(false),display:"flex",alignItems:"center",gap:4,background:C.blueBg,color:C.blue}} onClick={()=>setModal("addBird")}><I.Plus s={14}/> Nova</button>
          </div>
          {invBirds.map(b=>(
            <div key={b.id} style={{...S.card,display:"flex",alignItems:"center",gap:12,padding:14}}>
              <div style={{...S.avatar(C.orange,38)}}><I.Bird s={16}/></div>
              <div style={{flex:1}}>
                <div style={{fontWeight:900,fontSize:14,color:C.text}}>{b.species}</div>
                <div style={{fontSize:11,color:C.textMuted}}>{b.tag||"Sem tag"} • {fmtBRL(b.purchasePrice)}</div>
                <div style={{display:"flex",gap:8,marginTop:4}}>
                  {(b.matrizes||0)>0&&<span style={S.badge(C.orange)}>{b.matrizes} {b.matrizes===1?"Matriz":"Matrizes"}</span>}
                  {(b.reprodutores||0)>0&&<span style={S.badge(C.blue)}>{b.reprodutores} {b.reprodutores===1?"Reprodutor":"Reprodutores"}</span>}
                </div>
              </div>
              <div style={{cursor:"pointer",padding:4}} onClick={(e)=>{e.stopPropagation();setEditBirdData(b);setModal("editBird");}}><I.Edit s={16} c={C.textMuted}/></div>
              <div style={{cursor:"pointer",padding:4}} onClick={(e)=>{e.stopPropagation();setBirds(p=>p.filter(x=>x.id!==b.id));showToast("Ave removida");}}><I.Trash s={16} c={C.red}/></div>
            </div>
          ))}

          {/* Species profit breakdown */}
          {Object.keys(speciesProfit).length>0 && <>
            <div style={{fontSize:16,fontWeight:900,color:C.text,marginTop:8,marginBottom:12}}>Lucro por Espécie</div>
            {Object.entries(speciesProfit).sort((a,b)=>b[1].total-a[1].total).map(([sp,data],i)=>(
              <div key={sp} style={{...S.card,display:"flex",alignItems:"center",gap:12,padding:14}}>
                <div style={{width:4,height:36,borderRadius:2,background:C.palette[i%12],flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:13,color:C.text}}>{sp}</div>
                  <div style={{display:"flex",gap:8,fontSize:10,color:C.textMuted,marginTop:2}}>
                    {data.eggs>0&&<span>🥚 {fmtBRL(data.eggs)}</span>}
                    {data.birds>0&&<span>🐔 {fmtBRL(data.birds)}</span>}
                  </div>
                </div>
                <div style={{fontWeight:900,fontSize:15,color:C.primary}}>{fmtBRL(data.total)}</div>
              </div>
            ))}
          </>}

          {/* Sale details */}
          <div style={{fontSize:16,fontWeight:900,color:C.text,marginTop:8,marginBottom:12}}>Últimas Vendas ({dist.details.length})</div>
          {dist.details.sort((a,b)=>b.date-a.date).slice(0,25).map((d,i)=>(
            <div key={i} style={{...S.card,padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div><div style={{fontWeight:800,fontSize:13,color:C.text}}>{d.product}</div><div style={{fontSize:11,color:C.textMuted,marginTop:3}}>Pedido #{d.orderId} • {fmtDateStr(d.date)}</div></div>
                <div style={{textAlign:"right"}}><div style={{fontWeight:900,fontSize:15,color:C.primary}}>+{fmtBRL(d.profit)}</div><div style={{fontSize:10,color:C.textMuted}}>{d.isEgg?"🥚 Ovo":"🐔 Ave"}</div></div>
              </div>
            </div>
          ))}
          {dist.details.length===0&&<div style={{textAlign:"center",padding:36,color:C.textMuted}}><I.Chart s={44} c={C.textMuted}/><p style={{marginTop:12,fontWeight:800,fontSize:15}}>Nenhuma venda encontrada</p><p style={{fontSize:12}}>Importe as vendas do Wix para calcular os lucros</p></div>}

          {/* PDF Export */}
          <button style={{...S.btn(clr),marginTop:18}} onClick={()=>genPDF(inv.id)}><I.Download s={18}/> Exportar Relatório PDF Individual</button>
          <p style={{textAlign:"center",fontSize:10,color:C.textMuted,marginTop:8}}>O PDF é confidencial e mostra apenas dados deste investidor</p>
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════
     PAGE: BIRDS (Plantel)
     ═══════════════════════════════════════════ */
  const BirdsPage = () => {
    const [search,setSearch]=useState("");
    const filt=birds.filter(b=>b.species.toLowerCase().includes(search.toLowerCase())||(b.tag||"").toLowerCase().includes(search.toLowerCase()));
    return <div>
      <div style={{background:`linear-gradient(135deg,${C.blue},${C.blue}CC)`,padding:"22px 22px 18px",borderRadius:"0 0 28px 28px",boxShadow:`0 6px 24px ${C.blue}30`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:22,fontWeight:900,color:"#fff"}}>🐔 Plantel</div><div style={{fontSize:11,color:"rgba(255,255,255,0.75)",fontWeight:700,marginTop:2}}>{birds.length} aves cadastradas</div></div>
          <button style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:12,padding:"10px 16px",color:"#fff",fontWeight:800,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:4}} onClick={()=>setModal("addBird")}><I.Plus s={16}/> Nova Ave</button>
        </div>
      </div>
      <div style={{padding:"16px 18px"}}>
        <input style={{...S.input,marginBottom:14}} placeholder="🔍  Buscar por espécie, raça ou tag..." value={search} onChange={e=>setSearch(e.target.value)}/>
        {filt.map(b=>{
          const inv=investors.find(i=>i.id===b.investorId);
          return <div key={b.id} style={{...S.card,display:"flex",alignItems:"center",gap:12,padding:14}}>
            <div style={S.avatar(C.orange,40)}><I.Bird s={18}/></div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:900,fontSize:14,color:C.text}}>{b.species}</div>
              <div style={{fontSize:11,color:C.textMuted}}>{inv?.name||"—"} • {b.tag||"Sem tag"} • {fmtBRL(b.purchasePrice)}</div>
              <div style={{display:"flex",gap:6,marginTop:4}}>
                {(b.matrizes||0)>0&&<span style={S.badge(C.orange)}>{b.matrizes} {b.matrizes===1?"Matriz":"Matrizes"}</span>}
                {(b.reprodutores||0)>0&&<span style={S.badge(C.blue)}>{b.reprodutores} {b.reprodutores===1?"Reprodutor":"Reprodutores"}</span>}
              </div>
            </div>
            <div style={{cursor:"pointer",padding:4}} onClick={()=>{setEditBirdData(b);setModal("editBird");}}><I.Edit s={16} c={C.textMuted}/></div>
            <div style={{cursor:"pointer",padding:4}} onClick={()=>{setBirds(p=>p.filter(x=>x.id!==b.id));showToast("Ave removida");}}><I.Trash s={16} c={C.red}/></div>
          </div>;
        })}
      </div>
    </div>;
  };

  /* ═══════════════════════════════════════════
     PAGE: REPORTS
     ═══════════════════════════════════════════ */
  const ReportsPage = () => {
    const donutData=investors.map((inv,i)=>({value:filtDist[inv.id]?.total||0,color:getColor(i),label:inv.name.split(" ")[0]})).filter(d=>d.value>0);
    return <div>
      <div style={{background:`linear-gradient(135deg,${C.purple},${C.purple}CC)`,padding:"22px 22px 18px",borderRadius:"0 0 28px 28px",boxShadow:`0 6px 24px ${C.purple}30`}}>
        <div style={{fontSize:22,fontWeight:900,color:"#fff"}}>📊 Relatórios</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.75)",fontWeight:700,marginTop:2}}>Análise de distribuição de lucros</div>
      </div>
      <div style={{padding:"16px 18px"}}>
        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:14}}>
          {[["all","Todos"],["day","Hoje"],["week","Semana"],["biweek","Quinzena"],["month","Mês"],["year","Ano"]].map(([k,v])=>(
            <button key={k} style={S.chip(filterPeriod===k)} onClick={()=>setFilterPeriod(k)}>{v}</button>
          ))}
        </div>

        {donutData.length>0&&<div style={{...S.card,display:"flex",flexDirection:"column",alignItems:"center"}}>
          <div style={{fontSize:15,fontWeight:900,marginBottom:12,alignSelf:"flex-start",color:C.text}}>Por Investidor</div>
          <Donut data={donutData} size={190}/>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:16,justifyContent:"center"}}>{donutData.map((d,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:10,borderRadius:"50%",background:d.color}}/><span style={{fontSize:11,color:C.textMuted,fontWeight:700}}>{d.label}</span></div>)}</div>
        </div>}

        {monthlyData.length>0&&<div style={S.card}><div style={{fontSize:15,fontWeight:900,marginBottom:12,color:C.text}}>Faturamento Mensal</div><BarChart data={monthlyData} w={360} h={140}/></div>}

        {/* Ranking */}
        <div style={{fontSize:17,fontWeight:900,color:C.text,marginBottom:12}}>Ranking de Lucros</div>
        {investors.map((inv,i)=>({...inv,profit:filtDist[inv.id]?.total||0,idx:i})).sort((a,b)=>b.profit-a.profit).map((inv,rank)=>(
          <div key={inv.id} style={{...S.card,display:"flex",alignItems:"center",gap:12,padding:14}}>
            <div style={{width:30,height:30,borderRadius:"50%",background:rank===0?C.gold:rank===1?"#C0C0C0":rank===2?"#CD7F32":C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:rank<3?"#fff":C.textMuted,boxShadow:rank<3?`0 2px 8px rgba(0,0,0,0.15)`:"none"}}>{rank+1}</div>
            <div style={S.avatar(getColor(inv.idx),38)}>{getAvatar(inv.name)}</div>
            <div style={{flex:1}}><div style={{fontWeight:900,fontSize:14,color:C.text}}>{inv.name}</div><div style={{fontSize:11,color:C.textMuted}}>{birds.filter(b=>b.investorId===inv.id).length} aves</div></div>
            <div style={{fontWeight:900,fontSize:16,color:getColor(inv.idx)}}>{fmtBRL(inv.profit)}</div>
          </div>
        ))}

        {/* Export individual PDFs */}
        <div style={{fontSize:15,fontWeight:900,color:C.text,marginTop:18,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
          <I.Lock s={16} c={C.orange}/> Exportar PDFs Individuais
        </div>
        <p style={{fontSize:12,color:C.textMuted,marginBottom:14}}>Cada PDF é confidencial — contém apenas os dados do respectivo investidor.</p>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {investors.map((inv,i)=>(
            <button key={inv.id} style={{...S.btnOut(getColor(i)),justifyContent:"flex-start",gap:12}} onClick={()=>genPDF(inv.id)}>
              <div style={S.avatar(getColor(i),32)}>{getAvatar(inv.name)}</div>
              <span style={{flex:1,textAlign:"left"}}>{inv.name}</span>
              <I.Download s={16}/>
              <span style={{fontSize:11,opacity:0.7}}>PDF</span>
            </button>
          ))}
        </div>
      </div>
    </div>;
  };

  /* ═══════════════════════════════════════════
     PAGE: SETTINGS
     ═══════════════════════════════════════════ */
  const SettingsPage = () => (
    <div>
      <div style={{background:`linear-gradient(135deg,${C.teal},${C.teal}CC)`,padding:"22px 22px 18px",borderRadius:"0 0 28px 28px",boxShadow:`0 6px 24px ${C.teal}30`}}>
        <div style={{fontSize:22,fontWeight:900,color:"#fff"}}>⚙️ Configurações</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.75)",fontWeight:700,marginTop:2}}>Sítio Voo dos Gansos</div>
      </div>
      <div style={{padding:"16px 18px"}}>
        <div style={{fontSize:16,fontWeight:900,color:C.text,marginBottom:12}}>Importação</div>
        <div style={S.card}>
          <p style={{fontSize:13,color:C.textSec,marginBottom:16}}>Importe o CSV do Wix Store para calcular a distribuição automática de lucros.</p>
          <button style={S.btn()} onClick={()=>setModal("import")}><I.Upload s={18}/> Importar CSV do Wix</button>
        </div>

        <div style={{fontSize:16,fontWeight:900,color:C.text,marginBottom:12,marginTop:8}}>Percentuais Padrão</div>
        <div style={S.card}>
          <div style={{display:"flex",gap:16}}>
            <div style={{flex:1}}><div style={{fontSize:10,fontWeight:800,color:C.textMuted,textTransform:"uppercase"}}>Ovo Fértil</div><div style={{fontSize:28,fontWeight:900,color:C.orange}}>10%</div><div style={{fontSize:11,color:C.textMuted}}>do valor do ovo</div></div>
            <div style={{flex:1}}><div style={{fontSize:10,fontWeight:800,color:C.textMuted,textTransform:"uppercase"}}>Venda de Ave</div><div style={{fontSize:28,fontWeight:900,color:C.purple}}>6.4%</div><div style={{fontSize:11,color:C.textMuted}}>do valor da venda</div></div>
            <div style={{flex:1}}><div style={{fontSize:10,fontWeight:800,color:C.textMuted,textTransform:"uppercase"}}>Aporte Capital</div><div style={{fontSize:28,fontWeight:900,color:C.gold}}>3%</div><div style={{fontSize:11,color:C.textMuted}}>a.m. juros compostos</div></div>
          </div>
        </div>

        <div style={{fontSize:16,fontWeight:900,color:C.text,marginBottom:12,marginTop:8}}>Sistema</div>
        <div style={S.card}>
          {[["Investidores",investors.length],["Aves cadastradas",birds.length],["Vendas importadas",sales.length],["Aportes financeiros",investments.length],["Espécies disponíveis",SPECIES.length]].map(([l,v],i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:i<4?`1px solid ${C.borderLight}`:"none"}}>
              <span style={{color:C.textSec,fontSize:13}}>{l}</span><span style={{fontWeight:900,color:C.text}}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{...S.card,background:`linear-gradient(135deg,${C.primaryBg},#fff)`,border:`1.5px solid ${C.primary}25`,marginTop:8}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{fontSize:40}}>🪿</div>
            <div><div style={{fontWeight:900,fontSize:17,color:C.text}}>Sítio Voo dos Gansos</div><div style={{fontSize:11,color:C.textMuted}}>Sistema de Distribuição de Lucros v2.0</div><div style={{fontSize:11,color:C.textMuted}}>Criação de aves ornamentais</div></div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div style={{fontFamily:"'Nunito','Segoe UI',system-ui,sans-serif",background:C.bg,color:C.text,minHeight:"100vh",maxWidth:480,margin:"0 auto",position:"relative",paddingBottom:82}}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.border};border-radius:4px}
        input:focus,select:focus{border-color:${C.primary}!important;box-shadow:0 0 0 3px ${C.primary}20!important}
        button:active{transform:scale(0.97)}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {toast&&<div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:toast.type==="success"?C.primary:C.red,color:"#fff",padding:"12px 24px",borderRadius:14,fontSize:14,fontWeight:800,zIndex:999,boxShadow:C.shadowLg}}>{toast.msg}</div>}

      {page==="dashboard"&&<Dashboard/>}
      {page==="investor"&&<InvestorDetail/>}
      {page==="birds"&&<BirdsPage/>}
      {page==="reports"&&<ReportsPage/>}
      {page==="settings"&&<SettingsPage/>}

      {modal==="addInv"&&<AddInvestorModal/>}
      {modal==="addBird"&&<AddBirdModal/>}
      {modal==="addInvest"&&<AddInvestmentModal/>}
      {modal==="import"&&<ImportModal/>}
      {modal==="editInv"&&<EditInvestorModal/>}
      {modal==="editBird"&&<EditBirdModal/>}
      {modal==="addOrder"&&<AddOrderModal/>}

      {/* Bottom Nav */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:C.card,borderTop:`1.5px solid ${C.border}`,display:"flex",justifyContent:"space-around",padding:"8px 0 14px",zIndex:100,boxShadow:"0 -4px 20px rgba(0,0,0,0.04)"}}>
        {[{id:"dashboard",icon:I.Home,label:"Início"},{id:"birds",icon:I.Bird,label:"Plantel"},{id:"reports",icon:I.Chart,label:"Relatórios"},{id:"settings",icon:I.Settings,label:"Config"}].map(item=>{
          const on=page===item.id||(page==="investor"&&item.id==="dashboard");
          return <div key={item.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:"pointer",color:on?C.primary:C.textMuted,fontSize:10,fontWeight:on?900:700,transition:"all 0.15s"}} onClick={()=>setPage(item.id)}>
            <item.icon s={22} c={on?C.primary:C.textMuted}/>
            <span>{item.label}</span>
            {on&&<div style={{width:5,height:5,borderRadius:"50%",background:C.primary}}/>}
          </div>;
        })}
      </div>
    </div>
  );
}
