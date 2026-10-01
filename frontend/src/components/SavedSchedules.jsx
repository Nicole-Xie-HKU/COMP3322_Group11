import { useState } from 'react';
import { Trash2 } from 'lucide-react';
export default function SavedSchedules({saved,onOpen,onRemove,onRename,busy}) {
  const [editing,setEditing]=useState(null),[name,setName]=useState('');
  return <section className="saved-panel" aria-label="Saved schedules">
    <div className="panel-title"><h2>Saved schedules</h2></div>
    <p className="schedule-note">New saves use MySQL and belong to this browser's private guest cookie. Clearing the cookie loses access. Older local saves remain labelled below.</p>
    {!saved.length?<p className="saved-empty">No saved schedules.</p>:saved.map(item=>{
      const keys=item.sectionKeys||item.schedule.sections.map(s=>`${s.courseCode}:${s.id}`);
      return <article key={`${item.legacy?'local':'server'}-${item.id}`} className="saved-card">
        <div><span className="saved-term">{item.term}{item.legacy?' · Older local save':''}</span>
          <h3>{item.name||keys.map(key=>key.split(':')[0]).join(' · ')}</h3><p>{keys.join(' / ')}</p></div>
        <div className="flex items-center gap-3">
          <button className="secondary-button" disabled={busy} onClick={()=>onOpen(item)}>View schedule</button>
          {!item.legacy && (editing===item.id ? <form onSubmit={event=>{
            event.preventDefault();if(name.trim()){onRename(item,name.trim());setEditing(null);}
          }}>
            <input aria-label="Schedule name" maxLength={100} required value={name} onChange={event=>setName(event.target.value)}/>
            <button className="text-button" type="submit" disabled={busy}>Save name</button>
            <button className="text-button" type="button" onClick={()=>setEditing(null)}>Cancel</button>
          </form> : <button className="text-button" disabled={busy} onClick={()=>{setName(item.name);setEditing(item.id);}}>Rename</button>)}
          <button className="icon-button" disabled={busy} aria-label={`Delete saved schedule ${item.id}`} onClick={()=>onRemove(item)}><Trash2 size={17}/></button>
        </div>
      </article>;
    })}
  </section>;
}
