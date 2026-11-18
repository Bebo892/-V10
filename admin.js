import {firebaseConfig, firebaseReady, adminLoginEmail, adminUsername} from './firebase-config.js';

const $ = s=>document.querySelector(s);
const show=(selector,value)=>{$(selector).hidden=!value;};
const CATEGORY_NAMES={
  'hot-drinks':'المشروبات الساخنة',
  'cold-drinks':'العصائر والمشروبات الباردة',
  'dessert-cups':'الكاسات والديسيرت',
  'mixed-plates':'أطباق متنوعة',
  'specials':'الأصناف المميزة'
};
const categories=Object.keys(CATEGORY_NAMES);
let firebaseAuth=null, authSdk=null, fs=null, db=null, unsub=null;
let products=[], fromServer=false, currentCategory=categories[0], currentEditId=null, stagedImage=null, editorCatalogTime=null;
let busy=false, showingAdmin=false, sessionId=null, catalogTime=null;
const MAX_ITEMS=400;
let notificationTimer;
function notify(message,error=false){
  const el=$('#message');el.textContent=message;el.classList.toggle('error',error);el.hidden=false;
  clearTimeout(notificationTimer);notificationTimer=setTimeout(()=>el.hidden=true,6000);
}
function setStatus(message){$('#cloud-status').textContent=message;}
function setBusy(value){busy=value;$('#save-product').disabled=value;$('#seed-button').disabled=value;$('#add-product').disabled=value||!fromServer;}
function safeProduct(p){return p&&typeof p.id==='string'&&/^[\w-]{1,70}$/.test(p.id)&&categories.includes(p.category)&&typeof p.ar==='string'&&p.ar.trim().length>0;}
function normalizeProduct(p,index){
  return { id:p.id, category:p.category, ar:String(p.ar||''), en:String(p.en||p.ar),
    price:p.price===null||p.price===''?null:Number(p.price),
    descriptionAr:String(p.descriptionAr||''),descriptionEn:String(p.descriptionEn||''),
    ingredientsAr:Array.isArray(p.ingredientsAr)?p.ingredientsAr:[],
    ingredientsEn:Array.isArray(p.ingredientsEn)?p.ingredientsEn:[],
    image:p.imageSource==='asset'&&p.image?String(p.image):'',
    imageSource:p.imageSource==='firestore'?'firestore':p.imageSource==='asset'?'asset':'none',
    hasImage:p.hasImage===true||Boolean(p.image), active:p.active!==false,
    order:Number.isFinite(p.order)?p.order:index,
    code:String(p.code||''), origin:String(p.origin||'admin'),photoVersion:Number(p.photoVersion||0)
  };
}
async function loadBundledCatalog(){
  const r=await fetch('./menu-products.json',{cache:'no-store'});
  if(!r.ok)throw new Error('menu-products.json missing');
  const data=await r.json();
  if(!Array.isArray(data)||!data.length||data.some(p=>!safeProduct(p)))throw new Error('Invalid source catalog');
  return data.map(normalizeProduct);
}
let localCatalog=[];
function mini(tag,text,className){const e=document.createElement(tag);e.textContent=text;e.className=className||'';return e;}
function money(price){return Number.isFinite(price)&&price>0?`${price} جنيه`:'السعر غير محدد';}
function updateCategoryTabs(){
  const tabs=$('#category-tabs');tabs.replaceChildren();
  for(const id of categories){
    const count=products.filter(p=>p.category===id).length;
    const button=document.createElement('button');button.type='button';button.className='category-tab';
    button.classList.toggle('is-active',currentCategory===id);
    button.setAttribute('aria-pressed',currentCategory===id?'true':'false');
    button.append(mini('span',CATEGORY_NAMES[id]),mini('span',`${count} صنف`,'tab-count'));
    button.addEventListener('click',()=>{currentCategory=id;renderItems();});tabs.append(button);
  }
  const active=tabs.querySelector('.is-active');
  if(active&&tabs.scrollWidth>tabs.clientWidth){
    const bounds=tabs.getBoundingClientRect(), target=active.getBoundingClientRect();
    if(target.left<bounds.left||target.right>bounds.right){
      tabs.scrollBy({left:(target.left+target.right-bounds.left-bounds.right)/2,
        behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    }
  }
}
function renderItems(){
  $('#count').textContent=products.length;
  const query=$('#product-search').value.trim().toLocaleLowerCase();
  const found=products.filter(p=>p.category===currentCategory && (`${p.ar} ${p.en} ${p.code}`.toLocaleLowerCase().includes(query)))
    .sort((a,b)=>(a.order||0)-(b.order||0));
  const list=$('#items');list.replaceChildren();show('#empty-items',found.length===0);
  for(const p of found){
    const row=document.createElement('div');row.className='item';row.classList.toggle('is-hidden-product',!p.active);
    const photo=mini('div',p.imageSource==='firestore'?'📷':p.image?'':'—','item-photo');
    if(p.imageSource==='asset' && p.image){const img=document.createElement('img');img.src=p.image;img.alt='';img.loading='lazy';photo.append(img);}
    const info=document.createElement('div');
    info.append(mini('div',p.ar,'item-name'));
    const line=document.createElement('div');line.className='item-meta';
    line.append(mini('span',p.en||p.ar),mini('span',p.active?'ظاهر':'مخفي'));
    if(p.code)line.append(mini('span',`كود ${p.code}`));
    info.append(line);
    const actions=document.createElement('div');actions.className='item-controls';
    actions.append(mini('span',money(p.price),'item-price-label'));
    const edit=mini('button','تعديل');edit.type='button';edit.disabled=!fromServer;edit.addEventListener('click',()=>openEditor(p));
    const hide=mini('button',p.active?'إخفاء':'إظهار');hide.type='button';hide.disabled=!fromServer;hide.addEventListener('click',()=>toggleVisible(p));
    const del=mini('button','حذف','delete');del.type='button';del.disabled=!fromServer;del.addEventListener('click',()=>removeProduct(p));
    actions.append(edit,hide,del);
    row.append(photo,info,actions);list.append(row);
  }
  updateCategoryTabs();
}
function applyCatalog(serverProducts, updatedAt){
  if(!Array.isArray(serverProducts))return;
  products=serverProducts.filter(safeProduct).map(normalizeProduct);
  catalogTime=updatedAt;
  fromServer=true;show('#import-banner',false);
  $('#add-product').disabled=false;
  setStatus('القائمة متصلة بـ Firebase. أي تغيير تحفظه بيظهر على منيو الزبائن.');
  renderItems();
}
function parseIngredients(raw){return raw.split(/[,،\n]/).map(x=>x.trim()).filter(Boolean).slice(0,15);}
function openEditor(item){
  if(!fromServer||busy)return;
  currentEditId=item?.id||null;stagedImage=null;editorCatalogTime=catalogTime;
  $('#product-form').reset();
  $('#editor-title').textContent=item?'تعديل الصنف':'إضافة صنف جديد';
  $('#edit-category').value=item?.category||currentCategory;
  $('#edit-ar').value=item?.ar||'';$('#edit-en').value=item?.en||'';
  $('#edit-price').value=Number.isFinite(item?.price)?item.price:'';
  $('#edit-desc-ar').value=item?.descriptionAr||'';
  $('#edit-desc-en').value=item?.descriptionEn||'';
  $('#edit-ingredients-ar').value=(item?.ingredientsAr||[]).join('، ');
  $('#edit-ingredients-en').value=(item?.ingredientsEn||[]).join(', ');
  $('#edit-active').checked=item?.active!==false;
  $('#edit-remove-image').checked=false;
  const src=item?.imageSource==='asset'?item.image:null;
  showPreview(src);
  if(item?.imageSource==='firestore' && item.hasImage && fs && db){
    fs.getDoc(fs.doc(db,'menuImages',item.id)).then(snap=>{
      if(currentEditId===item.id && !stagedImage && snap.exists() && !$('#edit-remove-image').checked)showPreview(snap.data().dataUrl);
    }).catch(()=>{});
  }
  updateDescriptionFields();
  $('#product-dialog').showModal();
  $('#edit-ar').focus();
}
function closeEditor(){if(!busy)$('#product-dialog').close();}
function updateDescriptionFields(){
  const isDetails=['mixed-plates','specials'].includes($('#edit-category').value);
  show('#description-fields',isDetails);
}
function showPreview(src){const container=$('#photo-preview');container.hidden=!src;
  if(src)$('#photo-preview-img').src=src;else $('#photo-preview-img').removeAttribute('src');}
function isPhotoData(text){return typeof text==='string' && /^data:image\/(webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(text) && text.length<100000;}
async function shrinkImage(file){
  if(!file||!file.type.startsWith('image/'))throw new Error('اختار صورة PNG أو JPG أو WebP.');
  if(file.size>12*1024*1024)throw new Error('الصورة الأصلية أكبر من 12MB؛ اختار صورة أصغر.');
  const url=URL.createObjectURL(file);let img;
  try { img=await new Promise((resolve,reject)=>{const picture=new Image();picture.onload=()=>resolve(picture);picture.onerror=()=>reject(new Error('تعذر فتح الصورة. جرّب JPG أو PNG.'));picture.src=url;});}
  finally {URL.revokeObjectURL(url);}
  const ratio=Math.min(1,880/img.width,750/img.height);
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*ratio));canvas.height=Math.max(1,Math.round(img.height*ratio));
  const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  let best='';
  for(const q of [.78,.64,.49,.34,.24]){
    let data=canvas.toDataURL('image/webp',q);
    if(!data.startsWith('data:image/webp'))data=canvas.toDataURL('image/jpeg',q);
    best=data;if(isPhotoData(data) && data.length<85000) return data;
  }
  throw new Error('الصورة كبيرة بعد الضغط. جرّب صورة أبسط أو قصّها الأول.');
}
function approximateLocation(){
  return new Promise((resolve,reject)=>{
    const unavailable=()=>reject(new Error('اسمح بمشاركة الموقع من إعدادات المتصفح والجهاز وحاول مرة أخرى.'));
    if(!navigator.geolocation){unavailable();return;}
    navigator.geolocation.getCurrentPosition(({coords})=>{
      resolve({lat100:Math.round(coords.latitude*100),lng100:Math.round(coords.longitude*100)});
    },unavailable,{enableHighAccuracy:false,timeout:10000,maximumAge:0});
  });
}
function auditEvent(type, details={}){
  return {type,actorUid:firebaseAuth.currentUser.uid,actorEmail:firebaseAuth.currentUser.email,sessionId,createdAt:fs.serverTimestamp(),...details};
}
async function login(identifier,password){
  const email=identifier.toLowerCase()===adminUsername.toLowerCase()?adminLoginEmail:identifier;
  if(!email.includes('@'))throw new Error('اكتب admin أو البريد الإلكتروني لحسابك.');
  const location=await approximateLocation();
  const {user}=await authSdk.signInWithEmailAndPassword(firebaseAuth,email,password);
  try{
    const role=await fs.getDocFromServer(fs.doc(db,'auditRoles',user.uid));
    if(role.data()?.role!=='staff')throw new Error('هذا الحساب ليس حساب موظف مصرح له.');
    sessionId=crypto.randomUUID();
    const token=await authSdk.getIdTokenResult(user);
    await fs.setDoc(fs.doc(db,'auditLogs',sessionId),auditEvent('login',{location,authTime:token.claims.auth_time}));
    await openDashboard(user);
  }catch(error){
    sessionId=null;
    await authSdk.signOut(firebaseAuth);
    throw error;
  }
}
async function saveCatalog(nextItems, type, productId, imageAction=null){
  if(busy||!fromServer||!showingAdmin)return;
  if(nextItems.length>MAX_ITEMS)throw new Error('وصلنا للحد الأقصى 400 صنف في النسخة دي');
  const items=nextItems.map(normalizeProduct);
  const expectedTime=catalogTime;
  const auditRef=fs.doc(fs.collection(db,'auditLogs'));
  const event=auditEvent(type,{productId,imageAction:imageAction?.type||'none'});
  setBusy(true);
  try{
    const ref=fs.doc(db,'menu','catalog');
    await fs.runTransaction(db,async transaction=>{
      const snapshot=await transaction.get(ref);
      if(!expectedTime?.isEqual(snapshot.data()?.updatedAt)){
        throw new Error('موظف آخر عدّل المنيو. افتح الصنف من جديد قبل الحفظ.');
      }
      transaction.set(ref,{products:items,version:10,updatedAt:fs.serverTimestamp(),auditId:auditRef.id});
      transaction.set(auditRef,event);
      if(imageAction){
        const imageRef=fs.doc(db,'menuImages',productId);
        if(imageAction.type==='put')transaction.set(imageRef,{dataUrl:imageAction.dataUrl,updatedAt:fs.serverTimestamp()});
        else transaction.delete(imageRef);
      }
    });
    notify('تم حفظ التعديلات بنجاح.');
  }catch(e){notify('الحفظ لم يتم: '+(e.message||e.code),true);throw e;}
  finally{setBusy(false);}
}
async function saveProduct(event){
  event.preventDefault();if(busy||!fromServer)return;
  const ar=$('#edit-ar').value.trim(), en=$('#edit-en').value.trim()||ar;
  const cost=$('#edit-price').value.trim();const price=cost?Number(cost):null;
  if(!ar || ar.length>95 || (cost&&(!Number.isFinite(price)||price<=0||price>100000)))return notify('راجع الاسم والسعر.',true);
  if(!editorCatalogTime?.isEqual(catalogTime))return notify('المنيو اتحدّث. افتح الصنف من جديد قبل الحفظ.',true);
  const original=products.find(p=>p.id===currentEditId);
  const id=original?.id||`custom-${crypto.randomUUID()}`;
  const imageAction=stagedImage?{type:'put',id,dataUrl:stagedImage}:original?.imageSource==='firestore'&&$('#edit-remove-image').checked?{type:'delete',id}:null;
  let image=original?.image||'',imageSource=original?.imageSource||'none',hasImage=original?.hasImage||false;
  if(stagedImage){image='';imageSource='firestore';hasImage=true;}
  else if($('#edit-remove-image').checked){image='';imageSource='none';hasImage=false;}
  const newItem={
    ...original,id,category:$('#edit-category').value,ar,en,price,
    descriptionAr:$('#edit-desc-ar').value.trim(),descriptionEn:$('#edit-desc-en').value.trim(),
    ingredientsAr:parseIngredients($('#edit-ingredients-ar').value),ingredientsEn:parseIngredients($('#edit-ingredients-en').value),
    active:$('#edit-active').checked,image,imageSource,hasImage,
    photoVersion:stagedImage||$('#edit-remove-image').checked?Date.now():(original?.photoVersion||0),
    order:original?.order??Math.max(0,...products.map(p=>p.order||0))+1,
    code:original?.code||'',origin:original?.origin||'admin'
  };
  const next=original?products.map(p=>p.id===id?newItem:p):[...products,newItem];
  try{await saveCatalog(next,original?'product_edit':'product_add',id,imageAction);$('#product-dialog').close();currentCategory=newItem.category;renderItems();}
  catch(e){}
}
async function toggleVisible(p){if(busy)return;try{await saveCatalog(products.map(x=>x.id===p.id?{...x,active:!x.active}:x),p.active?'product_hide':'product_show',p.id);}catch(e){}}
async function removeProduct(p){
  if(busy||!window.confirm(`هل تريد حذف «${p.ar}» نهائيًا؟ ممكن تستخدم إخفاء بدل الحذف.`))return;
  const action=p.imageSource==='firestore'?{type:'delete',id:p.id}:null;
  try{await saveCatalog(products.filter(x=>x.id!==p.id),'product_delete',p.id,action);}catch(e){}
}
function backup(){const data=new Blob([JSON.stringify({version:10,createdAt:new Date().toISOString(),products},null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(data);const a=document.createElement('a');a.href=url;a.download='halaweyat-masr-menu-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
async function init(){
  try{localCatalog=await loadBundledCatalog();products=localCatalog;renderItems();}
  catch(e){show('#loading',false);show('#setup',true);$('#setup-message').textContent='ملف menu-products.json غير موجود أو غير صحيح';return;}
  if(!firebaseReady){show('#loading',false);show('#setup',true);return;}
  try{
    const [app,authentication,firestore]=await Promise.all([
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js')
    ]);
    authSdk=authentication;fs=firestore;
    const instance=app.initializeApp(firebaseConfig,'staff-admin-panel');
    firebaseAuth=authentication.initializeAuth(instance,{persistence:authentication.inMemoryPersistence});
    db=firestore.getFirestore(instance);
    authentication.onAuthStateChanged(firebaseAuth,user=>{
      if(user)return;
      unsub?.();unsub=null;
      showingAdmin=false;sessionId=null;fromServer=false;catalogTime=null;
      if($('#product-dialog').open)$('#product-dialog').close();
      show('#loading',false);show('#login-panel',true);show('#dashboard',false);show('#logout',false);
    });
  }catch(e){console.error(e);show('#loading',false);show('#setup',true);$('#setup-message').textContent='تعذر تحميل Firebase. افتح الموقع على HTTPS وراجع الإنترنت.';}
}
function openDashboard(user){
  if(firebaseAuth.currentUser!==user)throw new Error('الجلسة انتهت. سجل الدخول من جديد.');
  showingAdmin=true;
  show('#login-panel',false);show('#dashboard',true);show('#logout',true);
  setStatus('جاري قراءة بيانات المنيو من Firebase…');
  unsub=fs.onSnapshot(fs.doc(db,'menu','catalog'),{includeMetadataChanges:true},snapshot=>{
    if(snapshot.metadata.fromCache||snapshot.metadata.hasPendingWrites)return;
    const data=snapshot.data();
    if(Array.isArray(data?.products)){
      if(!catalogTime?.isEqual(data.updatedAt))applyCatalog(data.products,data.updatedAt);
    }else if(!snapshot.exists()){
      products=[...localCatalog];fromServer=false;show('#import-banner',true);$('#add-product').disabled=true;
      setStatus('المنيو السحابي فارغ. اضغط نشر أصناف الشيت مرة واحدة.');renderItems();
    }
  },()=>{setStatus('تعذر قراءة المنيو السحابي.');});
}
$('#login-form').addEventListener('submit',async e=>{
  e.preventDefault();const btn=$('#login-button');btn.disabled=true;btn.textContent='جاري الدخول…';
  try{await login($('#staff-login').value.trim(),$('#password').value);}
  catch(error){notify(error.code?'تعذر تسجيل الدخول. راجع بيانات الحساب وإعدادات الاتصال.':error.message,true);}
  finally{$('#password').value='';btn.disabled=false;btn.textContent='السماح بالموقع وتسجيل الدخول';}
});
$('#logout').addEventListener('click',async()=>{
  if(!showingAdmin||busy)return;
  showingAdmin=false;
  show('#dashboard',false);show('#logout',false);
  let timeout;
  try{
    await Promise.race([
      fs.addDoc(fs.collection(db,'auditLogs'),auditEvent('logout')),
      new Promise(resolve=>{timeout=setTimeout(resolve,3000);})
    ]);
  }catch(error){console.warn('Logout event could not be saved',error.code);}
  finally{
    clearTimeout(timeout);
    await authSdk.signOut(firebaseAuth).catch(()=>location.reload());
  }
});
$('#product-search').addEventListener('input',renderItems);
$('#add-product').addEventListener('click',()=>openEditor(null));
$('#close-dialog').addEventListener('click',closeEditor);
$('#cancel-edit').addEventListener('click',closeEditor);
$('#product-dialog').addEventListener('click',e=>{if(e.target===$('#product-dialog'))closeEditor();});
$('#edit-category').addEventListener('change',updateDescriptionFields);
$('#edit-remove-image').addEventListener('change',()=>{
  if($('#edit-remove-image').checked){stagedImage=null;$('#edit-image').value='';showPreview(null);}
});
$('#edit-image').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    setStatus('جاري ضغط الصورة قبل الحفظ…');
    stagedImage=await shrinkImage(file);
    $('#edit-remove-image').checked=false;showPreview(stagedImage);
    setStatus('الصورة جاهزة للحفظ. حجمها المضغوط: '+Math.ceil(stagedImage.length/1024)+' KB');
  }catch(error){stagedImage=null;e.target.value='';notify(error.message,true);}
});
$('#product-form').addEventListener('submit',saveProduct);
$('#export-backup').addEventListener('click',backup);
$('#seed-button').addEventListener('click',async()=>{
  if(busy||!showingAdmin||fromServer||!confirm(`نشر ${localCatalog.length} صنف من شيت الأسعار على Firebase؟`))return;
  setBusy(true);$('#seed-button').textContent='جاري النشر…';
  try{
    const ref=fs.doc(db,'menu','catalog');
    const auditRef=fs.doc(fs.collection(db,'auditLogs'));
    const event=auditEvent('catalog_seed');
    await fs.runTransaction(db,async transaction=>{
      const snap=await transaction.get(ref);
      if(snap.exists())throw new Error('القائمة موجودة بالفعل؛ لن يتم استبدال بيانات الأدمن');
      transaction.set(ref,{products:localCatalog,version:10,updatedAt:fs.serverTimestamp(),auditId:auditRef.id});
      transaction.set(auditRef,event);
    });
    notify('تم نشر أصناف الشيت بنجاح. ظهرت الآن في المنيو السحابي.');
  }catch(e){notify('تعذر نشر الأصناف: '+(e.code||e.message),true);}
  finally{setBusy(false);$('#seed-button').textContent='نشر أصناف الشيت لأول مرة';}
});
// Browsers may restore a previous admin page without reloading it (back/forward cache).
// Hide the old view and end the memory-only session before showing the page again.
window.addEventListener('pageshow',event=>{
  if(event.persisted){
    show('#dashboard',false);
    show('#loading',true);
    if(authSdk && firebaseAuth){authSdk.signOut(firebaseAuth).catch(()=>location.reload());}
    else location.reload();
  }
});
init();
