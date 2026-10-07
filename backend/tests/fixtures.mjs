export const term = '2026-27 Sem 1';
export const meeting = (day=1,start=600,end=650,extra={}) => ({ day,start,end,startDate:'2026-09-01',endDate:'2026-11-30',venue:'Test room',...extra });
export const course = (code,sections) => ({ code,title:code,credits:null,creditsKnown:false,sections });
export const section = (id,meetings=[],extra={}) => ({ id,type:'CLASS',parent:null,meetings,tba:[],seatsLeft:null,...extra });
export const courses = [course('COMP3322',[section('1A',[meeting()]),section('1B',[meeting(2)])]),
  course('COMP3230',[section('1A',[meeting(3)]),section('1B',[meeting(4)])])];
