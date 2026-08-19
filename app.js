// PanamaXChange storefront
// Supabase + products + categories + seller attribution + cart + checkout

const SUPABASE_URL = "https://tagbxmpizwlvgddgcpcl.supabase.co";
const SUPABASE_KEY = "sb_publishable_X36Iq53rm8U8HBkBfL06Vw_zErQRHKbF0";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let products = [];
let categories = [];
let productSellers = new Map();

/** Read the persisted shopping cart and safely fall back to an empty cart. */
function readCart() {
    try {
        const value = JSON.parse(localStorage.getItem("novashop-cart") || "[]");
        return Array.isArray(value) ? value : [];
    } catch (error) {
        console.warn("Invalid saved cart; resetting it.", error);
        return [];
    }
}

let cart = readCart();

const productGrid = document.getElementById("productGrid");
const categoryFilters = document.getElementById("categoryFilters");
const searchInput = document.getElementById("searchInput");
const cartButton = document.getElementById("cartButton");
const cartCount = document.getElementById("cartCount");
const cartOverlay = document.getElementById("cartOverlay");
const closeCart = document.getElementById("closeCart");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const checkoutButton = document.getElementById("checkoutButton");
const checkoutOverlay = document.getElementById("checkoutOverlay");
const closeCheckout = document.getElementById("closeCheckout");
const checkoutForm = document.getElementById("checkoutForm");

/** Format a numeric value as a USD storefront price. */
function money(value) {
    const amount = Number(value);
    return `$${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"}`;
}

/** Escape untrusted values before placing them into generated HTML. */
function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/** Persist the current cart in browser storage. */
function saveCart() {
    localStorage.setItem("novashop-cart", JSON.stringify(cart));
}

/** Resolve the category label from the supported product category shapes. */
function getProductCategory(product) {
    if (typeof product.category === "string") return product.category;
    if (product.category && typeof product.category === "object") {
        return product.category.slug || product.category.name || "";
    }
    return product.category_slug || product.category_name || "";
}

/** Return the seller label for a product, defaulting legacy products to the store. */
function getProductSeller(product) {
    if (product.owner_id) {
        return productSellers.get(String(product.owner_id)) || "Seller";
    }
    return "PanamaXChange";
}

/** Render the category filter buttons from the live category list. */
function renderCategoryFilters() {
    categoryFilters.innerHTML = "";

    const allButton = document.createElement("button");
    allButton.type = "button";
    allButton.className = "category active";
    allButton.dataset.category = "all";
    allButton.textContent = "All";
    categoryFilters.appendChild(allButton);

    categories.forEach(category => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "category";
        button.dataset.category = String(category.slug || category.name || "").toLowerCase();
        button.textContent = category.name || category.slug || "Category";
        categoryFilters.appendChild(button);
    });
}

/** Load categories from Supabase and refresh their filter controls. */
async function loadCategories() {
    const { data, error } = await supabaseClient
        .from("categories")
        .select("id, name, slug")
        .order("name", { ascending: true });

    if (error) {
        console.error("CATEGORY ERROR:", error);
        categories = [];
    } else {
        categories = Array.isArray(data) ? data : [];
    }

    renderCategoryFilters();
}

/**
 * Load storefront products and then load public seller display names for products
 * owned by registered users. Legacy products without owner_id remain attributed
 * to PanamaXChange rather than showing an unknown seller.
 */
async function loadProducts() {
    productGrid.innerHTML = '<div class="loading">Loading products...</div>';

    const { data, error } = await supabaseClient
        .from("products")
        .select("*")
        .order("id", { ascending: true });

    if (error) {
        console.error("PRODUCT ERROR:", error);
        products = [];
        productSellers = new Map();
        productGrid.innerHTML = '<div class="loading">Could not load products. Please try again later.</div>';
        updateCart();
        return;
    }

    products = Array.isArray(data) ? data : [];
    productSellers = new Map();

    const ownerIds = [...new Set(products.map(product => product.owner_id).filter(Boolean).map(String))];
    if (ownerIds.length) {
        const sellerResult = await supabaseClient.rpc("get_product_sellers", {
            p_product_ids: products.map(product => Number(product.id))
        });

        if (sellerResult.error) {
            console.warn("SELLER ATTRIBUTION ERROR:", sellerResult.error);
        } else {
            (sellerResult.data || []).forEach(row => {
                if (row.product_id && row.seller_name) {
                    const product = products.find(item => Number(item.id) === Number(row.product_id));
                    if (product?.owner_id) productSellers.set(String(product.owner_id), row.seller_name);
                }
            });
        }
    }

    displayProducts();
    updateCart();
}

/** Filter and render product cards, including seller attribution. */
function displayProducts(category = "all", search = "") {
    const selectedCategory = String(category || "all").trim().toLowerCase();
    const searchText = String(search || "").trim().toLowerCase();

    const filteredProducts = products.filter(product => {
        const productCategory = String(getProductCategory(product)).trim().toLowerCase();
        const name = String(product.name || "").toLowerCase();
        const description = String(product.description || "").toLowerCase();

        const matchesCategory = selectedCategory === "all" || productCategory === selectedCategory;
        const matchesSearch = !searchText || name.includes(searchText) || description.includes(searchText);
        return matchesCategory && matchesSearch;
    });

    productGrid.innerHTML = "";

    if (!filteredProducts.length) {
        productGrid.innerHTML = '<div class="loading">No products found.</div>';
        return;
    }

    filteredProducts.forEach(product => {
        const card = document.createElement("article");
        card.className = "product-card";

        const image = product.image_url
            ? `<img src="${escapeHTML(product.image_url)}" alt="${escapeHTML(product.name)}" class="product-photo" loading="lazy">`
            : '<div class="product-image" aria-hidden="true">🛍️</div>';

        card.innerHTML = `
            ${image}
            <div class="product-info">
                <p class="product-category">${escapeHTML(getProductCategory(product))}</p>
                <h3 class="product-name">${escapeHTML(product.name)}</h3>
                <p>${escapeHTML(product.description || "")}</p>
                <p class="product-seller">Posted by <strong>${escapeHTML(getProductSeller(product))}</strong></p>
                <p class="product-price">${money(product.price)}</p>
                <button type="button" class="add-button" data-id="${escapeHTML(product.id)}">Add to Cart</button>
            </div>
        `;

        productGrid.appendChild(card);
    });
}

/** Add one product to the cart or increment its existing quantity. */
function addToCart(productId) {
    const product = products.find(item => Number(item.id) === Number(productId));
    if (!product) return;

    const existing = cart.find(item => Number(item.id) === Number(productId));
    if (existing) {
        existing.quantity = Math.max(1, Number(existing.quantity) || 0) + 1;
    } else {
        cart.push({ id: Number(productId), quantity: 1 });
    }

    saveCart();
    updateCart();
}

/** Remove a product completely from the current cart. */
function removeFromCart(productId) {
    cart = cart.filter(item => Number(item.id) !== Number(productId));
    saveCart();
    updateCart();
}

/** Increase or decrease a cart item's quantity and remove it at zero. */
function changeQuantity(productId, amount) {
    const item = cart.find(entry => Number(entry.id) === Number(productId));
    if (!item) return;

    item.quantity = (Number(item.quantity) || 0) + amount;
    if (item.quantity <= 0) {
        removeFromCart(productId);
        return;
    }

    saveCart();
    updateCart();
}

/** Recalculate and render all cart totals, quantities, and line items. */
function updateCart() {
    let total = 0;
    let count = 0;
    cartItems.innerHTML = "";

    const validCart = [];

    cart.forEach(item => {
        const product = products.find(entry => Number(entry.id) === Number(item.id));
        const quantity = Number(item.quantity);
        if (!product || !Number.isFinite(quantity) || quantity <= 0) return;

        validCart.push({ id: Number(item.id), quantity });
        total += Number(product.price || 0) * quantity;
        count += quantity;

        const div = document.createElement("div");
        div.className = "cart-item";

        const image = product.image_url
            ? `<img src="${escapeHTML(product.image_url)}" alt="${escapeHTML(product.name)}">`
            : "🛍️";

        div.innerHTML = `
            <div class="cart-item-image">${image}</div>
            <div class="cart-item-info">
                <h4>${escapeHTML(product.name)}</h4>
                <p class="cart-item-price">${money(product.price)}</p>
                <div class="quantity">
                    <button type="button" data-action="minus" data-id="${escapeHTML(product.id)}" aria-label="Decrease quantity">−</button>
                    <span>${quantity}</span>
                    <button type="button" data-action="plus" data-id="${escapeHTML(product.id)}" aria-label="Increase quantity">+</button>
                    <button type="button" class="remove" data-action="remove" data-id="${escapeHTML(product.id)}">Remove</button>
                </div>
            </div>
        `;

        cartItems.appendChild(div);
    });

    if (validCart.length !== cart.length) {
        cart = validCart;
        saveCart();
    }

    if (!cart.length) {
        cartItems.innerHTML = '<div class="cart-empty">Your cart is empty.</div>';
    }

    cartCount.textContent = String(count);
    cartTotal.textContent = money(total);
}

/** Close the shopping-cart dialog and restore page scrolling. */
function closeCartModal() {
    cartOverlay.classList.add("hidden");
    document.body.style.overflow = "";
}

/** Close the checkout dialog and restore page scrolling. */
function closeCheckoutModal() {
    checkoutOverlay.classList.add("hidden");
    document.body.style.overflow = "";
}

productGrid.addEventListener("click", event => {
    const button = event.target.closest(".add-button");
    if (!button) return;

    addToCart(Number(button.dataset.id));

    const originalText = button.textContent;
    button.textContent = "Added ✓";
    button.disabled = true;
    setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
    }, 800);
});

categoryFilters.addEventListener("click", event => {
    const button = event.target.closest(".category");
    if (!button) return;

    categoryFilters.querySelectorAll(".category").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    displayProducts(button.dataset.category, searchInput.value);
});

cartItems.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;

    const id = Number(button.dataset.id);
    const action = button.dataset.action;

    if (action === "plus") changeQuantity(id, 1);
    if (action === "minus") changeQuantity(id, -1);
    if (action === "remove") removeFromCart(id);
});

cartButton.addEventListener("click", () => {
    updateCart();
    cartOverlay.classList.remove("hidden");
    document.body.style.overflow = "hidden";
});

closeCart.addEventListener("click", closeCartModal);

checkoutButton.addEventListener("click", () => {
    if (!cart.length) {
        alert("Your cart is empty.");
        return;
    }

    closeCartModal();
    checkoutOverlay.classList.remove("hidden");
    document.body.style.overflow = "hidden";
});

closeCheckout.addEventListener("click", closeCheckoutModal);

searchInput.addEventListener("input", () => {
    const activeCategory = document.querySelector(".category.active");
    displayProducts(activeCategory?.dataset.category || "all", searchInput.value);
});

checkoutForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!cart.length) {
        alert("Your cart is empty.");
        return;
    }

    const customerName = document.getElementById("customerName").value.trim();
    const customerEmail = document.getElementById("customerEmail").value.trim();
    const customerAddress = document.getElementById("customerAddress").value.trim();
    const submitButton = checkoutForm.querySelector("button[type='submit']");

    submitButton.disabled = true;
    submitButton.textContent = "Processing...";

    try {
        const { data: orderId, error } = await supabaseClient.rpc("create_order", {
            p_customer_name: customerName,
            p_customer_email: customerEmail,
            p_customer_address: customerAddress,
            p_items: cart
        });

        if (error) throw error;

        alert(`Order placed successfully! Order #${orderId}`);
        cart = [];
        saveCart();
        updateCart();
        checkoutForm.reset();
        closeCheckoutModal();
    } catch (error) {
        console.error("CHECKOUT ERROR:", error);
        alert(`Could not place order: ${error.message || "Unknown error"}`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Place Order";
    }
});

cartOverlay.addEventListener("click", event => {
    if (event.target === cartOverlay) closeCartModal();
});

checkoutOverlay.addEventListener("click", event => {
    if (event.target === checkoutOverlay) closeCheckoutModal();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeCartModal();
        closeCheckoutModal();
    }
});

/** Start the storefront data lifecycle and initialize the cart UI. */
async function startStore() {
    updateCart();
    await Promise.all([loadCategories(), loadProducts()]);
    updateCart();
}

startStore().catch(error => {
    console.error("STORE STARTUP ERROR:", error);
    productGrid.innerHTML = '<div class="loading">The store could not start. Please refresh the page.</div>';
});
