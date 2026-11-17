/** Halaweyat Masr V10 — single-admin Firestore catalogue manager.
 * The admin password is NEVER part of the site files. */
import {firebaseConfig, adminReady, adminUid, adminLoginEmail, adminUsername} from './firebase-config.js';

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
let products=[], fromServer=false, currentCategory=categories[0], currentEditId=null, stagedImage=null;
let busy=false, showingAdmin=false;
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
    button.addEventListener('click',()=>{currentCategory=id;updateCategoryTabs();renderItems();});tabs.append(button);
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
function applyCatalog(serverProducts){
  if(!Array.isArray(serverProducts))return;
  products=serverProducts.filter(safeProduct).map(normalizeProduct);
  fromServer=true;show('#import-banner',false);
  $('#add-product').disabled=false;
  setStatus('القائمة متصلة بـ Firebase. أي تغيير تحفظه بيظهر على منيو الزبائن.');
  renderItems();
}
function parseIngredients(raw){return raw.split(/[,،\n]/).map(x=>x.trim()).filter(Boolean).slice(0,15);}
function openEditor(item){
  if(!fromServer||busy)return;
  currentEditId=item?.id||null;stagedImage=null;
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
async function login(username,password){
  if(username!==adminUsername)throw new Error('بيانات الدخول غير صحيحة');
  await authSdk.signInWithEmailAndPassword(firebaseAuth,adminLoginEmail,password);
}
async function saveCatalog(nextItems, imageAction=null){
  if(busy||!fromServer||!firebaseAuth?.currentUser||firebaseAuth.currentUser.uid!==adminUid)throw new Error('صلاحية الإدارة غير متاحة');
  if(nextItems.length>MAX_ITEMS)throw new Error('وصلنا للحد الأقصى 400 صنف في النسخة دي');
  const items=nextItems.map(normalizeProduct);
  setBusy(true);
  try {
    const batch=fs.writeBatch(db);
    const ref=fs.doc(db,'menu','catalog');
    batch.set(ref,{products:items,version:10,updatedAt:fs.serverTimestamp()});
    if(imageAction){
      const imageRef=fs.doc(db,'menuImages',imageAction.id);
      if(imageAction.type==='put')batch.set(imageRef,{dataUrl:imageAction.dataUrl,updatedAt:fs.serverTimestamp()});
      if(imageAction.type==='delete')batch.delete(imageRef);
    }
    await batch.commit();
    products=items;
    renderItems();
    notify('تم الحفظ في Firebase. التغيير هيظهر للزبائن تلقائيًا.');
  }catch(e){console.error(e);notify('الحفظ لم يتم: '+(e.code||e.message||'راجع الاتصال وقواعد Firestore'),true);throw e;}
  finally{setBusy(false);}
}
async function saveProduct(event){
  event.preventDefault();if(busy||!fromServer)return;
  const ar=$('#edit-ar').value.trim(), en=$('#edit-en').value.trim()||ar;
  const cost=$('#edit-price').value.trim();const price=cost?Number(cost):null;
  if(!ar || ar.length>95 || (cost&&(!Number.isFinite(price)||price<=0||price>100000)))return notify('راجع الاسم والسعر.',true);
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
  try{await saveCatalog(next,imageAction);$('#product-dialog').close();currentCategory=newItem.category;renderItems();}
  catch(e){}
}
async function toggleVisible(p){if(busy)return;try{await saveCatalog(products.map(x=>x.id===p.id?{...x,active:!x.active}:x));}catch(e){}}
async function removeProduct(p){
  if(busy||!window.confirm(`هل تريد حذف «${p.ar}» نهائيًا؟ ممكن تستخدم إخفاء بدل الحذف.`))return;
  const action=p.imageSource==='firestore'?{type:'delete',id:p.id}:null;
  try{await saveCatalog(products.filter(x=>x.id!==p.id),action);}catch(e){}
}
function backup(){const data=new Blob([JSON.stringify({version:10,createdAt:new Date().toISOString(),products},null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(data);const a=document.createElement('a');a.href=url;a.download='halaweyat-masr-menu-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
async function init(){
  try{localCatalog=await loadBundledCatalog();products=localCatalog;renderItems();}
  catch(e){show('#loading',false);show('#setup',true);$('#setup-message').textContent='ملف menu-products.json غير موجود أو غير صحيح';return;}
  if(!adminReady){show('#loading',false);show('#setup',true);return;}
  try{
    const [app,authentication,firestore]=await Promise.all([
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js')
    ]);
    authSdk=authentication;fs=firestore;
    const instance=app.getApps().length?app.getApp():app.initializeApp(firebaseConfig);
    firebaseAuth=authentication.getAuth(instance);db=firestore.getFirestore(instance);
    try{await authentication.setPersistence(firebaseAuth,authentication.browserLocalPersistence);}catch(e){console.warn('Local auth persistence unavailable',e);}
    authentication.onAuthStateChanged(firebaseAuth,user=>{
      if(unsub){unsub();unsub=null;}
      show('#loading',false);
      const isAdmin=Boolean(user&&user.uid===adminUid);
      showingAdmin=isAdmin;show('#login-panel',!isAdmin && !user);show('#dashboard',isAdmin);show('#logout',Boolean(user));
      if(user && !isAdmin){show('#login-panel',false);notify('هذا الحساب ليس حساب الأدمن المصرح له. سجل الخروج.',true);return;}
      if(!isAdmin)return;
      setStatus('جاري قراءة بيانات المنيو من Firebase…');
      unsub=firestore.onSnapshot(firestore.doc(db,'menu','catalog'),snapshot=>{
        if(snapshot.exists() && Array.isArray(snapshot.data().products))applyCatalog(snapshot.data().products);
        else{
          products=[...localCatalog];fromServer=false;show('#import-banner',true);$('#add-product').disabled=true;
          setStatus('المنيو السحابي فارغ. اضغط نشر أصناف الشيت مرة واحدة.');renderItems();
        }
      },e=>{console.error(e);setStatus('تعذر قراءة المنيو السحابي. تأكد من نشر Firestore Rules الخاصة بـ V10.');notify('خطأ في قاعدة البيانات: '+(e.code||e.message),true);});
    });
  }catch(e){console.error(e);show('#loading',false);show('#setup',true);$('#setup-message').textContent='تعذر تحميل Firebase. افتح الموقع على HTTPS وراجع الإنترنت.';}
}
$('#login-form').addEventListener('submit',async e=>{
  e.preventDefault();const btn=$('#login-button');btn.disabled=true;btn.textContent='جاري الدخول…';
  try{await login($('#username').value.trim(),$('#password').value);$('#password').value='';}
  catch(error){notify('اسم المستخدم أو كلمة المرور غير صحيحة، أو تسجيل الدخول محظور للدومين الحالي.',true);}
  finally{btn.disabled=false;btn.textContent='تسجيل الدخول';}
});
$('#logout').addEventListener('click',()=>authSdk?.signOut(firebaseAuth));
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
    await fs.runTransaction(db,async transaction=>{
      const snap=await transaction.get(ref);
      if(snap.exists())throw new Error('القائمة موجودة بالفعل؛ لن يتم استبدال بيانات الأدمن');
      transaction.set(ref,{products:localCatalog,version:10,updatedAt:fs.serverTimestamp()});
    });
    notify('تم نشر أصناف الشيت بنجاح. ظهرت الآن في المنيو السحابي.');
  }catch(e){notify('تعذر نشر الأصناف: '+(e.code||e.message),true);}
  finally{setBusy(false);$('#seed-button').textContent='نشر أصناف الشيت لأول مرة';}
});
init();
