// Hardware Shop Admin Panel - Client Interactions

document.addEventListener('DOMContentLoaded', () => {
  initPosBilling();
  initRestockModal();
  initAutoDismissAlerts();
});

// POS Billing & Sell Logic
function initPosBilling() {
  const cartContainer = document.getElementById('cartItemsList');
  if (!cartContainer) return; // Not on the POS page

  let cart = []; // Array of { productId, name, sku, unitPrice, unit, maxStock, quantity }

  const subtotalEl = document.getElementById('posSubtotal');
  const discountInput = document.getElementById('posDiscountPercent');
  const discountAmountEl = document.getElementById('posDiscountAmount');
  const grandTotalEl = document.getElementById('posGrandTotal');
  const hiddenItemsInput = document.getElementById('hiddenItemsJson');
  const emptyCartState = document.getElementById('emptyCartNotice');
  const submitSaleBtn = document.getElementById('btnSubmitSale');
  const searchInput = document.getElementById('posProductSearch');
  const productCards = document.querySelectorAll('.pos-product-item');

  // Search filter
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      productCards.forEach((card) => {
        const name = card.dataset.name.toLowerCase();
        const sku = (card.dataset.sku || '').toLowerCase();
        const cat = (card.dataset.category || '').toLowerCase();
        if (name.includes(q) || sku.includes(q) || cat.includes(q)) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }

  // Click on product card to add to cart
  productCards.forEach((card) => {
    card.addEventListener('click', () => {
      const productId = card.dataset.id;
      const name = card.dataset.name;
      const sku = card.dataset.sku;
      const unitPrice = parseFloat(card.dataset.price);
      const unit = card.dataset.unit || 'pcs';
      const maxStock = parseInt(card.dataset.stock, 10);

      if (maxStock <= 0) {
        showToast('This product is sold out!', 'danger');
        return;
      }

      const existingIndex = cart.findIndex((item) => item.productId === productId);
      if (existingIndex > -1) {
        if (cart[existingIndex].quantity < maxStock) {
          cart[existingIndex].quantity += 1;
        } else {
          showToast(`Cannot add more. Only ${maxStock} ${unit} in stock!`, 'warning');
          return;
        }
      } else {
        cart.push({
          productId,
          name,
          sku,
          unitPrice,
          unit,
          maxStock,
          quantity: 1,
        });
      }

      renderCart();
    });
  });

  // Preset discount buttons
  document.querySelectorAll('.discount-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.discount-preset-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const val = parseFloat(btn.dataset.percent) || 0;
      discountInput.value = val;
      calculateTotals();
    });
  });

  if (discountInput) {
    discountInput.addEventListener('input', () => {
      let val = parseFloat(discountInput.value);
      if (isNaN(val) || val < 0) val = 0;
      if (val > 100) val = 100;
      discountInput.value = val;
      calculateTotals();
    });
  }

  function renderCart() {
    if (cart.length === 0) {
      if (emptyCartState) emptyCartState.style.display = 'block';
      cartContainer.innerHTML = '';
      if (submitSaleBtn) submitSaleBtn.disabled = true;
    } else {
      if (emptyCartState) emptyCartState.style.display = 'none';
      if (submitSaleBtn) submitSaleBtn.disabled = false;

      let html = '';
      cart.forEach((item, index) => {
        const itemTotal = (item.unitPrice * item.quantity).toFixed(2);
        html += `
          <div class="cart-item" data-index="${index}">
            <div style="flex: 1;">
              <div style="font-weight: 700; font-size: 14px; color: var(--text-main);">${item.name}</div>
              <div style="font-size: 12px; color: var(--text-muted);">
                <span class="badge badge-category" style="font-size: 10px; padding: 1px 6px;">${item.sku}</span>
                ₹${item.unitPrice.toFixed(2)} / ${item.unit}
                <span style="color: var(--text-dim);">(Max: ${item.maxStock})</span>
              </div>
            </div>

            <div class="qty-stepper">
              <button type="button" class="qty-btn btn-cart-minus" data-index="${index}">-</button>
              <input type="number" class="qty-input" value="${item.quantity}" min="1" max="${item.maxStock}" data-index="${index}" readonly />
              <button type="button" class="qty-btn btn-cart-plus" data-index="${index}">+</button>
            </div>

            <div style="text-align: right; min-width: 75px;">
              <div style="font-weight: 800; color: var(--text-main);">₹${itemTotal}</div>
            </div>

            <button type="button" class="btn btn-outline btn-sm btn-cart-remove" data-index="${index}" style="padding: 4px 8px; color: #dc2626;" title="Remove">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        `;
      });
      cartContainer.innerHTML = html;

      // Bind buttons in cart
      cartContainer.querySelectorAll('.btn-cart-minus').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.index, 10);
          if (cart[idx].quantity > 1) {
            cart[idx].quantity -= 1;
            renderCart();
          } else {
            cart.splice(idx, 1);
            renderCart();
          }
        });
      });

      cartContainer.querySelectorAll('.btn-cart-plus').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.index, 10);
          if (cart[idx].quantity < cart[idx].maxStock) {
            cart[idx].quantity += 1;
            renderCart();
          } else {
            showToast(`Only ${cart[idx].maxStock} available in stock!`, 'warning');
          }
        });
      });

      cartContainer.querySelectorAll('.btn-cart-remove').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.index, 10);
          cart.splice(idx, 1);
          renderCart();
        });
      });
    }

    calculateTotals();
  }

  function calculateTotals() {
    let subtotal = 0;
    cart.forEach((item) => {
      subtotal += item.unitPrice * item.quantity;
    });

    const discountPercent = parseFloat(discountInput ? discountInput.value : 0) || 0;
    const discountAmount = (subtotal * discountPercent) / 100;
    const grandTotal = Math.max(0, subtotal - discountAmount);

    if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
    if (discountAmountEl) discountAmountEl.textContent = `-₹${discountAmount.toFixed(2)}`;
    if (grandTotalEl) grandTotalEl.textContent = `₹${grandTotal.toFixed(2)}`;

    // Update hidden items payload
    if (hiddenItemsInput) {
      const payload = cart.map((c) => ({
        productId: c.productId,
        quantity: c.quantity,
      }));
      hiddenItemsInput.value = JSON.stringify(payload);
    }
  }

  // Pre-fill if productId param is present in URL
  const urlParams = new URLSearchParams(window.location.search);
  const preselectId = urlParams.get('product');
  if (preselectId) {
    const targetCard = document.querySelector(`.pos-product-item[data-id="${preselectId}"]`);
    if (targetCard) targetCard.click();
  }
}

// Restock Modal Logic
function initRestockModal() {
  const modal = document.getElementById('restockModal');
  if (!modal) return;

  const modalForm = document.getElementById('restockForm');
  const modalProductName = document.getElementById('restockProductName');
  const modalCurrentStock = document.getElementById('restockCurrentStock');
  const modalQtyInput = document.getElementById('restockQuantity');
  const closeBtns = modal.querySelectorAll('.close-modal');

  document.querySelectorAll('.btn-open-restock').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const name = btn.dataset.name;
      const stock = btn.dataset.stock;

      modalForm.action = `/products/${id}/restock`;
      modalProductName.textContent = name;
      modalCurrentStock.textContent = `${stock} pcs`;
      modalQtyInput.value = '10';
      modal.style.display = 'flex';
      modalQtyInput.focus();
    });
  });

  closeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  });

  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
}

function initAutoDismissAlerts() {
  const alerts = document.querySelectorAll('.alert');
  alerts.forEach((alert) => {
    setTimeout(() => {
      alert.style.transition = 'opacity 0.5s ease';
      alert.style.opacity = '0';
      setTimeout(() => alert.remove(), 500);
    }, 4500);
  });
}

// Toast notification helper
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `alert alert-${type === 'danger' ? 'danger' : 'success'}`;
  toast.style.position = 'fixed';
  toast.style.bottom = '24px';
  toast.style.right = '24px';
  toast.style.zIndex = '9999';
  toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
  toast.innerHTML = `<i class="fas fa-info-circle"></i> <span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.4s ease';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}
