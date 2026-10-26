(function(root){
'use strict';
const PEOPLE=['Alex','María','Papá','Mamá','A. Paco','A. Guille'],CODES=['M','T','N','L','V','F','HE','T/V'];
const pad=n=>String(n).padStart(2,'0'),key=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const date=s=>new Date(Number(s.slice(0,4)),Number(s.slice(5,7))-1,Number(s.slice(8,10)),12);
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&key(date(s))===s;
const time=s=>typeof s==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const label={M:'Mañana',T:'Tarde',N:'Noche',L:'Libre',V:'Vacaciones',F:'Festivo',HE:'Horas extras','T/V':'Tarde + Vacaciones'};
function defaults(person,day,code){
 if(['L','V','F','HE','T/V'].includes(code))return {start:'',end:''};
 if(person==='Alex')return {M:{start:'06:00',end:'14:30'},T:{start:'14:00',end:'22:30'},N:{start:'22:00',end:'06:30'}}[code];
 if(code==='M')return {start:'09:00',end:'15:00'};
 if(code==='T')return {start:[5,6].includes(date(day).getDay())?'15:00':'14:30',end:'21:00'};
 return {start:'22:00',end:'06:30'};
}
function initial(now=new Date()){
 const demoShifts={};
 if(!root.ALEX_CALENDAR_2026)['M','T','N','L','V','M'].forEach((code,i)=>{const d=key(new Date(now.getFullYear(),now.getMonth(),i+1,12));demoShifts[d]={code,...defaults('Alex',d,code),demo:true};});
 return withAnnual({schemaVersion:1,events:[],overrides:{Alex:{},'María':{}},demoShifts,preferences:{editor:'Alex',filters:[...PEOPLE],theme:'light'}});
}
function withAnnual(state){const imported=root.ALEX_CALENDAR_2026;if(!imported)return state;const saved=state.annualCalendars?.Alex?.[String(imported.year)];if(saved?.revision===imported.revision)return state;return {...state,annualCalendars:{...state.annualCalendars,Alex:{...state.annualCalendars?.Alex,[String(imported.year)]:imported}}};}
function shift(state,person,day){
 if(state.overrides[person]?.[day])return {...state.overrides[person][day],source:'Modificado'};
 if(person==='Alex'){const annual=state.annualCalendars?.Alex?.[day.slice(0,4)]||root.ALEX_CALENDAR_2026;if(annual?.entries?.[day])return {...annual.entries[day],source:'Shifter 2026'};if(root.ALEX_CALENDAR_2026||state.annualCalendars?.Alex)return {code:null,source:'Sin cargar'};return state.demoShifts[day]?{...state.demoShifts[day],source:'Demostración'}:{code:null,source:'Sin cargar'};}
 if(person!=='María')return null;
 const weekday=date(day).getDay();if(weekday===6)return {code:null,source:'Por confirmar'};
 const code=weekday===0?'L':'T';return {code,...defaults(person,day,code),source:'Habitual'};
}
function shiftCode(s){return s?.secondaryCode?`${s.code}/${s.secondaryCode}`:s?.code;}
function shiftLabel(s){return s?.secondaryCode?`${label[s.code]} + ${label[s.secondaryCode]}`:label[s?.code]||s?.source||'Sin cargar';}
function hours(s){if(!s?.code)return s?.source||'Sin cargar';if(s.partial)return 'Tarde + Vacaciones · horario parcial por confirmar';if(['L','V'].includes(s.code))return 'Sin trabajo';if(s.code==='F')return 'Sin turno de trabajo indicado';if(s.code==='HE'&&!s.start)return 'Horario de horas extras por confirmar';return `${s.start}–${s.end}${s.end<=s.start?' · termina al día siguiente':''}`;}
function monthCells(y,m){const first=new Date(y,m,1,12),offset=(first.getDay()+6)%7,days=new Date(y,m+1,0).getDate();return Array.from({length:Math.ceil((offset+days)/7)*7},(_,i)=>new Date(y,m,1-offset+i,12));}
function saveShift(state,person,day,code,start,end,editor){
 if(!['Alex','María'].includes(person)||!validDate(day)||!CODES.includes(code)||!PEOPLE.includes(editor))throw Error('Turno no válido');
 const combined=code==='T/V',off=['L','V','F'].includes(code)||combined,pendingExtra=code==='HE'&&!start&&!end;if(!off&&!pendingExtra&&(!time(start)||!time(end)||start===end))throw Error('Revisa el horario');
 state.overrides[person][day]={code:combined?'T':code,start:off?'':start,end:off?'':end,modifiedBy:editor,modifiedAt:new Date().toISOString(),demo:false,...(combined?{secondaryCode:'V',partial:true,note:'Tarde y vacaciones marcadas en el mismo día. Horario parcial por confirmar.'}:{})};
}
function saveEvent(state,input,editor){
 if(typeof input.title!=='string'||!input.title.trim()||input.title.trim().length>100||!validDate(input.day)||!PEOPLE.includes(editor)||![...PEOPLE,'Familia'].includes(input.person)||input.time&&!time(input.time)||!Number.isInteger(input.reminder)||input.reminder<0||input.reminder>43200)throw Error('Revisa los datos del evento');
 const existing=state.events.find(e=>e.id===input.id),now=new Date().toISOString();
 const category=input.category||existing?.category||'nota';if(!['medico','cita','celebracion','comida','ocio','nota','viaje','familiar','otro'].includes(category))throw Error('Categoría no válida');
 const event={category,id:existing?.id||`ev-${Date.now()}-${Math.random().toString(36).slice(2)}`,title:input.title.trim(),day:input.day,time:input.time||'',person:input.person,description:(input.description||'').slice(0,2000),reminder:input.reminder,createdBy:existing?.createdBy||editor,createdAt:existing?.createdAt||now,modifiedBy:editor,modifiedAt:now};
 if(existing)state.events[state.events.indexOf(existing)]=event;else state.events.push(event);return event;
}
function deleteEvent(state,id){state.events=state.events.filter(e=>e.id!==id);}
function visibleEvents(state,day,filters){return state.events.filter(e=>e.day===day&&((filters.length>0&&e.person==='Familia')||filters.includes(e.person))).sort((a,b)=>(a.time||'').localeCompare(b.time||''));}
function monthEvents(state,year,month,filters){const prefix=`${year}-${pad(month+1)}-`;return state.events.filter(e=>e.day.startsWith(prefix)&&((filters.length>0&&e.person==='Familia')||filters.includes(e.person))).sort((a,b)=>a.day.localeCompare(b.day)||(a.time||'').localeCompare(b.time||'')||a.title.localeCompare(b.title,'es'));}
function validate(s){
 if(!s||s.schemaVersion!==1||!Array.isArray(s.events)||!s.overrides||!s.demoShifts||!s.preferences)throw Error('Copia no compatible');
 if(!PEOPLE.includes(s.preferences.editor)||!Array.isArray(s.preferences.filters)||s.preferences.filters.some(p=>!PEOPLE.includes(p))||!['light','dark'].includes(s.preferences.theme))throw Error('Preferencias no válidas');
 const ids=new Set();for(const e of s.events){if(typeof e.id!=='string'||ids.has(e.id)||typeof e.description!=='string'||typeof e.createdAt!=='string'||typeof e.modifiedAt!=='string'||!PEOPLE.includes(e.createdBy)||!PEOPLE.includes(e.modifiedBy))throw Error('Evento no válido');ids.add(e.id);saveEvent({events:[]},e,e.createdBy);}
 for(const p of ['Alex','María']){if(!s.overrides[p]||typeof s.overrides[p]!=='object'||Array.isArray(s.overrides[p]))throw Error('Turnos no válidos');for(const [d,v]of Object.entries(s.overrides[p])){if(v.secondaryCode&&(v.code!=='T'||v.secondaryCode!=='V'||v.partial!==true))throw Error('Turno combinado no válido');saveShift({overrides:{[p]:{}}},p,d,shiftCode(v),v.start,v.end,v.modifiedBy);}}
 if(s.annualCalendars){if(!s.annualCalendars.Alex||typeof s.annualCalendars.Alex!=='object')throw Error('Calendario anual no válido');for(const[y,annual]of Object.entries(s.annualCalendars.Alex)){if(!/^\d{4}$/.test(y)||annual.year!==Number(y)||typeof annual.revision!=='string'||!annual.entries)throw Error('Calendario anual no válido');for(const[d,v]of Object.entries(annual.entries)){if(!validDate(d)||!d.startsWith(y+'-')||!CODES.includes(v.code)||v.demo!==false)throw Error('Día anual no válido');if(v.secondaryCode){if(v.code!=='T'||v.secondaryCode!=='V'||v.partial!==true)throw Error('Turno combinado no válido');}else if(['M','T','N'].includes(v.code)&&(!time(v.start)||!time(v.end)))throw Error('Horario anual no válido');else if(v.code==='HE'&&(v.start||v.end)&&(!time(v.start)||!time(v.end)))throw Error('Horas extras no válidas');}}}
 for(const[d,v]of Object.entries(s.demoShifts)){if(!validDate(d)||!CODES.includes(v.code)||v.demo!==true||(!['L','V'].includes(v.code)&&(!time(v.start)||!time(v.end))))throw Error('Demostración no válida');}
 return s;
}
root.FamilyModel={PEOPLE,CODES,label,key,date,validDate,initial,withAnnual,defaults,shift,shiftCode,shiftLabel,hours,monthCells,saveShift,saveEvent,deleteEvent,visibleEvents,monthEvents,validate};
if(typeof module!=='undefined')module.exports=root.FamilyModel;
})(globalThis);
