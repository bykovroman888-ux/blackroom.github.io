document.addEventListener('DOMContentLoaded', () => {
    const CART_KEY = 'blackroomCart';
    const ORDER_KEY = 'blackroomOrders';

    function getCart() {
        try {
            const saved = JSON.parse(localStorage.getItem(CART_KEY));
            if (!Array.isArray(saved)) return [];

            // Обрабатываем и старые записи корзины, если они остались в браузере.
            return saved
                .filter(item => item && item.id && item.name)
                .map(item => ({
                    id: String(item.id),
                    name: String(item.name),
                    price: Number(item.price) || 0,
                    quantity: Math.max(1, Number(item.quantity) || 1)
                }));
        } catch {
            return [];
        }
    }

    function saveCart(cart) {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
    }

    function formatPrice(value) {
        return `${Number(value).toLocaleString('ru-RU')} ₽`;
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[char]);
    }

    function getTotal(cart) {
        return cart.reduce((sum, item) => {
            return sum + item.price * item.quantity;
        }, 0);
    }

    function renderCart() {
        const cart = getCart();
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);

        const counter = document.querySelector('#cartCount');
        if (counter) counter.textContent = count;

        const list = document.querySelector('#cartItems, #checkoutItems');

        if (list) {
            if (cart.length === 0) {
                list.innerHTML = '<p class="text-muted">Корзина пока пуста.</p>';
            } else {
                list.innerHTML = cart.map(item => `
                    <div class="border-bottom py-3">
                        <div class="d-flex justify-content-between gap-3">
                            <div>
                                <div class="fw-semibold">${escapeHtml(item.name)}</div>
                                <div class="text-muted small">
                                    ${formatPrice(item.price)} за услугу
                                </div>
                            </div>

                            <button type="button"
                                    class="btn btn-sm btn-outline-danger align-self-start"
                                    data-cart-action="remove"
                                    data-id="${escapeHtml(item.id)}"
                                    aria-label="Удалить ${escapeHtml(item.name)}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>

                        <div class="d-flex justify-content-between align-items-center mt-2">
                            <div class="btn-group btn-group-sm" role="group"
                                 aria-label="Количество услуг">
                                <button type="button"
                                        class="btn btn-outline-secondary"
                                        data-cart-action="decrease"
                                        data-id="${escapeHtml(item.id)}"
                                        aria-label="Уменьшить количество">−</button>

                                <span class="btn btn-outline-secondary disabled">
                                    ${item.quantity}
                                </span>

                                <button type="button"
                                        class="btn btn-outline-secondary"
                                        data-cart-action="increase"
                                        data-id="${escapeHtml(item.id)}"
                                        aria-label="Увеличить количество">+</button>
                            </div>

                            <span class="fw-bold">
                                ${formatPrice(item.price * item.quantity)}
                            </span>
                        </div>
                    </div>
                `).join('');
            }
        }

        const totalText = formatPrice(getTotal(cart));
        const cartTotal = document.querySelector('#cartTotal');
        const checkoutTotal = document.querySelector('#checkoutTotal');

        if (cartTotal) cartTotal.textContent = totalText;
        if (checkoutTotal) checkoutTotal.textContent = totalText;
    }

    // Добавление услуги.
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.dataset.id;
            const name = button.dataset.name;
            const price = Number(button.dataset.price);

            if (!id || !name || !Number.isFinite(price)) {
                console.error('У кнопки услуги проверьте data-id, data-name и data-price.');
                return;
            }

            const cart = getCart();
            const existing = cart.find(item => item.id === id);

            if (existing) {
                existing.quantity += 1;
            } else {
                cart.push({ id, name, price, quantity: 1 });
            }

            saveCart(cart);
            renderCart();

            const oldContent = button.innerHTML;
            button.innerHTML = '<i class="bi bi-check2"></i>';
            button.classList.add('btn-success');
            button.classList.remove('btn-outline-dark');

            setTimeout(() => {
                button.innerHTML = oldContent;
                button.classList.remove('btn-success');
                button.classList.add('btn-outline-dark');
            }, 900);
        });
    });

    // Удаление услуги и изменение количества.
    document.addEventListener('click', event => {
        const button = event.target.closest('[data-cart-action]');
        if (!button) return;

        const action = button.dataset.cartAction;
        const id = button.dataset.id;
        let cart = getCart();

        const item = cart.find(entry => entry.id === id);
        if (!item) return;

        if (action === 'remove') {
            cart = cart.filter(entry => entry.id !== id);
        } else if (action === 'increase') {
            item.quantity += 1;
        } else if (action === 'decrease') {
            item.quantity -= 1;
            if (item.quantity <= 0) {
                cart = cart.filter(entry => entry.id !== id);
            }
        }

        saveCart(cart);
        renderCart();
    });

    // Оформление заказа.
    const checkoutForm = document.querySelector('#checkoutForm');

    if (checkoutForm) {
        checkoutForm.addEventListener('submit', event => {
            event.preventDefault();

            const cart = getCart();
            const message = document.querySelector('#orderMessage');

            if (!message) return;

            if (cart.length === 0) {
                message.textContent = 'Сначала добавьте услугу в корзину.';
                message.className = 'alert alert-warning';
                return;
            }

            const formData = new FormData(checkoutForm);

            const order = {
                number: `BR-${Date.now()}`,
                customer: formData.get('customer'),
                phone: formData.get('phone'),
                date: formData.get('date'),
                time: formData.get('time'),
                comment: formData.get('comment'),
                items: cart,
                total: getTotal(cart),
                createdAt: new Date().toISOString()
            };

            let orders = [];
            try {
                const savedOrders = JSON.parse(localStorage.getItem(ORDER_KEY));
                if (Array.isArray(savedOrders)) orders = savedOrders;
            } catch {
                orders = [];
            }

            orders.push(order);
            localStorage.setItem(ORDER_KEY, JSON.stringify(orders));
            saveCart([]);

            checkoutForm.reset();
            renderCart();

            message.textContent =
                `Заказ ${order.number} сохранён в этом браузере. Для отправки заявки барбершопу нужна серверная отправка.`;
            message.className = 'alert alert-success';
        });
    }

    // Запрещаем выбрать прошедшую дату.
    const dateInput = document.querySelector('#orderDate');

    if (dateInput) {
        const now = new Date();
        const localToday = new Date(
            now.getTime() - now.getTimezoneOffset() * 60000
        ).toISOString().slice(0, 10);

        dateInput.min = localToday;
    }

    renderCart();
});