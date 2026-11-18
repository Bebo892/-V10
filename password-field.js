for(const button of document.querySelectorAll('[data-password-toggle]')){
  const password=document.getElementById(button.getAttribute('aria-controls'));
  if(!(password instanceof HTMLInputElement)||password.type!=='password')continue;

  function setVisible(visible){
    password.type=visible?'text':'password';
    const action=visible?'إخفاء':'إظهار';
    button.textContent=action;
    button.setAttribute('aria-label',action+' كلمة المرور');
  }
  button.addEventListener('click',()=>setVisible(password.type==='password'));
  password.form?.addEventListener('submit',()=>setVisible(false));
  password.form?.addEventListener('reset',()=>setVisible(false));
  window.addEventListener('pagehide',()=>setVisible(false));
  button.hidden=false;
}
