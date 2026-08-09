(function() {
  'use strict';

  /* ── Helpers ── */
  const $ = (s, p) => (p || document).querySelector(s);
  const $$ = (s, p) => [...(p || document).querySelectorAll(s)];
  const api = async (url, opts = {}) => {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...opts.headers },
      ...opts
    });
    return res.json();
  };

  /* ── Cart Count ── */
  async function updateCartBadge() {
    try {
      const data = await api('/cart/api');
      if (data && typeof data.count === 'number') {
        const badge = $('#cartBadge');
        const mBadge = $('#mobileCartBadge');
        if (badge) { badge.textContent = data.count; badge.style.display = data.count > 0 ? 'flex' : 'none'; }
        if (mBadge) { mBadge.textContent = data.count; mBadge.style.display = data.count > 0 ? 'inline' : 'none'; }
      }
    } catch {}
  }
  updateCartBadge();

  /* ── Mobile Menu ── */
  const toggle = $('#mobileToggle');
  const menu = $('#mobileMenu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      menu.classList.toggle('open');
      toggle.innerHTML = menu.classList.contains('open') ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
    });
  }

  /* ── Auth Forms ── */
  const loginForm = $('#loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = await api('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email: $('#email').value, password: $('#password').value })
      });
      if (data.error) $('#loginError').textContent = data.error;
      else window.location.href = '/';
    });
  }

  const signupForm = $('#signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = await api('/api/signup', {
        method: 'POST',
        body: JSON.stringify({ name: $('#name').value, email: $('#email').value, password: $('#password').value })
      });
      if (data.error) $('#signupError').textContent = data.error;
      else window.location.href = '/';
    });
  }

  /* ── Dropdown Toggle (works on all devices) ── */
  const dropdownToggle = $('#dropdownToggle');
  const dropdownMenu = $('#dropdownMenu');
  if (dropdownToggle && dropdownMenu) {
    dropdownToggle.addEventListener('click', (e) => {
      e.preventDefault();
      const isOpen = dropdownMenu.classList.contains('open');
      document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
      if (!isOpen) dropdownMenu.classList.add('open');
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#userDropdown')) {
        dropdownMenu.classList.remove('open');
      }
    });
  }

  /* ── Logout ── */
  function doLogout(e) {
    e.preventDefault();
    api('/api/logout', { method: 'POST' }).then(() => {
      window.location.href = '/';
    }).catch(() => {
      window.location.href = '/';
    });
  }
  const logoutBtn = $('#logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', doLogout);
  const mobileLogout = $('#mobileLogout');
  if (mobileLogout) mobileLogout.addEventListener('click', doLogout);

  /* ── Add to Cart ── */
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.add-cart-btn');
    if (!btn) return;
    const isLoggedIn = typeof userLoggedIn !== 'undefined' && userLoggedIn;
    if (!isLoggedIn) {
      window.location.href = '/login';
      return;
    }
    const productId = btn.dataset.productId;
    const qtyInput = btn.closest('.product-actions')?.querySelector('#quantity');
    const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
    const data = await api('/cart/api/add', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, quantity })
    });
    if (data.success) {
      updateCartBadge();
      btn.innerHTML = '<i class="fas fa-check"></i> Added!';
      setTimeout(() => { btn.innerHTML = '<i class="fas fa-shopping-bag"></i> Add to Cart'; }, 1500);
    }
  });

  /* ── Quantity Selectors ── */
  document.addEventListener('click', (e) => {
    const qtyBtn = e.target.closest('.qty-btn');
    if (!qtyBtn) return;
    const input = qtyBtn.parentElement.querySelector('input[type="number"]');
    if (!input) return;
    const val = parseInt(input.value) || 1;
    const max = parseInt(input.max) || 999;
    if (qtyBtn.textContent === '-' || qtyBtn.id === 'qtyMinus') {
      input.value = Math.max(1, val - 1);
    } else {
      input.value = Math.min(max, val + 1);
    }
    input.dispatchEvent(new Event('change'));
  });

  document.addEventListener('change', (e) => {
    if (e.target.matches('#quantity')) {
      const val = parseInt(e.target.value) || 1;
      const max = parseInt(e.target.max) || 999;
      e.target.value = Math.max(1, Math.min(max, val));
    }
  });

  /* ── Cart Page ── */
  $$('.cart-qty-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cartId = btn.dataset.cartId;
      const input = document.querySelector(`.cart-qty-input[data-cart-id="${cartId}"]`);
      const val = parseInt(input.value) || 1;
      const newVal = btn.dataset.action === 'plus'
        ? Math.min(99, val + 1)
        : Math.max(1, val - 1);
      input.value = newVal;
      await api(`/cart/api/update/${cartId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity: newVal })
      });
      window.location.reload();
    });
  });

  $$('.cart-qty-input').forEach(inp => {
    inp.addEventListener('change', async function() {
      const cartId = this.dataset.cartId;
      const val = Math.max(1, parseInt(this.value) || 1);
      this.value = val;
      await api(`/cart/api/update/${cartId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity: val })
      });
      window.location.reload();
    });
  });

  $$('.cart-remove').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cartId = btn.dataset.cartId;
      await api(`/cart/api/remove/${cartId}`, { method: 'DELETE' });
      updateCartBadge();
      window.location.reload();
    });
  });

  const clearBtn = $('#clearCartBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      const items = $$('.cart-item');
      for (const item of items) {
        const id = item.dataset.cartId;
        await api(`/cart/api/remove/${id}`, { method: 'DELETE' });
      }
      updateCartBadge();
      window.location.reload();
    });
  }

  /* ── Checkout ── */
  const placeOrderBtn = $('#placeOrderBtn');
  if (placeOrderBtn) {
    placeOrderBtn.addEventListener('click', async () => {
      const address = [$('#address')?.value, $('#city')?.value, $('#zip')?.value].filter(Boolean).join(', ');
      const paymentMethod = document.querySelector('input[name="payment"]:checked');
      const errorEl = $('#checkoutError');
      const successEl = $('#checkoutSuccess');
      errorEl.textContent = '';
      successEl.textContent = '';
      placeOrderBtn.disabled = true;
      placeOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

      const data = await api('/payment/api/create-payment-intent', {
        method: 'POST',
        body: JSON.stringify({ shipping_address: address })
      });

      if (data.error) {
        errorEl.textContent = data.error;
        placeOrderBtn.disabled = false;
        placeOrderBtn.innerHTML = '<i class="fas fa-lock"></i> Place Order';
      } else if (data.success || data.order_id) {
        successEl.innerHTML = `<i class="fas fa-check-circle"></i> Order placed! #${data.order_id}`;
        placeOrderBtn.innerHTML = '<i class="fas fa-check"></i> Order Placed!';
        setTimeout(() => { window.location.href = '/orders'; }, 1500);
      } else if (data.clientSecret) {
        successEl.innerHTML = '<i class="fas fa-check-circle"></i> Payment processed! Redirecting...';
        setTimeout(() => { window.location.href = '/orders'; }, 1500);
      }
    });
  }

  /* ── Chatbot ── */
  let chatSessionId = localStorage.getItem('chatSessionId') || '';
  const chatbotToggle = $('#chatbotToggle');
  const chatbotWidget = $('#chatbotWidget');
  const chatbotClose = $('#chatbotClose');
  const chatbotMessages = $('#chatbotMessages');
  const chatbotInput = $('#chatbotInput');
  const chatbotSend = $('#chatbotSend');

  if (chatbotToggle && chatbotWidget) {
    chatbotToggle.addEventListener('click', () => {
      chatbotWidget.classList.toggle('open');
      chatbotToggle.style.display = chatbotWidget.classList.contains('open') ? 'none' : 'flex';
    });

    if (chatbotClose) {
      chatbotClose.addEventListener('click', () => {
        chatbotWidget.classList.remove('open');
        chatbotToggle.style.display = 'flex';
      });
    }

    async function sendMessage() {
      const msg = chatbotInput.value.trim();
      if (!msg) return;
      chatbotInput.value = '';
      addMessage(msg, 'user');
      chatbotInput.disabled = true;
      chatbotSend.disabled = true;
      chatbotSend.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

      const data = await api('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: msg, session_id: chatSessionId })
      });

      if (data.session_id) {
        chatSessionId = data.session_id;
        localStorage.setItem('chatSessionId', chatSessionId);
      }
      addMessage(data.reply || 'Sorry, please try again.', 'bot');
      chatbotInput.disabled = false;
      chatbotSend.disabled = false;
      chatbotSend.innerHTML = '<i class="fas fa-paper-plane"></i>';
      chatbotInput.focus();
    }

    function addMessage(text, role) {
      const div = document.createElement('div');
      div.className = `message ${role}`;
      div.innerHTML = `<div class="message-content">${text}</div>`;
      chatbotMessages.appendChild(div);
      chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    chatbotSend?.addEventListener('click', sendMessage);
    chatbotInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });
  }

  /* ── Admin Tabs ── */
  $$('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.admin-tab').forEach(t => t.classList.remove('active'));
      $$('.admin-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = $(`#panel-${tab.dataset.tab}`);
      if (panel) panel.classList.add('active');
    });
  });

  /* ── Admin: Add Product ── */
  const addProductForm = $('#addProductForm');
  if (addProductForm) {
    addProductForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(addProductForm);
      const data = await api('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(fd))
      });
      if (data.success) window.location.reload();
    });
  }

  /* ── Admin: Delete Product ── */
  $$('.delete-product').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this product?')) return;
      await api(`/api/admin/products/${btn.dataset.id}`, { method: 'DELETE' });
      window.location.reload();
    });
  });

  /* ── Admin: Edit Product (Modal) ── */
  const editModal = $('#editModal');
  const editForm = $('#editProductForm');
  function openEditModal(btn) {
    $('#editId').value = btn.dataset.id;
    $('#editName').value = btn.dataset.name;
    $('#editPrice').value = btn.dataset.price;
    $('#editDesc').value = btn.dataset.desc;
    $('#editStock').value = btn.dataset.stock;
    if ($('#editCategory')) $('#editCategory').value = btn.dataset.category;
    if ($('#editFeatured')) $('#editFeatured').value = btn.dataset.featured || '0';
    if (editModal) editModal.style.display = 'flex';
  }
  function closeEditModal() { if (editModal) editModal.style.display = 'none'; }
  $$('.edit-product').forEach(btn => { btn.addEventListener('click', () => openEditModal(btn)); });
  if ($('#editModalClose')) $('#editModalClose').addEventListener('click', closeEditModal);
  if ($('#editCancelBtn')) $('#editCancelBtn').addEventListener('click', closeEditModal);
  if (editModal) editModal.addEventListener('click', (e) => { if (e.target === editModal) closeEditModal(); });
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = $('#editId').value;
      const data = await api(`/api/admin/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: $('#editName').value,
          price: parseFloat($('#editPrice').value),
          description: $('#editDesc').value,
          stock: parseInt($('#editStock').value) || 0,
          category_id: parseInt($('#editCategory').value),
          featured: parseInt($('#editFeatured').value) || 0,
          image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500'
        })
      });
      if (data.success) { closeEditModal(); window.location.reload(); }
    });
  }

  /* ── Admin: Order Status ── */
  $$('.order-status-select').forEach(sel => {
    sel.addEventListener('change', async function() {
      await api(`/admin/api/orders/${this.dataset.orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: this.value })
      });
    });
  });

  /* ── Reviews ── */
  const reviewsContainer = $('.reviews-container');
  if (reviewsContainer) {
    const productId = reviewsContainer.dataset.productId;
    const reviewsList = $('#reviewsList');

    async function loadReviews() {
      const data = await api(`/products/api/${productId}/reviews`);
      const { reviews, average_rating } = data;
      let html = '';

      if (average_rating !== null && average_rating !== undefined) {
        const full = Math.round(average_rating);
        html += `<div class="average-rating">
          <strong>${Number(average_rating).toFixed(1)}</strong>
          <div class="stars">${'<i class="fas fa-star"></i>'.repeat(full)}${'<i class="far fa-star"></i>'.repeat(5 - full)}</div>
          <span>(${reviews.length} review${reviews.length !== 1 ? 's' : ''})</span>
        </div>`;
      }

      if (reviews.length === 0) {
        html += '<p style="color:var(--muted);text-align:center;padding:24px;">No reviews yet. Be the first to review!</p>';
      } else {
        reviews.forEach(r => {
          const d = new Date(r.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
          html += `<div class="review-card">
            <div class="review-header">
              <div>
                <span class="review-author">${r.user_name || 'Anonymous'}</span>
                <span class="review-date">${d}</span>
              </div>
              <div class="review-stars">${'<i class="fas fa-star"></i>'.repeat(r.rating)}${'<i class="far fa-star"></i>'.repeat(5 - r.rating)}</div>
            </div>
            ${r.comment ? `<p>${r.comment}</p>` : ''}
          </div>`;
        });
      }
      reviewsList.innerHTML = html;
    }
    loadReviews();

    /* Star rating interaction */
    const starRating = $('.star-rating');
    if (starRating) {
      const stars = [...starRating.querySelectorAll('span')];
      stars.forEach(s => {
        s.addEventListener('click', () => {
          const rating = parseInt(s.dataset.rating);
          $('#reviewRating').value = rating;
          stars.forEach((st, i) => {
            st.innerHTML = i < rating ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
            st.classList.toggle('active', i < rating);
          });
        });
        s.addEventListener('mouseenter', () => {
          const rating = parseInt(s.dataset.rating);
          stars.forEach((st, i) => {
            st.innerHTML = i < rating ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
          });
        });
        s.addEventListener('mouseleave', () => {
          const current = parseInt($('#reviewRating').value) || 0;
          stars.forEach((st, i) => {
            st.innerHTML = i < current ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
          });
        });
      });
    }

    /* Submit review */
    const reviewForm = $('#reviewForm');
    if (reviewForm) {
      reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = await api('/products/api/reviews', {
          method: 'POST',
          body: JSON.stringify({ product_id: productId, rating: $('#reviewRating').value, comment: reviewForm.querySelector('textarea').value })
        });
        if (data.success) {
          reviewForm.querySelector('textarea').value = '';
          loadReviews();
        }
      });
    }
  }

})();
