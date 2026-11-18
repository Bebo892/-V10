export const sections=[
  ['hot-drinks','المشروبات الساخنة'],
  ['cold-drinks','العصائر والمشروبات الباردة'],
  ['dessert-cups','الكاسات والديسيرت'],
  ['mixed-plates','أطباق متنوعة'],
  ['specials','الأصناف المميزة']
];

export const dayMs=86400000;
const cairoDate=new Intl.DateTimeFormat('en-GB',{
  timeZone:'Africa/Cairo',year:'numeric',month:'numeric',day:'numeric'
});
export function cairoDay(date=new Date()){
  const parts=Object.fromEntries(cairoDate.formatToParts(date).map(part=>[part.type,part.value]));
  return Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day))/dayMs;
}
export const visitsPath=day=>['menuStats',String(day),'visitors'];
