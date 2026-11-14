document.addEventListener('DOMContentLoaded', () => {
    const CART_KEY = 'blackroomCart';
    const FAV_KEY = 'blackroomFavorites';

    // ===== Вспомогательные функции =====
    function readStorage(key, fallback = []) {
        try {
            const saved = JSON.parse(localStorage.getItem(key));
            return Array.isArray(saved) ? saved : fallback;
        } catch {
            return fallback;
        }
    }

    function formatPrice(value) {
        return `${Number(value).toLocaleString('ru-RU')} ₽`;
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        })[char]);
    }

    // ===== Toast-уведомления =====
    const toastElement = document.getElementById('shopToast');
    const toastBody = document.getElementById('shopToastBody');
    const shopToast = toastElement ? new bootstrap.Toast(toastElement, { delay: 2500 }) : null;

    function showToast(html) {
        if (!shopToast || !toastBody) return;
        toastBody.innerHTML = html;
        shopToast.show();
    }

    // ===== КОРЗИНА =====
    const cartCountElement = document.querySelector('#cartCount');
    const cartItemsElement = document.querySelector('#cartItems');
    const cartTotalElement = document.querySelector('#cartTotal');

    function renderCart() {
        const cart = readStorage(CART_KEY);
        const quantity = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        const total = cart.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);

        if (cartCountElement) cartCountElement.textContent = quantity;

        if (cartItemsElement) {
            cartItemsElement.innerHTML = cart.length === 0
                ? '<p class="text-muted">Корзина пока пуста.</p>'
                : cart.map(item => `
                    <div class="border-bottom py-3">
                        <div class="d-flex justify-content-between gap-3">
                            <div>
                                <div class="fw-semibold">${escapeHtml(item.name)}</div>
                                <div class="small text-muted">${formatPrice(item.price)} за услугу</div>
                            </div>
                            <button type="button" class="btn btn-sm btn-outline-danger"
                                    data-cart-action="remove" data-id="${escapeHtml(item.id)}"
                                    aria-label="Удалить ${escapeHtml(item.name)}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mt-2">
                            <div class="btn-group btn-group-sm">
                                <button type="button" class="btn btn-outline-secondary"
                                        data-cart-action="decrease" data-id="${escapeHtml(item.id)}">−</button>
                                <span class="btn btn-outline-secondary disabled">${item.quantity || 1}</span>
                                <button type="button" class="btn btn-outline-secondary"
                                        data-cart-action="increase" data-id="${escapeHtml(item.id)}">+</button>
                            </div>
                            <strong>${formatPrice(item.price * (item.quantity || 1))}</strong>
                        </div>
                    </div>
                `).join('');
        }

        if (cartTotalElement) cartTotalElement.textContent = formatPrice(total);
    }

    // Клик по кнопке «В корзину»
    document.addEventListener('click', event => {
        const button = event.target.closest('.add-to-cart');
        if (!button) return;

        const id = button.dataset.id;
        const name = button.dataset.name;
        const price = Number(button.dataset.price);

        if (!id || !name || !Number.isFinite(price)) {
            console.error('Проверьте data-id, data-name и data-price у кнопки.', button);
            return;
        }

        const cart = readStorage(CART_KEY);
        const existing = cart.find(item => item.id === id);

        if (existing) {
            existing.quantity += 1;
        } else {
            cart.push({ id, name, price, quantity: 1 });
        }

        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        renderCart();
        showToast(`<i class="bi bi-cart-check me-1"></i> <strong>${escapeHtml(name)}</strong> добавлена в корзину`);
    });

    // Удаление и смена количества
    document.addEventListener('click', event => {
        const button = event.target.closest('[data-cart-action]');
        if (!button) return;

        const { cartAction: action, id } = button.dataset;
        let cart = readStorage(CART_KEY);
        const item = cart.find(entry => entry.id === id);
        if (!item) return;

        if (action === 'remove') {
            cart = cart.filter(entry => entry.id !== id);
        } else if (action === 'increase') {
            item.quantity += 1;
        } else if (action === 'decrease') {
            item.quantity -= 1;
            if (item.quantity <= 0) cart = cart.filter(entry => entry.id !== id);
        }

        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        renderCart();
    });

    renderCart();

    // ===== ИЗБРАННОЕ =====
    const favCountElement = document.querySelector('#favoriteCount');

    function updateFavoriteCount() {
        if (favCountElement) favCountElement.textContent = readStorage(FAV_KEY).length;
    }

    function renderFavoriteButtons() {
        const favorites = new Set(readStorage(FAV_KEY));

        document.querySelectorAll('.favorite-toggle').forEach(button => {
            const isFavorite = favorites.has(button.dataset.masterId);
            const icon = button.querySelector('i');
            const label = button.querySelector('span');

            button.setAttribute('aria-pressed', String(isFavorite));
            button.classList.toggle('border-danger', isFavorite);
            if (icon) {
                icon.className = isFavorite ? 'bi bi-heart-fill text-danger' : 'bi bi-heart';
            }
            if (label) {
                label.textContent = isFavorite ? 'Убрать из избранного' : 'В избранное';
            }
        });
    }

    document.addEventListener('click', event => {
        const button = event.target.closest('.favorite-toggle');
        if (!button) return;

        const id = button.dataset.masterId;
        const name = button.dataset.masterName || 'Мастер';
        if (!id) return;

        const favorites = new Set(readStorage(FAV_KEY));

        if (favorites.has(id)) {
            favorites.delete(id);
            showToast(`<i class="bi bi-heartbreak me-1"></i> ${escapeHtml(name)} удалён из избранного`);
        } else {
            favorites.add(id);
            showToast(`<i class="bi bi-heart-fill text-danger me-1"></i> <strong>${escapeHtml(name)}</strong> добавлен в избранное`);
        }

        localStorage.setItem(FAV_KEY, JSON.stringify([...favorites]));
        updateFavoriteCount();
        renderFavoriteButtons();
    });

    updateFavoriteCount();
    renderFavoriteButtons();

    // ===== Модалка акций =====
    const promoModalElement = document.getElementById('promoModal');
    if (promoModalElement) {
        const promoModal = new bootstrap.Modal(promoModalElement);
        const promoTitle = document.getElementById('promoModalTitle');
        const promoText = document.getElementById('promoModalText');

        document.addEventListener('click', event => {
            const button = event.target.closest('.promo-btn');
            if (!button) return;
            if (promoTitle) promoTitle.textContent = button.dataset.promoTitle || 'Акция';
            if (promoText) promoText.textContent = button.dataset.promoText || 'Подробности уточняйте у администратора.';
            promoModal.show();
        });
    }

    // ===== Поиск услуг (работает только на странице каталога) =====
    if (document.querySelector('#muzh, #zhen, #dets, #cosm')) {
        const params = new URLSearchParams(window.location.search);
        const searchInputs = document.querySelectorAll('input[type="search"]');

        function filterServices(q) {
            const cards = document.querySelectorAll('.product-card');
            let found = 0;

            cards.forEach(card => {
                const title = card.querySelector('.card-title')?.textContent.toLowerCase() || '';
                const keywords = (card.dataset.keywords || '').toLowerCase();
                const match = !q || title.includes(q) || keywords.includes(q);

                card.closest('.col-12').style.display = match ? '' : 'none';
                if (match) found++;
            });

            document.querySelectorAll('#muzh, #zhen, #dets, #cosm').forEach(section => {
                const visible = [...section.querySelectorAll('.product-card')]
                    .some(card => card.closest('.col-12').style.display !== 'none');
                section.style.display = visible ? '' : 'none';
            });

            const notice = document.getElementById('searchNotice');
            if (notice) {
                if (q) {
                    notice.innerHTML = found > 0
                        ? `Найдено услуг: <strong>${found}</strong> по запросу «${q}». <a href="catalog.html" class="text-dark">Сбросить поиск</a>`
                        : `По запросу «${q}» ничего не найдено. <a href="catalog.html" class="text-dark">Показать все услуги</a>`;
                    notice.classList.remove('d-none');
                } else {
                    notice.classList.add('d-none');
                }
            }
        }

        const initialQuery = (params.get('search') || '').trim().toLowerCase();
        if (initialQuery) {
            filterServices(initialQuery);
            searchInputs.forEach(input => input.value = params.get('search'));
        }

        searchInputs.forEach(input => {
            input.addEventListener('input', () => filterServices(input.value.trim().toLowerCase()));
        });
    }

    // ===== Форма контактов: открывает почтовую программу =====
    const contactForm = document.querySelector('#contactForm');
    contactForm?.addEventListener('submit', event => {
        event.preventDefault();

        const formData = new FormData(contactForm);
        const name = formData.get('name');
        const phone = formData.get('phone');
        const message = formData.get('message');

        const subject = encodeURIComponent('Заявка с сайта BLACKROOM');
        const body = encodeURIComponent(
            `Имя: ${name}\nТелефон: ${phone}\nСообщение: ${message}`
        );

        // Замените адрес на реальный email барбершопа.
        window.location.href =
            `mailto:ваш-email@example.com?subject=${subject}&body=${body}`;
    });

    // ===== Формы входа и регистрации =====
    function setupAuthForm(formId, messageId, successText) {
        const form = document.getElementById(formId);
        const message = document.getElementById(messageId);
        if (!form || !message) return;

        form.addEventListener('submit', event => {
            event.preventDefault();
            const email = form.querySelector('input[type="email"]');
            const password = form.querySelector('input[type="password"]');

            if (!email.value.trim() || password.value.length < 6) {
                message.textContent = 'Проверьте email и пароль (минимум 6 символов).';
                message.className = 'small mb-3 text-danger';
                return;
            }

            message.textContent = successText;
            message.className = 'small mb-3 text-success';

            setTimeout(() => {
                const modal = form.closest('.modal');
                const instance = modal ? bootstrap.Modal.getInstance(modal) : null;
                if (instance) instance.hide();
                form.reset();
            }, 1200);
        });
    }

    setupAuthForm('loginForm', 'loginMessage', 'Вы вошли в аккаунт!');
    setupAuthForm('registerForm', 'registerMessage', 'Аккаунт создан! Добро пожаловать.');

    
// ===== Страница оформления заказа (chekout.html) =====
const checkoutItemsElement = document.querySelector('#checkoutItems');
const checkoutTotalElement = document.querySelector('#checkoutTotal');
const checkoutForm = document.querySelector('#checkoutForm');
const orderMessage = document.querySelector('#orderMessage');

if (checkoutItemsElement) {
    function renderCheckout() {
        const cart = readStorage(CART_KEY);

        if (cart.length === 0) {
            checkoutItemsElement.innerHTML = `
                <p class="text-muted mb-4">Корзина пуста.</p>
                <a href="catalog.html" class="btn btn-outline-dark">Перейти в каталог</a>
            `;
            if (checkoutTotalElement) checkoutTotalElement.textContent = formatPrice(0);
            return;
        }

        checkoutItemsElement.innerHTML = cart.map(item => `
            <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                <div>
                    <div class="fw-semibold">${escapeHtml(item.name)}</div>
                    <div class="small text-muted">${item.quantity || 1} × ${formatPrice(item.price)}</div>
                </div>
                <strong>${formatPrice(item.price * (item.quantity || 1))}</strong>
            </div>
        `).join('');

        const total = cart.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
        if (checkoutTotalElement) checkoutTotalElement.textContent = formatPrice(total);
    }

    renderCheckout();

    if (checkoutForm) {
        checkoutForm.addEventListener('submit', event => {
            event.preventDefault();

            const cart = readStorage(CART_KEY);

            if (cart.length === 0) {
                orderMessage.innerHTML = '<div class="alert alert-danger">Корзина пуста — нечего оформлять.</div>';
                return;
            }

            const name = checkoutForm.customer.value.trim();
            const phone = checkoutForm.phone.value.trim();

            if (!name || !phone) {
                orderMessage.innerHTML = '<div class="alert alert-danger">Заполните имя и телефон.</div>';
                return;
            }

            const total = cart.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);

            orderMessage.innerHTML = `
                <div class="alert alert-success">
                    <strong>Запись оформлена!</strong><br>
                    ${escapeHtml(name)}, ждём вас. Итого к оплате: <strong>${formatPrice(total)}</strong>.
                    Мы позвоним на номер ${escapeHtml(phone)} для подтверждения.
                </div>
            `;

            localStorage.removeItem(CART_KEY);
            renderCart();
            renderCheckout();
            checkoutForm.reset();
        });
    }
}

});
