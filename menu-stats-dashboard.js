import {cairoDay,dayMs,sections,visitsPath} from './menu-stats-shared.js?v=1';

const $=selector=>document.querySelector(selector);
const number=new Intl.NumberFormat('ar-EG');
const date=new Intl.DateTimeFormat('ar-EG',{timeZone:'Africa/Cairo',weekday:'short',day:'numeric',month:'short'});
let revision=0;

function chart(target,rows){
  const max=Math.max(1,...rows.map(row=>row.count));
  target.replaceChildren(...rows.map(({label,count})=>{
    const row=document.createElement('li');
    row.className='stats-row';
    const title=document.createElement('span');
    title.textContent=label;
    const track=document.createElement('span');
    track.className='stats-track';
    track.setAttribute('aria-hidden','true');
    const bar=document.createElement('span');
    bar.className='stats-fill';
    bar.style.inlineSize=(100*count/max)+'%';
    track.append(bar);
    const value=document.createElement('strong');
    value.textContent=number.format(count);
    row.append(title,track,value);
    return row;
  }));
}
export function clearMenuStats(){
  revision++;
  $('#stats-visitor-chart').replaceChildren();
  $('#stats-section-chart').replaceChildren();
  $('#stats-summary').hidden=true;
  $('#stats-total').textContent='';
  $('#stats-status').textContent='';
}
export async function loadMenuStats(fs,db){
  clearMenuStats();
  const current=revision;
  const range=$('#stats-range').value==='1'?1:7;
  const today=cairoDay();
  const days=Array.from({length:range},(_,i)=>today-range+1+i);
  const status=$('#stats-status');
  status.textContent='جاري تحميل الإحصاءات…';
  const count=async query=>(await fs.getCountFromServer(query)).data().count;
  try{
    const daily=await Promise.all(days.map(async day=>{
      const visits=fs.collection(db,...visitsPath(day));
      const [total,...categories]=await Promise.all([
        count(visits),
        ...sections.map(([key])=>count(fs.query(visits,fs.where('sections.'+key,'==',true))))
      ]);
      return {day,total,categories};
    }));
    if(current!==revision)return;
    const total=daily.reduce((sum,day)=>sum+day.total,0);
    $('#stats-total').textContent=number.format(total);
    $('#stats-summary').hidden=false;
    chart($('#stats-visitor-chart'),daily.map(day=>({label:date.format(day.day*dayMs),count:day.total})));
    const categories=sections.map(([,label],index)=>({
      label,count:daily.reduce((sum,day)=>sum+day.categories[index],0)
    })).sort((a,b)=>b.count-a.count);
    chart($('#stats-section-chart'),categories);
    status.textContent=total===0?'لسه مفيش زيارات مسجّلة في الفترة دي.':'';
  }catch{
    if(current===revision)status.textContent='تعذر تحميل الإحصاءات. جرّب تحديثها مرة تانية.';
  }
}
