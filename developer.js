import {firebaseConfig,firebaseReady} from './firebase-config.js';

import {clearMenuStats,loadMenuStats} from './menu-stats-dashboard.js?v=1';

const $=selector=>document.querySelector(selector);
const show=(selector,visible)=>{$(selector).hidden=!visible;};
let sdk,auth,fs,db,owner=null,requestNumber=0;
function message(text,error=false){
  const el=$('#dev-message');
  el.textContent=text;
  el.style.background=error?'#ffe8ed':'#f5eef9';
}
const eventNames=new Map([
  ['login','تسجيل دخول الإدارة'],['logout','تسجيل خروج الإدارة'],['catalog_seed','تهيئة قائمة الأصناف'],
  ['product_add','إضافة صنف'],['product_edit','تعديل صنف'],['product_hide','إخفاء صنف'],
  ['product_show','إظهار صنف'],['product_delete','حذف صنف']
]);
function item(tag,text,className=''){
  const node=document.createElement(tag);
  node.textContent=text;
  node.className=className;
  return node;
}
const categoryNames={
  'hot-drinks':'المشروبات الساخنة','cold-drinks':'العصائر والمشروبات الباردة',
  'dessert-cups':'الكاسات والديسيرت','mixed-plates':'أطباق متنوعة','specials':'الأصناف المميزة'
};
const fields=[
  ['ar','الاسم بالعربي'],['en','الاسم بالإنجليزي'],['price','السعر'],
  ['category','القسم'],['active','الظهور في المنيو'],
  ['descriptionAr','الوصف بالعربي'],['descriptionEn','الوصف بالإنجليزي'],
  ['ingredientsAr','المكونات بالعربي'],['ingredientsEn','المكونات بالإنجليزي']
];
function detailValue(key,value){
  if(value==null||value===''||(Array.isArray(value)&&!value.length))return '—';
  if(key==='price')return value+' جنيه';
  if(key==='category')return categoryNames[value]??String(value);
  if(key==='active')return value?'ظاهر':'مخفي';
  if(Array.isArray(value))return value.join('، ');
  return String(value);
}
function renderDetails(data){
  const block=item('section','','audit-details');
  block.append(item('h3','تفاصيل التعديل'));
  const details=data.details;
  if(!details){
    block.append(item('p',data.type==='catalog_seed'?'تم نشر القائمة الأولية.':'تفاصيل الحقول مش متاحة للتعديلات القديمة.'));
    return block;
  }
  const {before,after}=details;
  const title=after?.ar??before?.ar;
  if(title)block.append(item('p','الصنف: '+title,'audit-product-name'));
  const rows=item('dl','','audit-changes');
  for(const [key,label] of fields){
    const previous=detailValue(key,before?.[key]);
    const next=detailValue(key,after?.[key]);
    if(JSON.stringify(before?.[key])===JSON.stringify(after?.[key])||(previous==='—'&&next==='—'))continue;
    const row=item('div','');
    row.append(item('dt',label),item('dd',before&&after?'قبل: '+previous+' · بعد: '+next:after?next:previous));
    rows.append(row);
  }
  if(rows.childElementCount)block.append(rows);
  const hadImage=Boolean(before?.hasImage||before?.image);
  const hasImage=Boolean(after?.hasImage||after?.image);
  if(data.imageAction==='put'){
    block.append(item('p',hadImage?'تم استبدال صورة الصنف.':'تمت إضافة صورة للصنف.'));
  }else if(data.imageAction==='delete'||(hadImage&&!hasImage)){
    block.append(item('p','تمت إزالة صورة الصنف.'));
  }else if(!before&&hasImage){
    block.append(item('p','تمت إضافة الصنف بصورة.'));
  }else if(!rows.childElementCount){
    block.append(item('p','تم الحفظ من غير تغيير في الحقول المعروضة.'));
  }
  return block;
}
function renderEntry(data,location){
  const card=item('article','','dev-entry');
  const row=item('div','','dev-line');
  const date=data.createdAt?.toDate?.();
  row.append(item('span',eventNames.get(data.type)||'نشاط إداري','dev-pill'),
    item('time',date?.toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Cairo'})||'—'));
  card.append(row);
  if(data.type==='catalog_seed'||/^product_/.test(data.type))card.append(renderDetails(data));
  const {lat100,lng100}=location||{};
  const valid=Number.isInteger(lat100)&&Number.isInteger(lng100);
  card.append(item('p',valid?'مكان تسجيل الدخول التقريبي: '+(lat100/100).toFixed(2)+', '+(lng100/100).toFixed(2):'مكان تسجيل الدخول غير متاح.'));
  return card;
}
function clearEvents(){
  $('#dev-entries').replaceChildren();
  $('#dev-count').textContent='';
  show('#dev-empty',false);
}
function clearOwner(){
  owner=null;
  requestNumber++;
  clearEvents();
  clearMenuStats();
  show('#dev-dashboard',false);
  show('#dev-logout',false);
}
async function eventLocations(docs){
  const logins=new Map(docs.filter(doc=>doc.data().type==='login').map(doc=>[doc.id,Promise.resolve(doc.data())]));
  return Promise.all(docs.map(async doc=>{
    const event=doc.data();
    if(event.type==='login')return event.location;
    const session=event.sessionId;
    if(typeof session!=='string'||!session)return undefined;
    if(!logins.has(session)){
      logins.set(session,fs.getDocFromServer(fs.doc(db,'auditLogs',session))
        .then(snapshot=>snapshot.data()).catch(()=>undefined));
    }
    const login=await logins.get(session);
    if(login?.type==='login'&&login.actorUid===event.actorUid)return login.location;
  }));
}
async function loadEvents(){
  if(!owner||auth.currentUser!==owner)return;
  const id=++requestNumber;
  const user=owner;
  clearEvents();
  message('جاري تحميل سجل النشاط…');
  try{
    const query=fs.query(fs.collection(db,'auditLogs'),fs.orderBy('createdAt','desc'),fs.limit(100));
    const snapshot=await fs.getDocsFromServer(query);
    if(id!==requestNumber||auth.currentUser!==user)return;
    const locations=await eventLocations(snapshot.docs);
    if(id!==requestNumber||auth.currentUser!==user)return;
    $('#dev-entries').replaceChildren(...snapshot.docs.map((doc,index)=>renderEntry(doc.data(),locations[index])));
    $('#dev-count').textContent='عدد الأحداث المعروضة: '+snapshot.size;
    show('#dev-empty',snapshot.empty);
    message('سجل نشاط الإدارة');
  }catch(error){
    if(id!==requestNumber)return;
    if(error.code==='permission-denied'){
      await logout();
      return;
    }
    message('تعذر تحميل السجل. راجع الاتصال وحاول مرة أخرى.',true);
  }
}
async function logout(){
  clearOwner();
  try{
    await sdk.signOut(auth);
    location.replace('./admin.html');
  }catch{
    location.reload();
  }
}
async function start(){
  if(!firebaseReady){message('إعدادات الاتصال غير مكتملة.',true);return;}
  try{
    const [app,authentication,firestore]=await Promise.all([
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js')
    ]);
    sdk=authentication;
    fs=firestore;
    const instance=app.initializeApp(firebaseConfig,'developer-owner-panel');
    auth=sdk.initializeAuth(instance,{persistence:sdk.browserSessionPersistence});
    db=fs.getFirestore(instance);
    await auth.authStateReady();
    const user=auth.currentUser;
    if(!user){location.replace('./admin.html');return;}
    await sdk.setPersistence(auth,sdk.inMemoryPersistence);
    const role=await fs.getDocFromServer(fs.doc(db,'auditRoles',user.uid));
    if(role.data()?.role!=='owner'||auth.currentUser!==user){await logout();return;}
    owner=user;
    sdk.onAuthStateChanged(auth,current=>{
      if(!current&&owner){clearOwner();location.replace('./admin.html');}
    });
    show('#dev-dashboard',true);
    show('#dev-logout',true);
    void refreshStats();
    await loadEvents();
  }catch{message('تعذر الاتصال الآمن. راجع إعدادات Firebase.',true);}
}
$('#dev-logout').addEventListener('click',()=>logout());
$('#dev-refresh').addEventListener('click',loadEvents);
function refreshStats(){
  if(owner&&auth.currentUser===owner)return loadMenuStats(fs,db);
}
$('#stats-range').addEventListener('change',refreshStats);
$('#stats-refresh').addEventListener('click',refreshStats);
window.addEventListener('pagehide',clearOwner);
window.addEventListener('pageshow',event=>{if(event.persisted&&auth)logout();});
start();
