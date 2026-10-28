import { useState, type FormEvent } from 'react'
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, Bot, Check,
  CheckCircle2, ChevronDown, CircleHelp, Clock3, Command, Database, FileText,
  Inbox, Layers3, LoaderCircle, Mail, MoreHorizontal, Play, Plus, RotateCcw,
  Settings2, ShieldCheck, Sparkles, Users, X, Zap,
} from 'lucide-react'
import './App.css'

type TaskStatus = 'queued' | 'running' | 'done' | 'approval' | 'failed'
type RunStatus = 'ready' | 'running' | 'awaiting_approval' | 'completed' | 'failed'

type WorkflowTask = {
  id: string
  agent: string
  title: string
  detail: string
  tool: string
  status: TaskStatus
  needsApproval?: boolean
}

type Workflow = {
  company: string
  request: string
  status: RunStatus
  tasks: WorkflowTask[]
  startedAt: string
}

const sampleRequest = 'Qualify Northstar Labs as a new lead, update the CRM, and send a tailored intro email.'

const buildTasks = (): WorkflowTask[] => [
  { id: 'intake', agent: 'Intake agent', title: 'Extract lead details', detail: 'Parsed company, intent, and requested follow-up from the business request.', tool: 'Request parser', status: 'done' },
  { id: 'research', agent: 'Research agent', title: 'Enrich company profile', detail: 'Matched the domain and added industry, team size, and fit signals.', tool: 'Company lookup', status: 'done' },
  { id: 'crm', agent: 'CRM agent', title: 'Create or update CRM record', detail: 'Lead record is ready with a qualification score and source attribution.', tool: 'CRM · Contacts', status: 'done' },
  { id: 'draft', agent: 'Outreach agent', title: 'Draft personalized introduction', detail: 'Prepared a concise email using the company profile and lead context.', tool: 'Email · Drafts', status: 'done' },
  { id: 'approval', agent: 'Human review', title: 'Approve outbound email', detail: 'External messages are held for review before they leave your workspace.', tool: 'Approval gate', status: 'approval', needsApproval: true },
  { id: 'send', agent: 'Outreach agent', title: 'Send introduction and schedule follow-up', detail: 'Send the approved email and create a 3-day follow-up reminder.', tool: 'Email · Outbox', status: 'queued' },
  { id: 'log', agent: 'Coordinator', title: 'Log activity and notify owner', detail: 'Write the execution summary to the CRM timeline and notify the lead owner.', tool: 'CRM · Activity', status: 'queued' },
]

const taskIcon = (id: string) => {
  if (id === 'intake') return <FileText size={15} />
  if (id === 'research') return <Sparkles size={15} />
  if (id === 'crm' || id === 'log') return <Database size={15} />
  if (id === 'draft' || id === 'send') return <Mail size={15} />
  return <ShieldCheck size={15} />
}

function App() {
  const [workflow, setWorkflow] = useState<Workflow>({ company: 'Northstar Labs', request: sampleRequest, status: 'awaiting_approval', tasks: buildTasks(), startedAt: 'Today, 10:42 AM' })
  const [requestText, setRequestText] = useState('')
  const [failureArmed, setFailureArmed] = useState(false)
  const [isWorking, setIsWorking] = useState(false)
  const [notice, setNotice] = useState('')
  const [activeView, setActiveView] = useState('Overview')

  const completedCount = workflow.tasks.filter((task) => task.status === 'done').length
  const progress = Math.round((completedCount / workflow.tasks.length) * 100)
  const failedTask = workflow.tasks.find((task) => task.status === 'failed')

  const updateTask = (id: string, status: TaskStatus) => {
    setWorkflow((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, status } : task) }))
  }

  const createWorkflow = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const request = requestText.trim()
    if (!request) return
    const subject = request.match(/(?:for|onboard|qualify|about)\s+(.+)/i)?.[1]
    const company = subject?.split(/\s+(?:as|and|to|with|by|from|when|who|that|then|update|send|create|add|draft|follow|email|new)\b|[,.;]/i)[0].trim() || 'New lead'
    setWorkflow({ company, request, status: 'ready', tasks: buildTasks().map((task) => ({ ...task, status: 'queued' })), startedAt: 'Just now' })
    setRequestText('')
    setNotice(`Plan created for ${company}. Review the task sequence, then run it.`)
  }

  const runWorkflow = async () => {
    if (isWorking || workflow.status === 'awaiting_approval' || workflow.status === 'completed') return
    setIsWorking(true)
    setNotice('')
    setWorkflow((current) => ({ ...current, status: 'running' }))
    for (const task of workflow.tasks) {
      if (task.status === 'done') continue
      if (task.needsApproval) {
        updateTask(task.id, 'approval')
        setWorkflow((current) => ({ ...current, status: 'awaiting_approval' }))
        setNotice('A human review is required before the email can be sent.')
        setIsWorking(false)
        return
      }
      updateTask(task.id, 'running')
      await new Promise((resolve) => window.setTimeout(resolve, 650))
      if (task.id === 'crm' && failureArmed) {
        setFailureArmed(false)
        updateTask(task.id, 'failed')
        setWorkflow((current) => ({ ...current, status: 'failed' }))
        setNotice('CRM connector timed out. No record was changed; retry this step safely.')
        setIsWorking(false)
        return
      }
      updateTask(task.id, 'done')
    }
    setWorkflow((current) => ({ ...current, status: 'completed' }))
    setNotice('Workflow completed. CRM activity and follow-up are up to date.')
    setIsWorking(false)
  }

  const approveEmail = () => {
    updateTask('approval', 'done')
    setWorkflow((current) => ({ ...current, status: 'ready' }))
    setNotice('Email approved. Resume the workflow to send it and finish the handoff.')
  }

  const rejectEmail = () => {
    updateTask('approval', 'failed')
    setWorkflow((current) => ({ ...current, status: 'failed' }))
    setNotice('Email rejected. The workflow is paused and nothing was sent.')
  }

  const retryTask = () => {
    if (!failedTask) return
    updateTask(failedTask.id, 'queued')
    setWorkflow((current) => ({ ...current, status: 'ready' }))
    setNotice('Step reset. Resume the workflow to retry it.')
  }

  const statusLabel = workflow.status === 'awaiting_approval' ? 'Needs approval' : workflow.status === 'completed' ? 'Completed' : workflow.status === 'failed' ? 'Failed' : workflow.status === 'running' ? 'Running' : 'Ready to run'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup"><div className="brand-mark"><Command size={19} strokeWidth={2.2} /></div><span>relay<span className="brand-period">.</span></span></div>
        <div className="workspace-switcher"><div className="workspace-avatar">F</div><div className="workspace-copy"><strong>Fieldwork Studio</strong><span>Free workspace</span></div><ChevronDown size={15} /></div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {[
            { label: 'Overview', icon: <Layers3 size={17} /> },
            { label: 'Runs', icon: <Activity size={17} />, count: '12' },
            { label: 'Approvals', icon: <ShieldCheck size={17} />, count: workflow.status === 'awaiting_approval' ? '1' : undefined },
            { label: 'Integrations', icon: <Zap size={17} /> },
          ].map((item) => <button key={item.label} className={`nav-item ${activeView === item.label ? 'active' : ''}`} onClick={() => setActiveView(item.label)}>{item.icon}<span>{item.label}</span>{item.count && <span className="nav-count">{item.count}</span>}</button>)}
        </nav>
        <div className="nav-label agent-label">YOUR AGENTS <button title="Agent settings"><MoreHorizontal size={17} /></button></div>
        <div className="agent-list"><div className="agent-item"><span className="agent-dot dot-green" /><span>Intake agent</span><span className="agent-state">Ready</span></div><div className="agent-item"><span className="agent-dot dot-blue" /><span>Research agent</span><span className="agent-state">Ready</span></div><div className="agent-item"><span className="agent-dot dot-orange" /><span>CRM agent</span><span className="agent-state">Ready</span></div><div className="agent-item"><span className="agent-dot dot-violet" /><span>Outreach agent</span><span className="agent-state">Ready</span></div></div>
        <div className="sidebar-bottom"><div className="usage-label"><span>Monthly tasks</span><span>684 / 1,000</span></div><div className="usage-bar"><span /></div><button className="profile-button"><div className="profile-avatar">JM</div><div><strong>Jordan Miller</strong><span>Admin</span></div><MoreHorizontal size={18} /></button></div>
      </aside>

      <main className="main-area">
        <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{activeView}</strong></div><div className="topbar-actions"><div className="system-status"><span className="pulse-dot" />All systems operational</div><button className="icon-button" title="Help"><CircleHelp size={17} /></button><button className="icon-button" title="Settings"><Settings2 size={17} /></button></div></header>
        <div className="page-content">
          <section className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" />MONDAY, OCTOBER 28, 2026</div><h1>Good morning, Jordan<span className="heading-comma">.</span></h1><p>Here’s what’s moving across your workspace today.</p></div><button className="outline-button" onClick={() => { setWorkflow({ company: 'New lead', request: '', status: 'ready', tasks: buildTasks().map((task) => ({ ...task, status: 'queued' })), startedAt: 'Just now' }); setNotice('Describe the business request to plan a new run.') }}><Plus size={16} /> New workflow</button></section>
          <section className="metrics-row" aria-label="Workspace metrics">
            <div className="metric"><div className="metric-top"><span>Tasks automated</span><span className="metric-icon icon-mint"><Zap size={16} /></span></div><div className="metric-value">1,284</div><div className="metric-foot positive"><ArrowUpRight size={14} /> 18.6% <span>vs. last month</span></div></div>
            <div className="metric"><div className="metric-top"><span>Time returned</span><span className="metric-icon icon-sky"><Clock3 size={16} /></span></div><div className="metric-value">42.5 <small>hrs</small></div><div className="metric-foot positive"><ArrowUpRight size={14} /> 12.3% <span>vs. last month</span></div></div>
            <div className="metric"><div className="metric-top"><span>Success rate</span><span className="metric-icon icon-lime"><BadgeCheck size={16} /></span></div><div className="metric-value">98.2<small>%</small></div><div className="metric-foot positive"><ArrowUpRight size={14} /> 2.4% <span>vs. last month</span></div></div>
            <div className="metric"><div className="metric-top"><span>Needs your review</span><span className="metric-icon icon-peach"><Inbox size={16} /></span></div><div className="metric-value">{workflow.status === 'awaiting_approval' ? '01' : '00'}</div><div className="metric-foot quiet"><ArrowDownRight size={14} /> 2 items <span>since yesterday</span></div></div>
          </section>

          <section className="workbench-grid">
            <div className="workflow-panel">
              <div className="panel-heading"><div><div className="section-kicker">WORKFLOW BUILDER</div><h2>Put the busywork on autopilot</h2></div><button className="icon-button subtle" title="Workflow options"><MoreHorizontal size={19} /></button></div>
              <form className="request-form" onSubmit={createWorkflow}><label htmlFor="business-request">What would you like Relay to take care of?</label><div className="request-box"><Sparkles size={18} className="request-spark" /><textarea id="business-request" value={requestText} onChange={(event) => setRequestText(event.target.value)} placeholder="e.g. Qualify new inbound leads, update our CRM, and send a personal follow-up..." rows={3} /><button type="submit" className="plan-button" disabled={!requestText.trim()}><span>Plan workflow</span><ArrowRight size={15} /></button></div><div className="request-hint"><span>Relay will build a plan before taking action.</span><label className="failure-toggle"><input type="checkbox" checked={failureArmed} onChange={(event) => setFailureArmed(event.target.checked)} /><span>Test failure recovery</span></label></div></form>
              <div className="run-divider"><span>ACTIVE RUN</span><span className={`run-status status-${workflow.status}`}><i />{statusLabel}</span></div>
              <div className="run-title-row"><div><div className="run-name">{workflow.company} <span className="run-id">RUN-0248</span></div><div className="run-request">“{workflow.request || 'New lead onboarding workflow'}”</div></div><button className="text-button" title="Open run details"><MoreHorizontal size={18} /></button></div>
              <div className="progress-wrap"><div className="progress-meta"><span>Execution progress</span><span>{completedCount} of {workflow.tasks.length} tasks</span></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div></div>
              <div className="task-list">{workflow.tasks.map((task, index) => <div className={`task-row task-${task.status}`} key={task.id}><div className="task-rail"><div className="task-marker">{task.status === 'done' ? <Check size={13} /> : task.status === 'running' ? <LoaderCircle size={14} className="spin" /> : task.status === 'approval' ? <ShieldCheck size={14} /> : task.status === 'failed' ? <X size={13} /> : <span>{String(index + 1).padStart(2, '0')}</span>}</div>{index < workflow.tasks.length - 1 && <div className="task-connector" />}</div><div className="task-content"><div className="task-title-line"><strong>{task.title}</strong>{task.status === 'approval' && <span className="approval-tag">Review needed</span>}{task.status === 'failed' && <span className="failed-tag">Action failed</span>}</div><div className="task-detail">{task.detail}</div><div className="task-meta"><span className="task-agent-icon">{taskIcon(task.id)}</span><span>{task.agent}</span><span className="meta-dot">·</span><span>{task.tool}</span></div></div>{task.status === 'failed' && <button className="retry-button" onClick={retryTask}><RotateCcw size={13} /> Retry</button>}</div>)}</div>
              {workflow.status === 'awaiting_approval' && <div className="approval-box"><div className="approval-icon"><ShieldCheck size={17} /></div><div className="approval-copy"><strong>Review before sending</strong><span>Personalized email to {workflow.company}</span></div><button className="reject-button" onClick={rejectEmail} title="Reject email"><X size={16} /></button><button className="approve-button" onClick={approveEmail}><Check size={15} /> Approve</button></div>}
              {notice && <div className={`notice ${workflow.status === 'failed' ? 'notice-error' : ''}`}><span>{notice}</span><button aria-label="Dismiss message" onClick={() => setNotice('')}><X size={14} /></button></div>}
              <div className="workflow-footer"><div className="run-time"><Clock3 size={14} /> Started {workflow.startedAt}</div><button className="run-button" onClick={() => void runWorkflow()} disabled={isWorking || workflow.status === 'awaiting_approval' || workflow.status === 'completed' || workflow.status === 'failed'}>{isWorking ? <LoaderCircle size={15} className="spin" /> : workflow.status === 'completed' ? <CheckCircle2 size={15} /> : <Play size={14} fill="currentColor" />}{isWorking ? 'Running...' : workflow.status === 'completed' ? 'Completed' : 'Run workflow'}</button></div>
            </div>

            <aside className="right-rail">
              <section className="side-panel agent-panel"><div className="side-panel-heading"><div><div className="section-kicker">WORKING TOGETHER</div><h3>Agent team</h3></div><button className="icon-button subtle" title="View agent settings"><ArrowRight size={16} /></button></div><div className="team-caption"><span className="team-avatars"><i className="avatar-green"><FileText size={13} /></i><i className="avatar-blue"><Sparkles size={13} /></i><i className="avatar-orange"><Database size={13} /></i><i className="avatar-purple"><Mail size={13} /></i></span><span>4 agents coordinated</span></div><div className="agent-assignments"><div><span className="assignment-dot dot-green" /><span>Intake &amp; routing</span><strong>1 task</strong></div><div><span className="assignment-dot dot-blue" /><span>Research &amp; enrichment</span><strong>1 task</strong></div><div><span className="assignment-dot dot-orange" /><span>CRM operations</span><strong>2 tasks</strong></div><div><span className="assignment-dot dot-violet" /><span>Outreach &amp; follow-up</span><strong>2 tasks</strong></div></div><div className="coordination-note"><Bot size={15} /><span>Coordinator is tracking dependencies and execution state.</span></div></section>
              <section className="side-panel integrations-panel"><div className="side-panel-heading"><div><div className="section-kicker">CONNECTED TOOLS</div><h3>Integrations</h3></div><button className="text-button" onClick={() => setActiveView('Integrations')}>Manage</button></div><div className="integration-row"><div className="integration-logo crm-logo"><Users size={16} /></div><div className="integration-copy"><strong>HubSpot CRM</strong><span>Contacts, activities</span></div><span className="connected-dot" /></div><div className="integration-row"><div className="integration-logo email-logo"><Mail size={16} /></div><div className="integration-copy"><strong>Gmail</strong><span>Drafts, follow-ups</span></div><span className="connected-dot" /></div><div className="integration-row"><div className="integration-logo sheets-logo"><Layers3 size={16} /></div><div className="integration-copy"><strong>Google Sheets</strong><span>Lead source data</span></div><span className="connected-dot" /></div><button className="add-integration"><Plus size={15} /> Connect a tool</button></section>
              <section className="time-saved-panel"><div className="time-saved-head"><span>This week</span><span className="time-saved-delta"><ArrowUpRight size={13} /> 8.4%</span></div><div className="time-saved-value">14.2 <small>hours saved</small></div><div className="bar-chart" aria-label="Hours saved each day this week"><i style={{ height: '42%' }} /><i style={{ height: '61%' }} /><i style={{ height: '49%' }} /><i style={{ height: '82%' }} /><i style={{ height: '67%' }} /><i style={{ height: '100%' }} /><i style={{ height: '72%' }} /></div><div className="chart-days"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></section>
            </aside>
          </section>

          <section className="activity-section"><div className="activity-heading"><div><div className="section-kicker">LATEST ACTIVITY</div><h2>Recent runs</h2></div><button className="text-button" onClick={() => setActiveView('Runs')}>View all runs <ArrowRight size={14} /></button></div><div className="activity-table"><div className="table-header"><span>WORKFLOW</span><span>TRIGGERED BY</span><span>STATUS</span><span>TIME</span><span /></div><div className="activity-row"><div className="activity-workflow"><span className="activity-icon icon-mint"><Users size={15} /></span><span><strong>New lead onboarding</strong><small>Northstar Labs · 7 steps</small></span></div><div className="trigger-person"><span className="mini-avatar">JM</span>Jordan Miller</div><div><span className={`table-status ${workflow.status === 'awaiting_approval' ? 'table-review' : workflow.status === 'completed' ? 'table-complete' : workflow.status === 'failed' ? 'table-failed' : 'table-running'}`}><i />{statusLabel}</span></div><div className="activity-time">{workflow.startedAt}</div><button className="row-more" title="More run options"><MoreHorizontal size={17} /></button></div><div className="activity-row"><div className="activity-workflow"><span className="activity-icon icon-sky"><FileText size={15} /></span><span><strong>Inbound demo request</strong><small>Clearpath Systems · 5 steps</small></span></div><div className="trigger-person"><span className="mini-avatar avatar-rust">AL</span>Alex Lee</div><div><span className="table-status table-complete"><i />Completed</span></div><div className="activity-time">Today, 9:18 AM</div><button className="row-more" title="More run options"><MoreHorizontal size={17} /></button></div><div className="activity-row"><div className="activity-workflow"><span className="activity-icon icon-peach"><Mail size={15} /></span><span><strong>Renewal follow-up</strong><small>Juniper &amp; Co. · 4 steps</small></span></div><div className="trigger-person"><span className="mini-avatar avatar-olive">SK</span>Sam Kim</div><div><span className="table-status table-complete"><i />Completed</span></div><div className="activity-time">Today, 8:54 AM</div><button className="row-more" title="More run options"><MoreHorizontal size={17} /></button></div></div></section>
          <footer className="page-footer"><span><span className="footer-mark"><Command size={12} /></span> Relay is keeping work in motion.</span><span>Execution log <ArrowRight size={12} /></span></footer>
        </div>
      </main>
    </div>
  )
}

export default App