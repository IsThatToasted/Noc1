const cfg = window.NOC_CONFIG;
const db = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
const $ = (s) => document.querySelector(s);
const money = (n) => `$${Number(n || 0).toFixed(2)}`;
let session = null;
async function checkSession(){
  const res = await db.auth.getSession(); session = res.data.session;
  $('#loginPanel').classList.toggle('hidden', !!session); $('#adminPanel').classList.toggle('hidden', !session); $('#signOutBtn').classList.toggle('hidden', !session);
  if(session){ await loadProducts(); await loadOrders(); }
}
$('#loginForm').addEventListener('submit', async (e)=>{
  e.preventDefault(); $('#loginStatus').textContent='Signing in...';
  const {email,password}=Object.fromEntries(new FormData(e.target));
  const {error}=await db.auth.signInWithPassword({email,password});
  if(error){ $('#loginStatus').textContent=error.message; return; }
  $('#loginStatus').textContent=''; checkSession();
});
$('#signOutBtn').addEventListener('click', async()=>{ await db.auth.signOut(); checkSession(); });
$('#resetFormBtn').addEventListener('click', ()=>{ $('#productForm').reset(); $('#productForm [name=id]').value=''; });
$('#productForm').addEventListener('submit', async(e)=>{
  e.preventDefault(); const f=Object.fromEntries(new FormData(e.target));
  const payload={name:f.name, price:Number(f.price), category:f.category, status:f.status, image_url:f.image_url, featured:f.featured==='true', description:f.description};
  const query = f.id ? db.from('products').update(payload).eq('id',f.id) : db.from('products').insert(payload);
  const {error}=await query; if(error){ alert(error.message); return; }
  e.target.reset(); await loadProducts();
});
async function loadProducts(){
  const {data,error}=await db.from('products').select('*').order('created_at',{ascending:false});
  if(error){ $('#adminProducts').innerHTML=`<p class="muted">${error.message}</p>`; return; }
  $('#adminProducts').innerHTML=(data||[]).map(p=>`<div class="admin-row"><div><strong>${p.name}</strong><p class="muted">${money(p.price)} · ${p.category||'Uncategorized'} · ${p.status}</p></div><div class="admin-actions"><button class="ghost" onclick='editProduct(${JSON.stringify(p)})'>Edit</button><button class="ghost" onclick="deleteProduct('${p.id}')">Delete</button></div></div>`).join('') || '<p class="muted">No products yet.</p>';
}
window.editProduct=(p)=>{ const form=$('#productForm'); Object.entries(p).forEach(([k,v])=>{ if(form.elements[k]) form.elements[k].value = v ?? ''; }); form.elements.featured.value = String(!!p.featured); scrollTo({top:0,behavior:'smooth'}); };
window.deleteProduct=async(id)=>{ if(!confirm('Delete this product?')) return; const {error}=await db.from('products').delete().eq('id',id); if(error) alert(error.message); loadProducts(); };
async function loadOrders(){
  const {data,error}=await db.from('orders').select('*').order('created_at',{ascending:false}).limit(25);
  if(error){ $('#ordersList').innerHTML=`<p class="muted">${error.message}</p>`; return; }
  $('#ordersList').innerHTML=(data||[]).map(o=>`<div class="admin-row"><div><strong>${o.customer_name || 'Customer'} · ${money(o.total)}</strong><p class="muted">${o.customer_email || ''} · ${new Date(o.created_at).toLocaleString()}</p><p>${(o.items||[]).map(i=>`${i.name} × ${i.qty}`).join(', ')}</p></div><span class="eyebrow">${o.status}</span></div>`).join('') || '<p class="muted">No orders yet.</p>';
}
db.auth.onAuthStateChange(checkSession); checkSession();
