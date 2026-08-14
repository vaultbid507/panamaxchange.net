// =========================================================
// NOVASHOP STOREFRONT
// Supabase + Products + Categories + Cart + Checkout
// =========================================================


// =========================================================
// SUPABASE
// =========================================================

const SUPABASE_URL =
    "https://tagbxmpizwlvgddgcpcl.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_X36Iq53rm8U8HBkBfL06Vw_zErQRHK0";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


// =========================================================
// DATA
// =========================================================

let products = [];

let categories = [];

let cart =
    JSON.parse(
        localStorage.getItem("novashop-cart")
    ) || [];


// =========================================================
// ELEMENTS
// =========================================================

const productGrid =
    document.getElementById(
        "productGrid"
    );


const categoriesContainer =
    document.getElementById(
        "categories"
    );


const searchInput =
    document.getElementById(
        "searchInput"
    );


const cartButton =
    document.getElementById(
        "cartButton"
    );


const cartCount =
    document.getElementById(
        "cartCount"
    );


const cartOverlay =
    document.getElementById(
        "cartOverlay"
    );


const closeCart =
    document.getElementById(
        "closeCart"
    );


const cartItems =
    document.getElementById(
        "cartItems"
    );


const cartTotal =
    document.getElementById(
        "cartTotal"
    );


const checkoutButton =
    document.getElementById(
        "checkoutButton"
    );


const checkoutOverlay =
    document.getElementById(
        "checkoutOverlay"
    );


const closeCheckout =
    document.getElementById(
        "closeCheckout"
    );


const checkoutForm =
    document.getElementById(
        "checkoutForm"
    );


// =========================================================
// HELPERS
// =========================================================

function money(value) {

    return "$" +
        Number(value || 0).toFixed(2);

}


function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// =========================================================
// LOAD CATEGORIES
// =========================================================

async function loadCategories() {

    categoriesContainer.innerHTML = `
        <button
            type="button"
            class="category active"
            data-category="all"
        >
            All
        </button>
    `;


    const {
        data,
        error
    } = await supabaseClient
        .from("categories")
        .select(
            "id, name, slug"
        )
        .order(
            "name",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "CATEGORY ERROR:",
            error
        );

        return;

    }


    categories =
        data || [];


    categories.forEach(
        category => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "category";


            button.dataset.category =
                category.slug;


            button.textContent =
                category.name;


            categoriesContainer.appendChild(
                button
            );

        }
    );


    setupCategoryFilters();

}


// =========================================================
// CATEGORY FILTERS
// =========================================================

function setupCategoryFilters() {

    document
        .querySelectorAll(
            ".category"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        document
                            .querySelectorAll(
                                ".category"
                            )
                            .forEach(
                                item => {

                                    item.classList.remove(
                                        "active"
                                    );

                                }
                            );


                        button.classList.add(
                            "active"
                        );


                        displayProducts(
                            button.dataset.category,
                            searchInput.value
                        );

                    }
                );

            }
        );

}


// =========================================================
// LOAD PRODUCTS
// =========================================================

async function loadProducts() {

    productGrid.innerHTML = `
        <div class="loading">
            Loading products...
        </div>
    `;


    const {
        data,
        error
    } = await supabaseClient
        .from("products")
        .select("*")
        .order(
            "id",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "PRODUCT ERROR:",
            error
        );


        productGrid.innerHTML = `
            <div class="loading">
                Could not load products.
            </div>
        `;

        return;

    }


    products =
        data || [];


    displayProducts();

    updateCart();

}


// =========================================================
// DISPLAY PRODUCTS
// =========================================================

function displayProducts(
    category = "all",
    search = ""
) {

    const selectedCategory =
        String(
            category || "all"
        )
        .trim()
        .toLowerCase();


    const searchText =
        String(
            search || ""
        )
        .trim()
        .toLowerCase();


    const filteredProducts =
        products.filter(
            product => {

                const productCategory =
                    String(
                        product.category || ""
                    )
                    .trim()
                    .toLowerCase();


                const productName =
                    String(
                        product.name || ""
                    )
                    .toLowerCase();


                const productDescription =
                    String(
                        product.description || ""
                    )
                    .toLowerCase();


                const matchesCategory =
                    selectedCategory === "all" ||
                    productCategory ===
                        selectedCategory;


                const matchesSearch =
                    productName.includes(
                        searchText
                    ) ||
                    productDescription.includes(
                        searchText
                    );


                return (
                    matchesCategory &&
                    matchesSearch
                );

            }
        );


    productGrid.innerHTML = "";


    if (
        filteredProducts.length === 0
    ) {

        productGrid.innerHTML = `
            <div class="loading">
                No products found.
            </div>
        `;

        return;

    }


    filteredProducts.forEach(
        product => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "product-card";


            const imageHTML =
                product.image_url
                    ? `
                        <img
                            src="${escapeHTML(product.image_url)}"
                            alt="${escapeHTML(product.name)}"
                            class="product-photo"
                            loading="lazy"
                        >
                    `
                    : `
                        <div class="product-image">
                            🛍️
                        </div>
                    `;


            card.innerHTML = `

                ${imageHTML}

                <div class="product-info">

                    <p class="product-category">
                        ${escapeHTML(
                            product.category || ""
                        )}
                    </p>

                    <h3 class="product-name">
                        ${escapeHTML(
                            product.name
                        )}
                    </h3>

                    <p>
                        ${escapeHTML(
                            product.description || ""
                        )}
                    </p>

                    <p class="product-price">
                        ${money(product.price)}
                    </p>

                    <button
                        type="button"
                        class="add-button"
                        data-id="${product.id}"
                    >
                        Add to Cart
                    </button>

                </div>

            `;


            productGrid.appendChild(
                card
            );

        }
    );

}


// =========================================================
// ADD TO CART
// =========================================================

function addToCart(
    productId
) {

    const product =
        products.find(
            item =>
                Number(item.id) ===
                Number(productId)
        );


    if (!product) {

        return;

    }


    const existing =
        cart.find(
            item =>
                Number(item.id) ===
                Number(productId)
        );


    if (existing) {

        existing.quantity += 1;

    } else {

        cart.push({

            id: Number(productId),

            quantity: 1

        });

    }


    saveCart();

    updateCart();

}


// =========================================================
// REMOVE FROM CART
// =========================================================

function removeFromCart(
    productId
) {

    cart =
        cart.filter(
            item =>
                Number(item.id) !==
                Number(productId)
        );


    saveCart();

    updateCart();

}


// =========================================================
// CHANGE QUANTITY
// =========================================================

function changeQuantity(
    productId,
    amount
) {

    const item =
        cart.find(
            cartItem =>
                Number(cartItem.id) ===
                Number(productId)
        );


    if (!item) {

        return;

    }


    item.quantity += amount;


    if (
        item.quantity <= 0
    ) {

        removeFromCart(
            productId
        );

        return;

    }


    saveCart();

    updateCart();

}


// =========================================================
// SAVE CART
// =========================================================

function saveCart() {

    localStorage.setItem(
        "novashop-cart",
        JSON.stringify(cart)
    );

}


// =========================================================
// UPDATE CART
// =========================================================

function updateCart() {

    let total = 0;

    let count = 0;


    cartItems.innerHTML = "";


    if (cart.length === 0) {

        cartItems.innerHTML = `
            <div class="cart-empty">
                Your cart is empty.
            </div>
        `;

        cartCount.textContent = "0";

        cartTotal.textContent =
            "$0.00";

        return;

    }


    cart.forEach(
        item => {

            const product =
                products.find(
                    product =>
                        Number(product.id) ===
                        Number(item.id)
                );


            if (!product) {

                return;

            }


            const quantity =
                Number(item.quantity);


            const itemTotal =
                Number(product.price) *
                quantity;


            total += itemTotal;

            count += quantity;


            const div =
                document.createElement(
                    "div"
                );


            div.className =
                "cart-item";


            const imageHTML =
                product.image_url
                    ? `
                        <img
                            src="${escapeHTML(product.image_url)}"
                            alt="${escapeHTML(product.name)}"
                        >
                    `
                    : "🛍️";


            div.innerHTML = `

                <div class="cart-item-image">
                    ${imageHTML}
                </div>

                <div class="cart-item-info">

                    <h4>
                        ${escapeHTML(
                            product.name
                        )}
                    </h4>

                    <p class="cart-item-price">
                        ${money(product.price)}
                    </p>

                    <div class="quantity">

                        <button
                            type="button"
                            data-action="minus"
                            data-id="${product.id}"
                        >
                            −
                        </button>

                        <span>
                            ${quantity}
                        </span>

                        <button
                            type="button"
                            data-action="plus"
                            data-id="${product.id}"
                        >
                            +
                        </button>

                        <button
                            type="button"
                            class="remove"
                            data-action="remove"
                            data-id="${product.id}"
                        >
                            Remove
                        </button>

                    </div>

                </div>

            `;


            cartItems.appendChild(
                div
            );

        }
    );


    cartCount.textContent =
        count;


    cartTotal.textContent =
        money(total);

}


// =========================================================
// PRODUCT BUTTONS
// =========================================================

productGrid.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                ".add-button"
            );


        if (!button) {

            return;

        }


        const productId =
            Number(
                button.dataset.id
            );


        addToCart(
            productId
        );


        const originalText =
            button.textContent;


        button.textContent =
            "Added ✓";


        setTimeout(
            () => {

                button.textContent =
                    originalText;

            },
            1000
        );

    }
);


// =========================================================
// CART BUTTONS
// =========================================================

cartItems.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "button"
            );


        if (!button) {

            return;

        }


        const id =
            Number(
                button.dataset.id
            );


        const action =
            button.dataset.action;


        if (
            action === "plus"
        ) {

            changeQuantity(
                id,
                1
            );

        }


        if (
            action === "minus"
        ) {

            changeQuantity(
                id,
                -1
            );

        }


        if (
            action === "remove"
        ) {

            removeFromCart(
                id
            );

        }

    }
);


// =========================================================
// OPEN CART
// =========================================================

cartButton.addEventListener(
    "click",
    () => {

        updateCart();

        cartOverlay.classList.remove(
            "hidden"
        );

        document.body.style.overflow =
            "hidden";

    }
);


// =========================================================
// CLOSE CART
// =========================================================

closeCart.addEventListener(
    "click",
    closeCartModal
);


function closeCartModal() {

    cartOverlay.classList.add(
        "hidden"
    );

    document.body.style.overflow =
        "";

}


// =========================================================
// OPEN CHECKOUT
// =========================================================

checkoutButton.addEventListener(
    "click",
    () => {

        if (
            cart.length === 0
        ) {

            alert(
                "Your cart is empty."
            );

            return;

        }


        closeCartModal();


        checkoutOverlay.classList.remove(
            "hidden"
        );


        document.body.style.overflow =
            "hidden";

    }
);


// =========================================================
// CLOSE CHECKOUT
// =========================================================

closeCheckout.addEventListener(
    "click",
    () => {

        checkoutOverlay.classList.add(
            "hidden"
        );

        document.body.style.overflow =
            "";

    }
);


// =========================================================
// SEARCH
// =========================================================

searchInput.addEventListener(
    "input",
    () => {

        const activeCategory =
            document.querySelector(
                ".category.active"
            );


        const category =
            activeCategory
                ? activeCategory.dataset.category
                : "all";


        displayProducts(
            category,
            searchInput.value
        );

    }
);


// =========================================================
// CHECKOUT
// =========================================================

checkoutForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        if (
            cart.length === 0
        ) {

            alert(
                "Your cart is empty."
            );

            return;

        }


        const customerName =
            document
                .getElementById(
                    "customerName"
                )
                .value
                .trim();


        const customerEmail =
            document
                .getElementById(
                    "customerEmail"
                )
                .value
                .trim();


        const customerAddress =
            document
                .getElementById(
                    "customerAddress"
                )
                .value
                .trim();


        const submitButton =
            checkoutForm.querySelector(
                "button[type='submit']"
            );


        submitButton.disabled =
            true;


        submitButton.textContent =
            "Processing...";


        try {

            const {
                data: orderId,
                error
            } =
                await supabaseClient.rpc(
                    "create_order",
                    {

                        p_customer_name:
                            customerName,

                        p_customer_email:
                            customerEmail,

                        p_customer_address:
                            customerAddress,

                        p_items:
                            cart

                    }
                );


            if (error) {

                throw error;

            }


            alert(
                "Order placed successfully! " +
                "Order #" +
                orderId
            );


            cart = [];


            saveCart();

            updateCart();


            checkoutForm.reset();


            checkoutOverlay.classList.add(
                "hidden"
            );


            document.body.style.overflow =
                "";

        } catch (error) {

            console.error(
                "CHECKOUT ERROR:",
                error
            );


            alert(
                "Could not place order: " +
                error.message
            );

        } finally {

            submitButton.disabled =
                false;

            submitButton.textContent =
                "Place Order";

        }

    }
);


// =========================================================
// CLOSE MODALS WHEN CLICKING OUTSIDE
// =========================================================

cartOverlay.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            cartOverlay
        ) {

            closeCartModal();

        }

    }
);


checkoutOverlay.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            checkoutOverlay
        ) {

            checkoutOverlay.classList.add(
                "hidden"
            );

            document.body.style.overflow =
                "";

        }

    }
);


// =========================================================
// ESCAPE KEY
// =========================================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            closeCartModal();


            checkoutOverlay.classList.add(
                "hidden"
            );


            document.body.style.overflow =
                "";

        }

    }
);


// =========================================================
// START STORE
// =========================================================

async function startStore() {

    await loadCategories();

    await loadProducts();

    updateCart();

}


startStore();
