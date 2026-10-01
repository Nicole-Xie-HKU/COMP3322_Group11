import { useEffect, useState } from 'react';
import { request, getCourse } from '../api';
const storageKey = 'hkuplan.saved-schedules';
function readLegacy() {
  try { const rows=JSON.parse(localStorage.getItem(storageKey)||'[]'); return Array.isArray(rows)?rows:[]; }
  catch { return []; }
}
// Older localStorage saves remain on this browser. New saves are owned by the HttpOnly guest session.
export function useSavedSchedules(setError) {
  const [remote,setRemote]=useState([]), [legacy,setLegacy]=useState(readLegacy);
  const [ready,setReady]=useState(false);
  async function refresh() { setRemote(await request('/schedules')); }
  useEffect(()=>{
    request('/guest-session',{method:'POST',body:'{}'}).then(refresh).then(()=>setReady(true)).catch(error=>setError(error.message));
  },[]);
  async function save(term,schedule) {
    await request('/schedules',{method:'POST',body:JSON.stringify({term,
      name:schedule.sections.map(s=>s.courseCode).join(' + ').slice(0,100),
      sectionKeys:schedule.sections.map(s=>`${s.courseCode}:${s.id}`)})});
    await refresh();
  }
  async function remove(item) {
    if (item.legacy) {
      const next=legacy.filter(s=>s.id!==item.id);
      localStorage.setItem(storageKey,JSON.stringify(next));setLegacy(next);
    } else { await request(`/schedules/${item.id}`,{method:'DELETE'});await refresh(); }
  }
  async function open(item) {
    if (item.legacy) return item;
    const value=await request(`/schedules/${item.id}`);
    const codes=[...new Set(value.schedule.sections.map(s=>s.courseCode))];
    return {...value,courses:await Promise.all(codes.map(code=>getCourse(value.term,code))),locked:{}};
  }
  async function rename(item,name) {
    await request(`/schedules/${item.id}`,{method:'PUT',body:JSON.stringify({name})});await refresh();
  }
  return {saved:[...remote,...legacy.map(item=>({...item,legacy:true}))],ready,save,remove,open,rename};
}
