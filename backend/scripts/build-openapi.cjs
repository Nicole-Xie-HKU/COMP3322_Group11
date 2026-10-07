const fs=require('node:fs');
process.chdir(require('node:path').resolve(__dirname,'..'));
const object=(properties,required=Object.keys(properties),extra={})=>({type:'object',properties,...(required.length ? {required} : {}),additionalProperties:false,...extra});
const string={type:'string'}, number={type:'number'}, integer={type:'integer'}, boolean={type:'boolean'};
const nullable=schema=>({...schema,nullable:true}), array=items=>({type:'array',items}), ref=name=>({$ref:`#/components/schemas/${name}`});
const date={type:'string',format:'date'}, minute={type:'integer',minimum:0,maximum:1440};
const term={type:'string',pattern:'^\\d{4}-\\d{2}(?:-S[12U]| Sem [12]| Sum Sem)$'};
const key={type:'string',pattern:'^[A-Za-z0-9_-]{1,20}:[A-Za-z0-9_-]{1,20}$'};
const schemas={};
schemas.Error=object({error:object({code:string,message:string,details:{}},['code','message']),requestId:string});
schemas.Term=object({id:string,name:string,startDate:date,endDate:date});
schemas.Meeting=object({day:{type:'integer',minimum:1,maximum:7},start:minute,end:minute,startDate:nullable(date),endDate:nullable(date),venue:nullable(string)});
schemas.TbaMeeting=object({startDate:nullable(date),endDate:nullable(date),venue:nullable(string)});
schemas.Section=object({id:string,type:{type:'string',enum:['CLASS','LEC','TUT','LAB','SEM','OTH']},parent:nullable(string),classNumber:nullable(integer),
  instructor:nullable(string),instructors:array(string),campus:nullable(string),seatsLeft:nullable(integer),
  waitlist:nullable(object({open:boolean,count:nullable(integer)})),meetings:array(ref('Meeting')),tba:array(ref('TbaMeeting'))});
schemas.Course=object({code:string,title:string,dept:nullable(string),career:nullable(string),credits:nullable(number),creditsKnown:boolean,sections:array(ref('Section'))});
schemas.CourseSummary=object({code:string,title:string,dept:nullable(string),career:nullable(string),credits:nullable(number),sectionCount:integer});
schemas.SelectedSection=object({...schemas.Section.properties,courseCode:string,courseTitle:string,credits:nullable(number),creditsKnown:boolean,
  seat:{type:'string',enum:['unknown','open','waitlist','full']},alternatives:array(string)},[...schemas.Section.required,'courseCode','courseTitle','credits','seat','alternatives']);
schemas.Block=object({day:{type:'integer',minimum:1,maximum:7},start:minute,end:minute,label:{type:'string',maxLength:100},hard:boolean},['day','start','end']);
schemas.Preferences=object({noMorningBefore:minute,noEveningAfter:minute,avoidDays:{...array({type:'integer',minimum:1,maximum:7}),maxItems:7},
  preferFreeDays:boolean,minimizeGaps:boolean,lunchBreak:object({from:minute,to:minute,minutes:minute}),
  weights:object(Object.fromEntries(['morning','freeDay','avoidDay','lunch','gapHour','lateEvening','softBlocked']
    .map(name=>[name,{type:'number',minimum:0,maximum:100}])),[])},[]);
schemas.GenerationRequest=object({term,courseCodes:{...array({type:'string',pattern:'^[A-Za-z0-9_-]{1,20}$'}),minItems:1,maxItems:12},
  blocked:{...array(ref('Block')),maxItems:32},locked:{type:'object',maxProperties:12,additionalProperties:{oneOf:[string,
    object(Object.fromEntries(['CLASS','LEC','TUT','LAB','SEM','OTH'].map(type=>[type,string])),[])]}},
  excluded:{...array(key),maxItems:72},seatPolicy:{type:'string',enum:['ignore','allowWaitlist','openOnly']},prefs:ref('Preferences'),
  includeUnknownTimes:{type:'boolean',default:false},
  maxResults:{type:'integer',minimum:1,maximum:100,default:100},cursor:{type:'string',maxLength:8192}},['term','courseCodes']);
schemas.Schedule=object({fullyVerified:boolean,unknownSectionKeys:array(key),id:string,sections:array(ref('SelectedSection')),credits:nullable(number),score:number,breakdown:array(object({pts:number,why:string}))},['id','sections','credits','fullyVerified','unknownSectionKeys']);
schemas.GenerationResult=object({term:string,totalCredits:nullable(number),knownCredits:number,creditsKnown:boolean,warnings:array(string),
  skipped:array(object({course:string,reason:string})),hasUnknownTimes:boolean,schedules:array(ref('Schedule')),total:integer,totalExact:boolean,
  returnedCount:integer,searchComplete:boolean,truncated:boolean,nextCursor:nullable(string),catalogRevision:integer,
  rankingScope:{type:'string',enum:['none','page']},diagnosis:array(object({message:string},['message'],{additionalProperties:true}))},
  ['term','totalCredits','warnings','schedules','total','totalExact','returnedCount','searchComplete','truncated','nextCursor','catalogRevision','rankingScope']);
schemas.Selection=object({term,sectionKeys:{...array(key),minItems:1,maxItems:72,uniqueItems:true},blocked:{...array(ref('Block')),maxItems:32}},['term','sectionKeys']);
schemas.SaveRequest=object({...schemas.Selection.properties,name:{type:'string',minLength:1,maxLength:100}},['term','sectionKeys','name']);
schemas.UpdateRequest=object(schemas.SaveRequest.properties,[],{minProperties:1});
schemas.SavedSummary=object({id:integer,term:string,name:string,sectionKeys:array(key),blocked:array(ref('Block')),createdAt:string,updatedAt:string});
schemas.SavedResult=object({...schemas.SavedSummary.properties,schedule:ref('Schedule'),warnings:array(string)});
schemas.ConflictResult=object({term:string,conflicts:array(object({a:string,b:string,blocked:string,hard:boolean,internal:boolean},['a'])),warnings:array(string),fullyVerified:boolean});
const response=(schema,description='Success')=>({description,content:{'application/json':{schema}}});
const errors=Object.fromEntries([400,401,403,404,409,413,429,500,503].map(code=>[code,response(ref('Error'),'Explicit error response')]));
const parameter=(name,location,schema,required=true)=>({name,in:location,required,schema});
const body=schema=>({required:true,content:{'application/json':{schema}}});
function operation(id,summary,schema,{parameters,request,status=200,session=false}={}) {
  return {operationId:id,summary,security:session?[{guestCookie:[]}]:[],...(parameters?{parameters}:{}),...(request?{requestBody:body(request)}:{}),
    responses:{[status]:response(schema),...errors}};
}
const scheduleId=[parameter('id','path',{type:'integer',minimum:1})];
const paths={
 '/health':{get:operation('health','Merged frontend database health alias',object({status:string}))},
 '/health/live':{get:operation('liveness','Process health',object({status:string}))},
 '/health/ready':{get:operation('readiness','Database and schema readiness',object({status:string}))},
 '/terms':{get:operation('getTerms','List terms',array(ref('Term')))},
 '/courses':{get:operation('searchCourses','Search within one term',array(ref('CourseSummary')),{parameters:[parameter('term','query',term),parameter('q','query',{type:'string',maxLength:100,default:''},false),parameter('limit','query',{type:'integer',minimum:1,maximum:100,default:30},false)]})},
 '/courses/{code}':{get:operation('getCourse','Course details with flat v3 sections',ref('Course'),{parameters:[parameter('code','path',string),parameter('term','query',term)]})},
 '/schedules/conflicts':{post:operation('checkConflicts','Check server-loaded section keys',ref('ConflictResult'),{request:ref('Selection')})},
 '/schedules/generate':{post:operation('generateSchedules','One resumable page; total is exact only when totalExact is true',ref('GenerationResult'),{request:ref('GenerationRequest')})},
 '/guest-session':{post:operation('startGuestSession','Set private HttpOnly guest cookie; reuse valid session with 200',object({expiresAt:string}),{request:object({}),status:201})},
 '/schedules':{get:operation('listSchedules','List owned schedule summaries',array(ref('SavedSummary')),{session:true}),post:operation('saveSchedule','Validate and save a selection',ref('SavedResult'),{request:ref('SaveRequest'),status:201,session:true})},
 '/schedules/{id}':{get:operation('getSchedule','Reconstruct an owned schedule; stale data returns 409',ref('SavedResult'),{parameters:scheduleId,session:true}),
  put:operation('updateSchedule','Update an owned selection or name',ref('SavedResult'),{parameters:scheduleId,request:ref('UpdateRequest'),session:true}),
  delete:operation('deleteSchedule','Delete an owned schedule',object({deleted:boolean}),{parameters:scheduleId,session:true})},
};
paths['/guest-session'].post.responses[200]=response(object({expiresAt:string}),'Existing valid session');
paths['/guest-session'].post.responses[201].headers={'Set-Cookie':{schema:string,description:'hkuplan_guest; HttpOnly; SameSite=Lax; Secure in production'}};
const spec={openapi:'3.0.3',info:{title:'HKUPlan integrated backend API',version:'0.1.0',description:'Local repair based on main 0ca56ef. Legacy term labels are returned; canonical short aliases are accepted. All times use Asia/Hong_Kong wall time. Unknown-time sections require explicit provisional opt-in.'},
  servers:[{url:'http://localhost:3001/api',description:'Default local port and prefix; both configurable'}],paths,
  components:{securitySchemes:{guestCookie:{type:'apiKey',in:'cookie',name:'hkuplan_guest'}},schemas}};
fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/openapi.json',JSON.stringify(spec,null,2)+'\n');
