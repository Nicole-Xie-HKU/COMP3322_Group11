import {courses,term} from './fixtures.mjs';
export function fakeDatabase() {
  const stored=new Map(),sessions=new Map(); let serial=0;
  const db={ courses:structuredClone(courses),revision:1,unavailable:false,
    async ready(){if(db.unavailable)throw new Error('offline');},
    async getTerms(){return [{id:term,name:'2026-27 Sem 1',startDate:'2026-09-01',endDate:'2026-11-30'}]},
    async searchCourses(t,q){if(t!==term)throw Object.assign(new Error('Term not found'),{code:'TERM_NOT_FOUND'});return db.courses.filter(c=>c.code.toLowerCase().includes(q.toLowerCase())||c.title.toLowerCase().includes(q.toLowerCase()))},
    async getCoursesForScheduling(t,codes){
      if(t!==term)throw Object.assign(new Error('Term not found'),{code:'TERM_NOT_FOUND'});
      const found=db.courses.filter(c=>codes.includes(c.code));
      return {courses:structuredClone(found),notFound:codes.filter(c=>!found.some(x=>x.code===c)),notOffered:found.filter(c=>!c.sections.length).map(c=>c.code),revision:db.revision};
    },
    async createSession(hash){const session={id:`session-${sessions.size}`,expiresAt:'2099-01-01 00:00:00'};sessions.set(hash,session);return session},
    async getSession(hash){const session=sessions.get(hash);return session?.expired ? null : session??null},
    async writeSaved(owner,input,id){id??=++serial;const saved={...input,id};stored.set(id,{owner,saved});return saved},
    async getSaved(owner,id){const record=stored.get(id);return record?.owner===owner ? structuredClone(record.saved) : null},
    async listSaved(owner){return [...stored.values()].filter(r=>r.owner===owner).map(r=>structuredClone(r.saved))},
    async deleteSaved(owner,id){if(!await db.getSaved(owner,id))throw Object.assign(new Error('Not found'),{code:'SCHEDULE_NOT_FOUND'});stored.delete(id)},
    async close(){}, sessions,
  };return db;
}
