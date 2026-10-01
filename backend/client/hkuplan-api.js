// Provisional client: frontend teammates can replace these route mappings without changing domain code.
export class HkuplanApiError extends Error {
  constructor(status,body) { super(body?.error?.message || `HTTP ${status}`); this.status=status;
    this.code=body?.error?.code || 'HTTP_ERROR'; this.details=body?.error?.details; this.requestId=body?.requestId; }
}
export function createHkuplanClient({baseUrl='/api',fetchImpl=globalThis.fetch}={}) {
  const base=baseUrl.replace(/\/$/,'');
  async function call(path,{method='GET',body,signal}={}) {
    const response=await fetchImpl(base+path,{method,credentials:'include',signal,
      ...(body===undefined ? {} : {headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
    let result;
    try { result=await response.json(); }
    catch { throw new HkuplanApiError(response.status,{error:{code:'INVALID_RESPONSE',message:'The server did not return JSON.'}}); }
    if(!response.ok)throw new HkuplanApiError(response.status,result);
    return result;
  }
  const query=params=>new URLSearchParams(Object.entries(params).filter(([,value])=>value!==undefined)).toString();
  return {
    getTerms: options=>call('/terms',options),
    searchCourses: (params,options)=>call(`/courses?${query(params)}`,options),
    getCourse: (code,term,options)=>call(`/courses/${encodeURIComponent(code)}?${query({term})}`,options),
    generateSchedules: (body,options)=>call('/schedules/generate',{...options,method:'POST',body}),
    checkConflicts: (body,options)=>call('/schedules/conflicts',{...options,method:'POST',body}),
    startGuestSession: options=>call('/guest-session',{...options,method:'POST',body:{}}),
    listSchedules: options=>call('/schedules',options),
    saveSchedule: (body,options)=>call('/schedules',{...options,method:'POST',body}),
    getSchedule: (id,options)=>call(`/schedules/${encodeURIComponent(id)}`,options),
    updateSchedule: (id,body,options)=>call(`/schedules/${encodeURIComponent(id)}`,{...options,method:'PUT',body}),
    deleteSchedule: (id,options)=>call(`/schedules/${encodeURIComponent(id)}`,{...options,method:'DELETE'}),
  };
}
