// frontend/src/pages/Dashboard.jsx
import { useState, useEffect, useRef } from 'react'
import { getTasks, createTask, toggleDone, setActive, askAI, generatePlan } from '../api/client'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

// ── Color maps ─────────────────────────────────────────────
const PRI_COLOR  = { High:'#ff5e87', Critical:'#ff4466', Medium:'#ffb547', Low:'#38bdf8' }
const PRI_BG     = { High:'rgba(255,94,135,.12)', Critical:'rgba(255,68,102,.12)', Medium:'rgba(255,181,71,.12)', Low:'rgba(56,189,248,.12)' }
const CAT_COLOR  = { Development:'#a0a3ff', Learning:'#00e5a0', Work:'#ffb547', Health:'#38bdf8', Personal:'#f472b6', Design:'#fb923c', General:'#94a3b8' }
const CAT_BG     = { Development:'rgba(160,163,255,.12)', Learning:'rgba(0,229,160,.1)', Work:'rgba(255,181,71,.1)', Health:'rgba(56,189,248,.1)', Personal:'rgba(244,114,182,.1)', Design:'rgba(251,146,60,.1)', General:'rgba(148,163,184,.1)' }

export default function Dashboard({ user, onLogout }) {
  const [page, setPage]       = useState('dashboard')
  const [tasks, setTasks]     = useState([])
  const [sideOpen, setSide]   = useState(true)
  const [showModal, setModal] = useState(false)
  const [form, setForm]       = useState({ name:'', description:'', deadline:'', priority:'Medium', category:'Development', duration:45 })

  // AI chat
  const userName = localStorage.getItem('user_name') || 'there'
  const [messages, setMessages] = useState([
    { role:'ai', text:`Hi ${localStorage.getItem('user_name')}! 👋 I'm Daynex — your AI productivity assistant. I can see all your tasks in real time.\n\nTry asking:\n• "What should I focus on today?"\n• "Create a study plan for React"\n• "How is my progress this week?"` }
  ])
  const [chatInput, setChatInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const feedRef = useRef(null)

  // planner
  const [goal, setGoal]         = useState('')
  const [timeline, setTimeline] = useState('2 weeks')
  const [hours, setHours]       = useState('2-4 hrs')
  const [plan, setPlan]         = useState(null)
  const [planLoading, setPlanLoading] = useState(false)

  // calendar
  const [calYear, setCalYear]   = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [selDay, setSelDay]     = useState(null)

  // filter
  const [taskFilter, setTaskFilter] = useState('all')

  useEffect(() => { loadTasks() }, [])
  useEffect(() => { if(feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight }, [messages, aiLoading])

  async function loadTasks() {
    try { const { data } = await getTasks(); setTasks(data) } catch {}
  }

  async function handleCreateTask(e) {
    e.preventDefault()
    try {
      await createTask(form)
      setModal(false)
      setForm({ name:'', description:'', deadline:'', priority:'Medium', category:'Development', duration:45 })
      loadTasks()
    } catch {}
  }

  async function handleToggle(id)    { await toggleDone(id); loadTasks() }
  async function handleSetActive(id) { await setActive(id);  loadTasks() }

  // ── AI chat — fixed ───────────────────────────────────────
  async function handleSendChat() {
    const msg = chatInput.trim()
    if (!msg) return
    setChatInput('')
    setMessages(m => [...m, { role:'user', text: msg }])
    setAiLoading(true)
    try {
      const { data } = await askAI(msg)
      setMessages(m => [...m, { role:'ai', text: data.reply }])
    } catch (err) {
      setMessages(m => [...m, { role:'ai', text:'⚠️ Could not reach AI. Check that your backend is running and GROQ_API_KEY is set in backend/.env' }])
    }
    setAiLoading(false)
  }

  // ── AI planner — fixed ────────────────────────────────────
  async function handleGenPlan() {
    if (!goal.trim()) return
    setPlanLoading(true)
    setPlan(null)
    try {
      const { data } = await generatePlan({ goal, timeline, hours })  // ← fixed call
      setPlan(data.plan)
    } catch (err) {
      setPlan('⚠️ Could not generate plan. Check that your backend is running and GROQ_API_KEY is set in backend/.env')
    }
    setPlanLoading(false)
  }

  // ── Derived ───────────────────────────────────────────────
  const today      = new Date().toISOString().split('T')[0]
  const todayTasks = tasks.filter(t => t.deadline === today)
  const activeTask = tasks.find(t => t.active && !t.done)
  const nextTask   = tasks.find(t => !t.done && !t.active && t.deadline === today)
  const doneTodayCount = tasks.filter(t => t.done && t.deadline === today).length
  const pct        = todayTasks.length ? Math.round(doneTodayCount / todayTasks.length * 100) : 0

  const filteredTasks = taskFilter === 'all'     ? tasks
    : taskFilter === 'today'   ? tasks.filter(t => t.deadline === today)
    : taskFilter === 'pending' ? tasks.filter(t => !t.done)
    : tasks.filter(t => t.done)

  // ── Calendar ──────────────────────────────────────────────
  const calFirst = new Date(calYear, calMonth, 1).getDay()
  const calDim   = new Date(calYear, calMonth+1, 0).getDate()
  function prevMonth() { if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1)}else setCalMonth(m=>m-1) }
  function nextMonth() { if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1)}else setCalMonth(m=>m+1) }

  // ── Task row ──────────────────────────────────────────────
  function TaskRow({ t, showDate }) {
    return (
      <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 0', borderBottom:'1px solid rgba(46,46,68,.7)' }}>
        <div onClick={() => handleToggle(t.id)} style={{
          width:20, height:20, borderRadius:6, border: t.done?'none':'1.5px solid #3a3a52',
          background: t.done?'#00c98a':'transparent', cursor:'pointer', flexShrink:0, marginTop:1,
          display:'flex', alignItems:'center', justifyContent:'center', transition:'.15s'
        }}>
          {t.done && <svg width="11" height="11" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#0d0d14" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>}
        </div>
        <div onClick={() => !t.done && handleSetActive(t.id)} style={{
          width:8, height:8, borderRadius:'50%', flexShrink:0, marginTop:6, cursor:'pointer', transition:'.15s',
          background: t.active ? '#a0a3ff' : '#26263a',
          boxShadow: t.active ? '0 0 8px rgba(160,163,255,.5)' : 'none'
        }} title="Set as active task" />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13.5, fontWeight:500, color: t.done?'#5a5a78':'#e4e4f0', textDecoration: t.done?'line-through':'none', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {t.name}
          </div>
          <div style={{ display:'flex', gap:5, marginTop:5, flexWrap:'wrap', alignItems:'center' }}>
            <span style={{ fontSize:10.5, fontWeight:700, padding:'2px 8px', borderRadius:5, background: PRI_BG[t.priority]||PRI_BG.Medium, color: PRI_COLOR[t.priority]||PRI_COLOR.Medium }}>{t.priority}</span>
            <span style={{ fontSize:10.5, fontWeight:700, padding:'2px 8px', borderRadius:5, background: CAT_BG[t.category]||CAT_BG.General, color: CAT_COLOR[t.category]||CAT_COLOR.General }}>{t.category}</span>
            <span style={{ fontSize:11, color:'#5a5a78', fontFamily:'monospace' }}>⏱ {t.duration}m</span>
            {showDate && t.deadline && <span style={{ fontSize:11, color:'#5a5a78', fontFamily:'monospace' }}>📅 {t.deadline}</span>}
          </div>
          {t.notes && <div style={{ fontSize:11.5, color:'#00e5a0', marginTop:4, background:'rgba(0,229,160,.06)', padding:'4px 8px', borderRadius:5 }}>💡 {t.notes}</div>}
        </div>
      </div>
    )
  }

  const navItems = [
    { id:'dashboard', label:'Dashboard',  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg> },
    { id:'tasks',     label:'Tasks',      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9"/></svg> },
    { id:'planner',   label:'AI Planner', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
    { id:'calendar',  label:'Calendar',   icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    { id:'analytics', label:'Analytics',  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
    { id:'ai',        label:'Ask Daynex', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4"/></svg> },
  ]

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', fontFamily:"'Outfit',sans-serif", background:'#080810', color:'#e4e4f0' }}>

      {/* ══ SIDEBAR ══ */}
      <nav style={{
        width: sideOpen ? 230 : 64, minWidth: sideOpen ? 230 : 64,
        background:'#0e0e1a', borderRight:'1px solid #1e1e30',
        display:'flex', flexDirection:'column', padding:'16px 10px',
        transition:'.25s', overflow:'hidden', flexShrink:0
      }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 4px 20px', borderBottom:'1px solid #1e1e30', marginBottom:12 }}>
          <div style={{
            width:36, height:36, borderRadius:11, background:'linear-gradient(135deg,#5b5fef,#a78bfa)',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
            fontSize:16, fontWeight:700, color:'white', letterSpacing:'-.5px'
          }}>D</div>
          {sideOpen && <span style={{ fontSize:18, fontWeight:700, letterSpacing:'-.4px', whiteSpace:'nowrap' }}>
            Day<b style={{color:'#a0a3ff'}}>nex</b><span style={{color:'#3a3a58',fontWeight:400,fontSize:13}}>.ai</span>
          </span>}
        </div>

        {/* Nav items */}
        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
          {navItems.map(n => (
            <div key={n.id} onClick={() => setPage(n.id)} style={{
              display:'flex', alignItems:'center', gap:11,
              padding: sideOpen ? '9px 12px' : '9px 0', justifyContent: sideOpen ? 'flex-start' : 'center',
              borderRadius:9, cursor:'pointer', transition:'.15s', whiteSpace:'nowrap',
              background: page===n.id ? 'rgba(91,95,239,.18)' : 'transparent',
              color:      page===n.id ? '#a0a3ff' : '#5a5a78',
              fontSize:13.5, fontWeight:500,
            }}>
              <span style={{ flexShrink:0 }}>{n.icon}</span>
              {sideOpen && <span>{n.label}</span>}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop:'auto', borderTop:'1px solid #1e1e30', paddingTop:12 }}>
          <div style={{
            display:'flex', alignItems:'center', gap:10,
            padding: sideOpen ? '8px 12px' : '8px 0', justifyContent: sideOpen ? 'flex-start' : 'center',
            borderRadius:9, cursor:'pointer', color:'#5a5a78', fontSize:13.5, fontWeight:500,
          }} onClick={onLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            {sideOpen && <span>Log out</span>}
          </div>
        </div>
      </nav>

      {/* ══ MAIN ══ */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'#080810' }}>

        {/* Topbar */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 24px', borderBottom:'1px solid #1e1e30', background:'#0e0e1a', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={() => setSide(s=>!s)} style={{ width:32, height:32, borderRadius:8, background:'#161624', border:'1px solid #1e1e30', color:'#5a5a78', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <span style={{ fontSize:15, fontWeight:600, letterSpacing:'-.2px' }}>
              {{ dashboard:'Dashboard', tasks:'Tasks', planner:'AI Planner', calendar:'Calendar', analytics:'Analytics', ai:'Ask Daynex' }[page]}
            </span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button onClick={() => setModal(true)} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 16px', borderRadius:20, border:'none', background:'linear-gradient(135deg,#5b5fef,#7c3aed)', color:'white', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>
              + New Task
            </button>
            <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#5b5fef,#ec4899)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              {userName[0].toUpperCase()}
            </div>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex:1, overflowY:'auto', padding:24 }}>

          {/* ══════════════ DASHBOARD ══════════════ */}
          {page==='dashboard' && <>
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:22, fontWeight:700, letterSpacing:'-.4px' }}>Good day, {userName} 👋</div>
              <div style={{ fontSize:13, color:'#5a5a78', marginTop:4 }}>{new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
            </div>

            {/* Active task banner */}
            {activeTask && (
              <div style={{ background:'linear-gradient(135deg,rgba(91,95,239,.12),rgba(124,58,237,.08))', border:'1px solid rgba(91,95,239,.35)', borderRadius:14, padding:'16px 20px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:'#a0a3ff', flexShrink:0, boxShadow:'0 0 10px rgba(160,163,255,.6)', animation:'pulse 2s infinite' }} />
                  <div>
                    <div style={{ fontSize:10.5, color:'#a0a3ff', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:3 }}>Now working on</div>
                    <div style={{ fontSize:14, fontWeight:600 }}>{activeTask.name}</div>
                    <div style={{ fontSize:12, color:'#5a5a78', marginTop:2 }}>
                      <span style={{ color: PRI_COLOR[activeTask.priority] }}>{activeTask.priority}</span> · {activeTask.duration} min · {activeTask.category}
                    </div>
                  </div>
                </div>
                <button onClick={() => handleToggle(activeTask.id)} style={{ padding:'7px 16px', borderRadius:20, border:'none', background:'#00c98a', color:'#0d0d14', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>
                  ✓ Mark Done
                </button>
              </div>
            )}

            {/* Stat cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:14, marginBottom:20 }}>
              {[
                { label:"Today's Tasks",  val: todayTasks.length,                         color:'#a0a3ff', bg:'rgba(160,163,255,.08)', accent:'rgba(160,163,255,.3)', icon:'📋' },
                { label:'Completed',      val: doneTodayCount,                             color:'#00e5a0', bg:'rgba(0,229,160,.07)',   accent:'rgba(0,229,160,.3)',   icon:'✅' },
                { label:'Total All Time', val: tasks.filter(t=>t.done).length,             color:'#ffb547', bg:'rgba(255,181,71,.07)',  accent:'rgba(255,181,71,.3)',  icon:'🏆' },
                { label:'Pending',        val: tasks.filter(t=>!t.done).length,            color:'#38bdf8', bg:'rgba(56,189,248,.07)',  accent:'rgba(56,189,248,.3)',  icon:'⏳' },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, border:`1px solid ${s.accent}`, borderRadius:14, padding:'18px 20px', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:14, right:16, fontSize:22, opacity:.6 }}>{s.icon}</div>
                  <div style={{ fontSize:12, color:'#9898b8', fontWeight:500, marginBottom:6 }}>{s.label}</div>
                  <div style={{ fontSize:30, fontWeight:700, color:s.color, letterSpacing:'-.5px', lineHeight:1 }}>{s.val}</div>
                  {s.label === "Today's Tasks" && todayTasks.length > 0 && (
                    <div style={{ height:3, background:'rgba(160,163,255,.15)', borderRadius:2, marginTop:10 }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:'#a0a3ff', borderRadius:2, transition:'.5s' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:16 }}>
              {/* Today tasks */}
              <div style={{ background:'#0e0e1a', border:'1px solid #1e1e30', borderRadius:14, padding:'18px 20px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#5a5a78' }}>Today's Focus</span>
                  <button onClick={() => setPage('tasks')} style={{ fontSize:12, color:'#5b5fef', background:'none', border:'none', cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontWeight:600 }}>All tasks →</button>
                </div>
                {todayTasks.length
                  ? todayTasks.map(t => <TaskRow key={t.id} t={t} />)
                  : <div style={{ color:'#3a3a58', fontSize:13, padding:'20px 0', textAlign:'center' }}>
                      No tasks for today.<br/>
                      <button onClick={()=>setModal(true)} style={{ color:'#a0a3ff', background:'none', border:'none', cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontSize:13, marginTop:4 }}>+ Add one</button>
                    </div>}
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {/* Next up */}
                <div style={{ background:'#0e0e1a', border:'1px solid #1e1e30', borderRadius:14, padding:'16px 18px' }}>
                  <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#5a5a78', marginBottom:10 }}>Next Up</div>
                  {nextTask
                    ? <div style={{ background:'rgba(255,181,71,.07)', border:'1px solid rgba(255,181,71,.2)', borderRadius:10, padding:'12px 14px' }}>
                        <div style={{ fontSize:13.5, fontWeight:600 }}>{nextTask.name}</div>
                        <div style={{ fontSize:12, color:'#9898b8', marginTop:4, display:'flex', gap:8 }}>
                          <span style={{ color: PRI_COLOR[nextTask.priority] }}>{nextTask.priority}</span>
                          <span>·</span>
                          <span>{nextTask.duration} min</span>
                        </div>
                      </div>
                    : <div style={{ color:'#3a3a58', fontSize:13 }}>All clear! 🎉</div>}
                </div>

                {/* Progress ring area */}
                <div style={{ background:'#0e0e1a', border:'1px solid #1e1e30', borderRadius:14, padding:'16px 18px' }}>
                  <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#5a5a78', marginBottom:12 }}>Day Progress</div>
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ position:'relative', width:64, height:64, flexShrink:0 }}>
                      <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform:'rotate(-90deg)' }}>
                        <circle cx="32" cy="32" r="26" fill="none" stroke="#1e1e30" strokeWidth="6"/>
                        <circle cx="32" cy="32" r="26" fill="none" stroke="#00c98a" strokeWidth="6"
                          strokeDasharray={`${163.4 * pct / 100} 163.4`} strokeLinecap="round" style={{ transition:'.5s' }}/>
                      </svg>
                      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#00e5a0' }}>{pct}%</div>
                    </div>
                    <div>
                      <div style={{ fontSize:13, color:'#e4e4f0', fontWeight:500 }}>{doneTodayCount} of {todayTasks.length} done</div>
                      <div style={{ fontSize:12, color:'#5a5a78', marginTop:3 }}>{todayTasks.length - doneTodayCount} remaining today</div>
                    </div>
                  </div>
                </div>

                {/* AI insight */}
                <div style={{ background:'linear-gradient(135deg,rgba(91,95,239,.1),rgba(124,58,237,.06))', border:'1px solid rgba(91,95,239,.25)', borderRadius:14, padding:'16px 18px' }}>
                  <div style={{ fontSize:10.5, color:'#a0a3ff', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8 }}>⚡ Daynex Insight</div>
                  <div style={{ fontSize:13, color:'#9898b8', lineHeight:1.7 }}>
                    You have <strong style={{color:'#e4e4f0'}}>{tasks.filter(t=>!t.done).length} pending tasks</strong>.
                    {todayTasks.filter(t=>!t.done).length > 0
                      ? ` Focus on today's ${todayTasks.filter(t=>!t.done).length} remaining first.`
                      : ' Set deadlines on tasks to see them in today\'s focus.'}
                  </div>
                  <button onClick={() => setPage('ai')} style={{ fontSize:12, color:'#a0a3ff', background:'none', border:'none', cursor:'pointer', marginTop:8, fontFamily:"'Outfit',sans-serif", fontWeight:600 }}>Ask AI for more →</button>
                </div>
              </div>
            </div>
          </>}

          {/* ══════════════ TASKS ══════════════ */}
          {page==='tasks' && <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <div style={{ fontSize:15, fontWeight:600 }}>Task Manager</div>
              <button onClick={() => setModal(true)} style={{ padding:'8px 18px', borderRadius:20, border:'none', background:'linear-gradient(135deg,#5b5fef,#7c3aed)', color:'white', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>+ New Task</button>
            </div>

            {/* Filter tabs */}
            <div style={{ display:'flex', gap:4, background:'#0e0e1a', padding:4, borderRadius:10, width:'fit-content', marginBottom:18, border:'1px solid #1e1e30' }}>
              {[['all','All'],['today','Today'],['pending','Pending'],['done','Done']].map(([f,l]) => (
                <button key={f} onClick={() => setTaskFilter(f)} style={{
                  padding:'6px 16px', borderRadius:7, border:'none', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:"'Outfit',sans-serif", transition:'.15s',
                  background: taskFilter===f ? '#161624' : 'transparent',
                  color:      taskFilter===f ? '#e4e4f0' : '#5a5a78',
                  boxShadow:  taskFilter===f ? '0 1px 4px rgba(0,0,0,.4)' : 'none'
                }}>{l}</button>
              ))}
            </div>

            <div style={{ background:'#0e0e1a', border:'1px solid #1e1e30', borderRadius:14, padding:'4px 20px' }}>
              {filteredTasks.length
                ? filteredTasks.map(t => <TaskRow key={t.id} t={t} showDate />)
                : <div style={{ color:'#3a3a58', fontSize:13, padding:'30px 0', textAlign:'center' }}>No tasks here. Add one! 🎉</div>}
            </div>
          </>}

          {/* ══════════════ AI PLANNER ══════════════ */}
          {page==='planner' && <>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>AI Planner</div>
              <div style={{ fontSize:13, color:'#5a5a78' }}>Describe your goal — Daynex builds a structured roadmap using AI</div>
            </div>
            <div style={{ background:'#0e0e1a', border:'1px solid #1e1e30', borderRadius:14, padding:'20px', marginBottom:16 }}>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11.5, fontWeight:600, color:'#5a5a78', marginBottom:6 }}>Your goal</div>
                <textarea style={{ width:'100%', background:'#161624', border:'1px solid #2a2a3e', borderRadius:9, padding:'10px 13px', color:'#e4e4f0', fontFamily:"'Outfit',sans-serif", fontSize:13.5, outline:'none', resize:'vertical', minHeight:90, boxSizing:'border-box' }}
                  placeholder="e.g. Learn React and build a portfolio project in 2 weeks..."
                  value={goal} onChange={e=>setGoal(e.target.value)} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:11.5, fontWeight:600, color:'#5a5a78', marginBottom:6 }}>Timeline</div>
                  <select style={{ width:'100%', background:'#161624', border:'1px solid #2a2a3e', borderRadius:9, padding:'9px 12px', color:'#e4e4f0', fontFamily:"'Outfit',sans-serif", fontSize:13, outline:'none' }} value={timeline} onChange={e=>setTimeline(e.target.value)}>
                    <option>1 week</option><option>2 weeks</option><option>1 month</option><option>3 months</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:11.5, fontWeight:600, color:'#5a5a78', marginBottom:6 }}>Daily hours</div>
                  <select style={{ width:'100%', background:'#161624', border:'1px solid #2a2a3e', borderRadius:9, padding:'9px 12px', color:'#e4e4f0', fontFamily:"'Outfit',sans-serif", fontSize:13, outline:'none' }} value={hours} onChange={e=>setHours(e.target.value)}>
                    <option>1-2 hrs</option><option>2-4 hrs</option><option>4-6 hrs</option><option>6+ hrs</option>
                  </select>
                </div>
              </div>
              <button onClick={handleGenPlan} disabled={planLoading} style={{ padding:'10px 24px', borderRadius:20, border:'none', background: planLoading?'#2a2a3e':'linear-gradient(135deg,#5b5fef,#7c3aed)', color:'white', fontSize:13.5, fontWeight:600, cursor: planLoading?'not-allowed':'pointer', fontFamily:"'Outfit',sans-serif" }}>
                {planLoading ? '⚡ Generating plan...' : '⚡ Generate AI Plan'}
              </button>
            </div>
            {plan && (
              <div style={{ background:'#0e0e1a', border:'1px solid rgba(91,95,239,.3)', borderRadius:14, padding:'20px' }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#a0a3ff', marginBottom:14 }}>Generated Roadmap</div>
                <pre style={{ fontSize:13.5, color:'#c8c8e0', lineHeight:1.9, whiteSpace:'pre-wrap', fontFamily:"'Outfit',sans-serif" }}>{plan}</pre>
              </div>
            )}
          </>}

          {/* ══════════════ CALENDAR ══════════════ */}
          {page==='calendar' && <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div style={{ fontSize:17, fontWeight:700 }}>{MONTH_NAMES[calMonth]} {calYear}</div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={prevMonth} style={{ padding:'6px 14px', borderRadius:8, border:'1px solid #1e1e30', background:'#0e0e1a', color:'#9898b8', cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontSize:13 }}>← Prev</button>
                <button onClick={nextMonth} style={{ padding:'6px 14px', borderRadius:8, border:'1px solid #1e1e30', background:'#0e0e1a', color:'#9898b8', cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontSize:13 }}>Next →</button>
              </div>
            </div>
            <div style={{ background:'#0e0e1a', border:'1px solid #1e1e30', borderRadius:14, padding:'16px', marginBottom:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, marginBottom:6 }}>
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                  <div key={d} style={{ textAlign:'center', fontSize:10.5, fontWeight:700, color:'#3a3a58', textTransform:'uppercase', padding:'4px 0' }}>{d}</div>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
                {Array(calFirst).fill(null).map((_,i) => <div key={'e'+i} style={{ minHeight:68, background:'#080810', borderRadius:7, opacity:.4 }} />)}
                {Array(calDim).fill(null).map((_,i) => {
                  const d   = i+1
                  const ds  = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                  const dt  = tasks.filter(t=>t.deadline===ds)
                  const isT = ds===today
                  const isSel = selDay===ds
                  return (
                    <div key={d} onClick={() => setSelDay(isSel?null:ds)} style={{
                      minHeight:68, background: isT?'rgba(91,95,239,.1)':'#0e0e1a',
                      border:`1px solid ${isSel?'#a0a3ff':isT?'rgba(91,95,239,.4)':'#1e1e30'}`,
                      borderRadius:7, padding:'6px 7px', cursor:'pointer', transition:'.15s'
                    }}>
                      <div style={{ fontSize:12, fontWeight:700, color: isT?'#a0a3ff':'#5a5a78', marginBottom:4 }}>{d}</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:2 }}>
                        {dt.slice(0,4).map(t => (
                          <div key={t.id} style={{ width:6, height:6, borderRadius:'50%', background: t.done?'#00c98a':PRI_COLOR[t.priority]||'#ffb547' }} />
                        ))}
                      </div>
                      {dt.length>0 && <div style={{ fontSize:10, color:'#3a3a58', marginTop:3 }}>{dt.length} task{dt.length>1?'s':''}</div>}
                    </div>
                  )
                })}
              </div>
            </div>
            {selDay && (
              <div style={{ background:'#0e0e1a', border:'1px solid #1e1e30', borderRadius:14, padding:'18px 20px' }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#5a5a78', marginBottom:12 }}>Tasks — {selDay}</div>
                {tasks.filter(t=>t.deadline===selDay).length
                  ? tasks.filter(t=>t.deadline===selDay).map(t => <TaskRow key={t.id} t={t} />)
                  : <div style={{ color:'#3a3a58', fontSize:13 }}>No tasks for this day.</div>}
              </div>
            )}
          </>}

          {/* ══════════════ ANALYTICS ══════════════ */}
          {page==='analytics' && <>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:20 }}>Analytics & Progress</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:12, marginBottom:18 }}>
              {[
                { label:'Total Tasks',   val: tasks.length,                              color:'#a0a3ff', bg:'rgba(160,163,255,.08)', border:'rgba(160,163,255,.2)' },
                { label:'Completed',     val: tasks.filter(t=>t.done).length,            color:'#00e5a0', bg:'rgba(0,229,160,.07)',   border:'rgba(0,229,160,.2)'   },
                { label:'Pending',       val: tasks.filter(t=>!t.done).length,           color:'#ffb547', bg:'rgba(255,181,71,.07)',  border:'rgba(255,181,71,.2)'  },
                { label:'High Priority', val: tasks.filter(t=>t.priority==='High').length, color:'#ff5e87', bg:'rgba(255,94,135,.07)', border:'rgba(255,94,135,.2)'  },
              ].map(s => (
                <div key={s.label} style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:12, padding:'16px 18px' }}>
                  <div style={{ fontSize:12, color:'#9898b8', marginBottom:6 }}>{s.label}</div>
                  <div style={{ fontSize:28, fontWeight:700, color:s.color }}>{s.val}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div style={{ background:'#0e0e1a', border:'1px solid #1e1e30', borderRadius:14, padding:'20px' }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#5a5a78', marginBottom:16 }}>By Category</div>
                {Object.entries(
                  tasks.reduce((a,t)=>{ a[t.category]=(a[t.category]||{total:0,done:0}); a[t.category].total++; if(t.done)a[t.category].done++; return a }, {})
                ).map(([cat,{total,done}]) => (
                  <div key={cat} style={{ marginBottom:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:5 }}>
                      <span style={{ color: CAT_COLOR[cat]||'#9898b8', fontWeight:600 }}>{cat}</span>
                      <span style={{ color:'#5a5a78', fontFamily:'monospace', fontSize:12 }}>{done}/{total}</span>
                    </div>
                    <div style={{ height:6, background:'#161624', borderRadius:3 }}>
                      <div style={{ height:'100%', width:`${total?Math.round(done/total*100):0}%`, background: CAT_COLOR[cat]||'#a0a3ff', borderRadius:3, transition:'.5s', opacity:.85 }} />
                    </div>
                  </div>
                ))}
                {tasks.length===0 && <div style={{ color:'#3a3a58', fontSize:13 }}>Add tasks to see category breakdown.</div>}
              </div>
              <div style={{ background:'#0e0e1a', border:'1px solid #1e1e30', borderRadius:14, padding:'20px' }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#5a5a78', marginBottom:16 }}>By Priority</div>
                {['High','Medium','Low','Critical'].map(pri => {
                  const pts = tasks.filter(t=>t.priority===pri)
                  const done = pts.filter(t=>t.done).length
                  return pts.length > 0 ? (
                    <div key={pri} style={{ marginBottom:14 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:5 }}>
                        <span style={{ color: PRI_COLOR[pri], fontWeight:600 }}>{pri}</span>
                        <span style={{ color:'#5a5a78', fontFamily:'monospace', fontSize:12 }}>{done}/{pts.length}</span>
                      </div>
                      <div style={{ height:6, background:'#161624', borderRadius:3 }}>
                        <div style={{ height:'100%', width:`${Math.round(done/pts.length*100)}%`, background: PRI_COLOR[pri], borderRadius:3, transition:'.5s', opacity:.8 }} />
                      </div>
                    </div>
                  ) : null
                })}
                {tasks.length===0 && <div style={{ color:'#3a3a58', fontSize:13 }}>Add tasks to see priority breakdown.</div>}
              </div>
            </div>
          </>}

          {/* ══════════════ ASK DAYNEX ══════════════ */}
          {page==='ai' && <>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:15, fontWeight:600, marginBottom:3 }}>Ask Daynex</div>
              <div style={{ fontSize:13, color:'#5a5a78' }}>AI with full context of your real tasks and goals</div>
            </div>

            {/* Quick chips */}
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
              {['What should I focus on today?','How is my progress?','Suggest a study plan','What tasks are overdue?','Give me productivity tips'].map(q => (
                <button key={q} onClick={() => setChatInput(q)} style={{ padding:'6px 13px', borderRadius:20, border:'1px solid #1e1e30', background:'#0e0e1a', color:'#9898b8', fontSize:12, cursor:'pointer', fontFamily:"'Outfit',sans-serif", transition:'.15s' }}>{q}</button>
              ))}
            </div>

            <div style={{ background:'#0e0e1a', border:'1px solid #1e1e30', borderRadius:14, padding:'18px 20px', display:'flex', flexDirection:'column', height:480 }}>
              {/* Feed */}
              <div ref={feedRef} style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:14, marginBottom:14, paddingRight:4 }}>
                {messages.map((m,i) => (
                  <div key={i} style={{ display:'flex', gap:10, flexDirection: m.role==='user'?'row-reverse':'row', alignItems:'flex-start' }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0,
                      background: m.role==='ai'?'linear-gradient(135deg,#5b5fef,#7c3aed)':'linear-gradient(135deg,#ec4899,#5b5fef)',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700 }}>
                      {m.role==='ai' ? 'D' : userName[0].toUpperCase()}
                    </div>
                    <div style={{
                      padding:'11px 15px', fontSize:13.5, lineHeight:1.7, maxWidth:'76%', whiteSpace:'pre-wrap',
                      background: m.role==='ai' ? '#161624':'#5b5fef',
                      color: '#e4e4f0',
                      border: m.role==='ai' ? '1px solid #2a2a3e':'none',
                      borderRadius: m.role==='ai' ? '4px 14px 14px 14px':'14px 4px 14px 14px',
                    }}>{m.text}</div>
                  </div>
                ))}
                {aiLoading && (
                  <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#5b5fef,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0 }}>D</div>
                    <div style={{ padding:'11px 15px', background:'#161624', border:'1px solid #2a2a3e', borderRadius:'4px 14px 14px 14px', display:'flex', gap:5, alignItems:'center' }}>
                      {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'#3a3a58', animation:`bounce 1.2s infinite ${i*0.2}s` }} />)}
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div style={{ display:'flex', gap:8, borderTop:'1px solid #1e1e30', paddingTop:14 }}>
                <textarea
                  style={{ flex:1, background:'#161624', border:'1px solid #2a2a3e', borderRadius:10, padding:'10px 13px', color:'#e4e4f0', fontFamily:"'Outfit',sans-serif", fontSize:13.5, outline:'none', resize:'none', height:44 }}
                  placeholder="Ask anything about your tasks, goals, or productivity..."
                  value={chatInput}
                  onChange={e=>setChatInput(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSendChat()} }}
                />
                <button onClick={handleSendChat} style={{ width:44, height:44, borderRadius:10, border:'none', background:'linear-gradient(135deg,#5b5fef,#7c3aed)', color:'white', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </div>
          </>}

        </div>
      </div>

      {/* ══ ADD TASK MODAL ══ */}
      {showModal && (
        <div onClick={e=>{ if(e.target===e.currentTarget)setModal(false) }} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(4px)' }}>
          <div style={{ background:'#0e0e1a', border:'1px solid #2a2a3e', borderRadius:18, padding:'28px 26px', width:460, maxWidth:'93vw', maxHeight:'88vh', overflowY:'auto' }}>
            <div style={{ fontSize:17, fontWeight:700, letterSpacing:'-.3px', marginBottom:20 }}>New Task</div>
            <form onSubmit={handleCreateTask} style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <div style={{ fontSize:11.5, fontWeight:600, color:'#5a5a78', marginBottom:5 }}>Task name *</div>
                <input style={{ width:'100%', background:'#161624', border:'1px solid #2a2a3e', borderRadius:9, padding:'10px 13px', color:'#e4e4f0', fontFamily:"'Outfit',sans-serif", fontSize:13.5, outline:'none', boxSizing:'border-box' }}
                  placeholder="e.g. Study Redis caching patterns" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required />
              </div>
              <div>
                <div style={{ fontSize:11.5, fontWeight:600, color:'#5a5a78', marginBottom:5 }}>Description</div>
                <textarea style={{ width:'100%', background:'#161624', border:'1px solid #2a2a3e', borderRadius:9, padding:'10px 13px', color:'#e4e4f0', fontFamily:"'Outfit',sans-serif", fontSize:13, outline:'none', resize:'none', height:64, boxSizing:'border-box' }}
                  placeholder="Optional details..." value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:11 }}>
                <div>
                  <div style={{ fontSize:11.5, fontWeight:600, color:'#5a5a78', marginBottom:5 }}>Deadline</div>
                  <input type="date" style={{ width:'100%', background:'#161624', border:'1px solid #2a2a3e', borderRadius:9, padding:'10px 13px', color:'#e4e4f0', fontFamily:"'Outfit',sans-serif", fontSize:13, outline:'none', boxSizing:'border-box', colorScheme:'dark' }}
                    value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})} />
                </div>
                <div>
                  <div style={{ fontSize:11.5, fontWeight:600, color:'#5a5a78', marginBottom:5 }}>Priority</div>
                  <select style={{ width:'100%', background:'#161624', border:'1px solid #2a2a3e', borderRadius:9, padding:'10px 13px', color:'#e4e4f0', fontFamily:"'Outfit',sans-serif", fontSize:13, outline:'none', boxSizing:'border-box' }}
                    value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>
                    <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                  </select>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:11 }}>
                <div>
                  <div style={{ fontSize:11.5, fontWeight:600, color:'#5a5a78', marginBottom:5 }}>Category</div>
                  <select style={{ width:'100%', background:'#161624', border:'1px solid #2a2a3e', borderRadius:9, padding:'10px 13px', color:'#e4e4f0', fontFamily:"'Outfit',sans-serif", fontSize:13, outline:'none', boxSizing:'border-box' }}
                    value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                    <option>Development</option><option>Design</option><option>Learning</option><option>Work</option><option>Health</option><option>Personal</option><option>General</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:11.5, fontWeight:600, color:'#5a5a78', marginBottom:5 }}>Duration (min)</div>
                  <input type="number" style={{ width:'100%', background:'#161624', border:'1px solid #2a2a3e', borderRadius:9, padding:'10px 13px', color:'#e4e4f0', fontFamily:"'Outfit',sans-serif", fontSize:13, outline:'none', boxSizing:'border-box' }}
                    value={form.duration} onChange={e=>setForm({...form,duration:+e.target.value})} min={5} />
                </div>
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:6 }}>
                <button type="button" onClick={()=>setModal(false)} style={{ padding:'9px 18px', borderRadius:10, border:'1px solid #2a2a3e', background:'#161624', color:'#9898b8', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>Cancel</button>
                <button type="submit" style={{ padding:'9px 20px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#5b5fef,#7c3aed)', color:'white', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>Add Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
        @keyframes pulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.85)} }
        ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#2a2a3e;border-radius:2px}
        * { box-sizing: border-box }
      `}</style>
    </div>
  )
}
