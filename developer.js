import {firebaseConfig,firebaseReady} from './firebase-config.js';

// After creating a SEPARATE developer/owner account in Firebase Auth,
// set its UID here and publish the matching firestore.rules.
const DEVELOPER_UID = 'REPLACE_WITH_DEVELOPER_AUTH_UID';
const $ = s=>document.querySelector(s);
const show=(s,on)=>{$(s).hidden=!on;};
const initialized = firebaseReady && DEVELOPER_UID !== 'REPLACE_WITH_DEVELOPER_AUTH_UID';
let authSdk,auth,fs,db;
function message(t,isError=false){const el=$('#dev-message');el.textContent=t;el.style.background=isError?'#ffe8ed':'#f5eef9';}
function readableTime(value){
  try{return value?.toDate()?.toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'})||'لم يحدد الوقت بعد';}
  catch{return '—';}
}
const names={
  login:'تسجيل دخول الإدارة',logout:'تسجيل خروج',
  catalog_update:'تعديل في المنيو',catalog_seed:'تهيئة قائمة الأصناف'
};
function item(tag,text,className=''){
  const node=document.createElement(tag);node.textContent=String(text??'');node.className=className;return node;
}
function renderEntry(data){
  const card=item('article','','dev-entry');
  const row=item('div','','dev-line');
  row.append(item('span',names[data.type]||'نشاط إداري','dev-pill'));
  const time=item('time',readableTime(data.createdAt));
  row.append(time);card.append(row);
  const title=data.operatorName||data.actorEmail||'حساب إدارة';
  card.append(item('h3',title));
  if(data.description)card.append(item('p',data.description));
  if(data.productId)card.append(item('p','كود الصنف: '+data.productId));
  const session=data.sessionId?' | جلسة: '+data.sessionId.slice(0,8):'';
  card.append(item('p','الحساب: '+(data.actorEmail||'—')+session));
  let location='لم تتم الموافقة على مشاركة الموقع';
  if(data.locationPermission==='granted' && Number.isFinite(data.latitude)&&Number.isFinite(data.longitude))
    location='الموقع التقريبي: '+data.latitude.toFixed(2)+', '+data.longitude.toFixed(2);
  else if(data.locationPermission==='unavailable')
    location='الموقع غير متاح من هذا الجهاز';
  card.append(item('p',location));
  if(data.userAgent)card.append(item('p','الجهاز/المتصفح: '+data.userAgent,'device'));
  return card;
}
async function loadEvents(){
  if(!auth?.currentUser||auth.currentUser.uid!==DEVELOPER_UID)return;
  message('جاري تحميل سجل النشاط…');
  try{
    const query=fs.query(fs.collection(db,'auditLogs'),fs.orderBy('createdAt','desc'),fs.limit(100));
    const snapshot=await fs.getDocs(query);
    const list=$('#dev-entries');list.replaceChildren();
    snapshot.docs.forEach(doc=>list.append(renderEntry(doc.data())));
    $('#dev-count').textContent='آخر '+snapshot.size+' حدث (الحد الأقصى 100)';
    show('#dev-empty',snapshot.empty);
    message('السجل متاح لحساب Developer فقط.');
  }catch(err){console.error('Developer audit read failed',err);message('تعذر قراءة السجل. تأكد من نشر قواعد الحماية وربط UID المالك.',true);}
}
async function start(){
  if(!firebaseReady){message('إعدادات الاتصال غير مكتملة.',true);return;}
  if(!initialized){message('صفحة Developer جاهزة، لكن يجب تفعيل حساب المالك المنفصل وربط UID قبل استخدامها.',true);show('#dev-login',false);return;}
  try{
    const [app,a,firestore]=await Promise.all([
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js')
    ]);
    authSdk=a;fs=firestore;
    const instance=app.initializeApp(firebaseConfig,'developer-owner-panel');
    auth=a.getAuth(instance);db=firestore.getFirestore(instance);
    await a.setPersistence(auth,a.inMemoryPersistence);
    await a.signOut(auth);
    show('#dev-login',true);message('سجل الدخول والتعديلات محمي بحساب المالك.');
    a.onAuthStateChanged(auth,user=>{
      const valid=!!user&&user.uid===DEVELOPER_UID;
      show('#dev-login',!valid);show('#dev-dashboard',valid);show('#dev-logout',valid);
      if(user&&!valid){a.signOut(auth);message('هذا الحساب غير مصرح له بقراءة السجل.',true);}
      else if(valid)loadEvents();
    });
  }catch(err){console.error(err);message('تعذر الاتصال الآمن. راجع إعدادات Firebase.',true);}
}
$('#dev-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const button=$('#dev-login-button');button.disabled=true;
  try{
    await authSdk.signInWithEmailAndPassword(auth,$('#dev-email').value.trim(),$('#dev-password').value);
    $('#dev-password').value='';
  }catch(err){message('بيانات الحساب غير صحيحة أو الحساب غير مصرح له.',true);}
  finally{button.disabled=false;}
});
$('#dev-logout').addEventListener('click',()=>authSdk?.signOut(auth));
$('#dev-refresh').addEventListener('click',loadEvents);
window.addEventListener('pageshow',event=>{if(event.persisted&&authSdk&&auth)authSdk.signOut(auth);});
start();
