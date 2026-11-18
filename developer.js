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
function renderEntry(data){
  const card=item('article','','dev-entry');
  const row=item('div','','dev-line');
  const date=data.createdAt?.toDate?.();
  row.append(item('span',eventNames.get(data.type)||'نشاط إداري','dev-pill'),
    item('time',date?.toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'})||'—'));
  card.append(row,item('h3',data.actorEmail||data.actorUid||'حساب إدارة'));
  card.append(item('p','معرّف الحساب: '+(data.actorUid||'—')));
  if(typeof data.productId==='string')card.append(item('p','معرّف الصنف: '+data.productId));
  if(typeof data.sessionId==='string')card.append(item('p','الجلسة: '+data.sessionId));
  const {lat100,lng100}=data.location||{};
  if(Number.isInteger(lat100)&&Number.isInteger(lng100)){
    card.append(item('p','الموقع التقريبي: '+(lat100/100).toFixed(2)+', '+(lng100/100).toFixed(2)));
  }
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
    $('#dev-entries').replaceChildren(...snapshot.docs.map(doc=>renderEntry(doc.data())));
    $('#dev-count').textContent='عدد الأحداث المعروضة: '+snapshot.size;
    show('#dev-empty',snapshot.empty);
    message('سجل نشاط الإدارة');
  }catch(error){
    if(id!==requestNumber)return;
    if(error.code==='permission-denied'){
      await logout('هذا الحساب غير مصرح له بقراءة السجل.',true);
      return;
    }
    message('تعذر تحميل السجل. راجع الاتصال وحاول مرة أخرى.',true);
  }
}
async function logout(text='سجّل الدخول بحساب المالك.',error=false){
  clearOwner();
  try{
    await sdk.signOut(auth);
    show('#dev-login',true);
    message(text,error);
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
    auth=sdk.initializeAuth(instance,{persistence:sdk.inMemoryPersistence});
    db=fs.getFirestore(instance);
    sdk.onAuthStateChanged(auth,user=>{if(!user)clearOwner();});
    show('#dev-login',true);
    message('سجّل الدخول بحساب المالك.');
  }catch{message('تعذر الاتصال الآمن. راجع إعدادات Firebase.',true);}
}
$('#dev-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const button=$('#dev-login-button');
  button.disabled=true;
  try{
    const {user}=await sdk.signInWithEmailAndPassword(auth,$('#dev-email').value.trim(),$('#dev-password').value);
    const role=await fs.getDocFromServer(fs.doc(db,'auditRoles',user.uid));
    if(role.data()?.role!=='owner'||auth.currentUser!==user){
      await logout('هذا الحساب غير مصرح له بقراءة السجل.',true);
      return;
    }
    owner=user;
    show('#dev-login',false);
    show('#dev-dashboard',true);
    show('#dev-logout',true);
    void refreshStats();
    await loadEvents();
  }catch{
    await logout('تعذر تسجيل الدخول. راجع بيانات الحساب وإعدادات الاتصال.',true);
  }finally{
    $('#dev-password').value='';
    button.disabled=false;
  }
});
$('#dev-logout').addEventListener('click',()=>logout());
$('#dev-refresh').addEventListener('click',loadEvents);
function refreshStats(){
  if(owner&&auth.currentUser===owner)return loadMenuStats(fs,db);
}
$('#stats-range').addEventListener('change',refreshStats);
$('#stats-refresh').addEventListener('click',refreshStats);
$('#dev-reset-password').addEventListener('click',async event=>{
  const email=$('#dev-email');
  if(!email.reportValidity())return;
  const button=event.currentTarget;
  button.disabled=true;
  const sent='لو البريد مرتبط بحساب، هيوصلك رابط لتعيين كلمة المرور.';
  try{
    await sdk.sendPasswordResetEmail(auth,email.value.trim());
    message(sent);
  }catch(error){
    if(error.code==='auth/user-not-found')message(sent);
    else message('تعذر إرسال الرابط. حاول مرة أخرى بعد قليل.',true);
  }finally{
    button.disabled=false;
  }
});
window.addEventListener('pagehide',clearOwner);
window.addEventListener('pageshow',event=>{if(event.persisted&&auth)logout();});
start();
