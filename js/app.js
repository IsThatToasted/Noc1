const cfg = window.NOC_CONFIG;
const db = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
let products = [];
let cart = JSON.parse(localStorage.getItem('noc_cart') || '[]');
const $ = (s) => document.querySelector(s);
const money = (n) => `$${Number(n || 0).toFixed(2)}`;
function setTheme(theme){document.body.className = `theme-${theme}`; localStorage.setItem('noc_theme', theme);} 
function saveCart(){localStorage.setItem('noc_cart', JSON.stringify(cart)); renderCart();}
async function loadProducts(){
  const {data, error} = await db.from('products').select('*').eq('status','active').order('featured',{ascending:false}).order('created_at',{ascending:false});
  if(error){ $('#productGrid').innerHTML = `<p class="muted">Add Supabase config in js/config.js, then reload.</p>`; return; }
  products = data || []; renderCategories(); renderProducts();
}
function renderCategories(){
  const cats = [...new Set(products.map(p=>p.category).filter(Boolean))].sort();
  $('#categoryFilter').innerHTML = '<option value="">All categories</option>' + cats.map(c=>`<option>${c}</option>`).join('');
}
function renderProducts(){
  const q = $('#searchInput').value.toLowerCase(); const cat = $('#categoryFilter').value;
  const filtered = products.filter(p => (!cat || p.category === cat) && [p.name,p.description,p.category].join(' ').toLowerCase().includes(q));
  $('#emptyProducts').classList.toggle('hidden', filtered.length !== 0);
  $('#productGrid').innerHTML = filtered.map(p => `<article class="product-card">
    <img src="${p.image_url || 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=900&q=80'}" alt="${p.name}">
    <p class="eyebrow">${p.category || 'Noctaire'}</p><h3>${p.name}</h3><p class="muted">${p.description || ''}</p>
    <p class="price">${money(p.price)}</p><button onclick="addToCart('${p.id}')">Add to cart</button>
  </article>`).join('');
}
function addToCart(id){ const item = cart.find(i=>i.id===id); item ? item.qty++ : cart.push({id, qty:1}); saveCart(); }
window.addToCart = addToCart;
function changeQty(id, delta){ const item = cart.find(i=>i.id===id); if(!item) return; item.qty += delta; if(item.qty<=0) cart = cart.filter(i=>i.id!==id); saveCart(); }
window.changeQty = changeQty;
function renderCart(){
  $('#cartCount').textContent = cart.reduce((a,i)=>a+i.qty,0);
  const rows = cart.map(i=>({ ...i, product: products.find(p=>p.id===i.id) })).filter(i=>i.product);
  $('#cartItems').innerHTML = rows.length ? rows.map(i=>`<div class="cart-row"><span>${i.product.name} × ${i.qty}</span><strong>${money(i.product.price*i.qty)}</strong><span><button class="ghost" onclick="changeQty('${i.id}',-1)">−</button> <button class="ghost" onclick="changeQty('${i.id}',1)">+</button></span></div>`).join('') : '<p class="muted">Your cart is empty.</p>';
  $('#cartTotal').textContent = money(rows.reduce((a,i)=>a+(i.product.price*i.qty),0));
}
async function submitOrder(e){
  e.preventDefault(); $('#orderStatus').textContent = 'Submitting order...';
  const rows = cart.map(i=>({ ...i, product: products.find(p=>p.id===i.id) })).filter(i=>i.product);
  if(!rows.length){ $('#orderStatus').textContent = 'Add at least one product first.'; return; }
  const customer = Object.fromEntries(new FormData(e.target));
  const order = { customer, items: rows.map(i=>({ product_id:i.id, name:i.product.name, price:i.product.price, qty:i.qty })), total: rows.reduce((a,i)=>a+(i.product.price*i.qty),0) };
  const res = await fetch(cfg.CREATE_ORDER_FUNCTION_URL, { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${cfg.SUPABASE_ANON_KEY}`}, body:JSON.stringify(order) });
  if(!res.ok){ $('#orderStatus').textContent = 'Order failed. Check Supabase Edge Function setup.'; return; }
  cart=[]; saveCart(); e.target.reset(); $('#orderStatus').textContent = 'Order submitted. Confirmation has been sent to the shop owner.';
}
document.addEventListener('DOMContentLoaded',()=>{ $('#year').textContent = new Date().getFullYear(); const t=localStorage.getItem('noc_theme')||'noctaire'; $('#themeSelect').value=t; setTheme(t); $('#themeSelect').addEventListener('change',e=>setTheme(e.target.value)); $('#searchInput').addEventListener('input',renderProducts); $('#categoryFilter').addEventListener('change',renderProducts); $('#orderForm').addEventListener('submit',submitOrder); loadProducts().then(renderCart); });
