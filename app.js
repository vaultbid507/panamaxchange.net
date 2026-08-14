// ==========================================
// NOVASHOP - SUPABASE STORE
// ==========================================


// ==========================================
// SUPABASE CONNECTION
// ==========================================

const SUPABASE_URL =
    "https://tagbxmpizwlvgddgcpcl.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_X36Iq53rm8U8HBkBfL06Vw_zErQRHK0";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


// ==========================================
// STORE DATA
// ==========================================

let products = [];

let categories = [];

let cart =
    JSON.parse(
        localStorage.getItem("novashop-cart")
    ) || [];


// ==========================================
// ELEMENTS
// ==========================================

const productGrid =
    document.getElementById("productGrid");

const categoriesContainer =
    document.getElementById("categories");

const searchInput =
    document.getElementById("searchInput");

const cartButton =
    document.getElementById("cartButton");

const cartCount =
    document.getElementById("cartCount");

const cartOverlay =
    document.getElementById("cartOverlay");

const closeCart =
    document.getElementById("closeCart");

const cartItems =
    document.getElementById("cartItems");

const cartTotal =
    document.getElementById("cartTotal");

const checkoutButton =
    document.getElementById("checkoutButton");

const checkoutOverlay =
    document.getElementById("checkoutOverlay");

const closeCheckout =
    document.getElementById("closeCheckout");

const checkoutForm =
    document.getElementById("checkoutForm");


// ==========================================
// MONEY
// ==========================================

function money(value) {

    return "$" + Number(value || 0).toFixed(2);

}


// ==========================================
// HTML ESCAPE
// ==========================================

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// ==========================================
// LOAD CATEGORIES
// ==========================================

async function loadCategories() {

    console.log(
        "Loading categories from Supabase..."
    );


    const {
        data,
        error
    } = await supabaseClient
        .from("categories")
        .select("*")
        .order("name", {
            ascending: true
        });


    if (error) {

        console.error(
            "CATEGORY ERROR:",
            error
        );


        categoriesContainer.innerHTML = `
            <button
                type="button"
                class="category active"
                data-category="all"
            >
                All
            </button>
        `;


        return;

    }


    categories = data || [];


    console.log(
        "Categories:",
        categories
    );


    displayCategories();

}


// ==========================================
// DISPLAY CATEGORIES
// ==========================================

function displayCategories() {

    categoriesContainer.innerHTML = "";


    // ALL BUTTON

    const allButton =
        document.createElement("button");


    allButton.type = "button";

    allButton.className =
        "category active";

    allButton.dataset.category =
        "all";

    allButton.textContent =
        "All";


    categoriesContainer.appendChild(
        allButton
    );


    // DATABASE CATEGORIES

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
                String(
                    category.slug || ""
                )
                .trim()
                .toLowerCase();


            button.textContent =
                category.name;


            categoriesContainer.appendChild(
                button
            );

        }
    );


    setupCategoryButtons();

}


// ==========================================
// CATEGORY BUTTON EVENTS
// ==========================================

function setupCategoryButtons() {

    const buttons =
        categoriesContainer.querySelectorAll(
            ".category"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    buttons.forEach(
                        btn => {

                            btn.classList.remove(
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


// ==========================================
// LOAD PRODUCTS
// ==========================================

async function loadProducts() {

    console.log(
        "Loading products from Supabase..."
    );


    const {
        data,
        error
    } = await supabaseClient
        .from("products")
        .select("*")
        .order("id", {
            ascending: true
        });


    if (error) {

        console.error(
            "PRODUCT ERROR:",
            error
        );


        productGrid.innerHTML = `
            <div class="empty-message">
                <p>
                    Could not load products.
                </p>
            </div>
        `;


        return;

    }


    products = data || [];


    console.log(
        "Products:",
        products
    );


    displayProducts();

}


// ==========================================
// DISPLAY PRODUCTS
// ==========================================

function displayProducts(
    category = "all",
    search = ""
) {

    const selectedCategory =
        String(category || "all")
            .trim()
            .toLowerCase();


    const searchText =
        String(search || "")
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
            <div class="empty-message">

                <p>
                    No products found.
                </p>

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


            // PRODUCT IMAGE

            let imageHTML;


            if (
                product.image_url &&
                String(
                    product.image_url
                ).trim() !== ""
            ) {

                imageHTML = `
                    <div class="product-image">

                        <img
                            src="${escapeHTML(
                                product.image_url
                            )}"
                            alt="${escapeHTML(
                                product.name
                            )}"
                            loading="lazy"
                        >

                    </div>
                `;

            } else {

                imageHTML = `
                    <div class="product-image">
                        🛍️
                    </div>
                `;

            }


            // CATEGORY NAME

            const category =
                categories.find(
                    item =>
                        String(
                            item.slug
                        )
                        .toLowerCase() ===
                        String(
                            product.category || ""
                        )
                        .toLowerCase()
                );


            const categoryName =
                category
                    ? category.name
                    : product.category || "";


            // PRODUCT CARD

            card.innerHTML = `

                ${imageHTML}

                <div class="product-info">

                    <p class="product-category">
                        ${escapeHTML(
                            categoryName
                        )}
                    </p>

                    <h3 class="product-name">
                        ${escapeHTML(
                            product.name
                        )}
                    </h3>

                    <p class="product-description">
                        ${escapeHTML(
                            product.description || ""
                        )}
                    </p>

                    <p class="product-price">
                        ${money(
                            product.price
                        )}
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


// ==========================================
// ADD TO CART
// ==========================================

function addToCart(productId) {

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


// ==========================================
// REMOVE FROM CART
// ==========================================

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


// ==========================================
// CHANGE QUANTITY
// ==========================================

function changeQuantity(
    productId,
    amount
) {

    const item =
        cart.find(
            item =>
                Number(item.id) ===
                Number(productId)
        );


    if (!item) {

        return;

    }


    item.quantity += amount;


    if (item.quantity <= 0) {

        removeFromCart(
            productId
        );

        return;

    }


    saveCart();

    updateCart();

}


// ==========================================
// SAVE CART
// ==========================================

function saveCart() {

    localStorage.setItem(
        "novashop-cart",
        JSON.stringify(cart)
    );

}


// ==========================================
// UPDATE CART
// ==========================================

function updateCart() {

    let total = 0;

    let count = 0;


    cartItems.innerHTML = "";


    if (cart.length === 0) {

        cartItems.innerHTML = `
            <p class="empty-cart">
                Your cart is empty.
            </p>
        `;

    }


    cart.forEach(
        item => {

            const product =
                products.find(
                    product =>
                        Number(
                            product.id
                        ) ===
                        Number(
                            item.id
                        )
                );


            if (!product) {

                return;

            }


            const itemTotal =
                Number(product.price) *
                item.quantity;


            total += itemTotal;

            count += item.quantity;


            const div =
                document.createElement(
                    "div"
                );


            div.className =
                "cart-item";


            let cartImage;


            if (
                product.image_url
            ) {

                cartImage = `
                    <img
                        src="${escapeHTML(
                            product.image_url
                        )}"
                        alt="${escapeHTML(
                            product.name
                        )}"
                    >
                `;

            } else {

                cartImage =
                    "🛍️";

            }


            div.innerHTML = `

                <div class="cart-item-image">
                    ${cartImage}
                </div>

                <div class="cart-item-info">

                    <h4>
                        ${escapeHTML(
                            product.name
                        )}
                    </h4>

                    <p>
                        ${money(
                            product.price
                        )}
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
                            ${item.quantity}
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


// ==========================================
// PRODUCT BUTTONS
// ==========================================

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


        button.disabled =
            true;


        setTimeout(
            () => {

                button.textContent =
                    originalText;

                button.disabled =
                    false;

            },
            1000
        );

    }
);


// ==========================================
// CART BUTTONS
// ==========================================

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


        if (action === "plus") {

            changeQuantity(
                id,
                1
            );

        }


        if (action === "minus") {

            changeQuantity(
                id,
                -1
            );

        }


        if (action === "remove") {

            removeFromCart(
                id
            );

        }

    }
);


// ==========================================
// OPEN CART
// ==========================================

cartButton.addEventListener(
    "click",
    () => {

        cartOverlay.classList.remove(
            "hidden"
        );

    }
);


// ==========================================
// CLOSE CART
// ==========================================

closeCart.addEventListener(
    "click",
    () => {

        cartOverlay.classList.add(
            "hidden"
        );

    }
);


// ==========================================
// OPEN CHECKOUT
// ==========================================

checkoutButton.addEventListener(
    "click",
    () => {

        if (cart.length === 0) {

            alert(
                "Your cart is empty."
            );

            return;

        }


        cartOverlay.classList.add(
            "hidden"
        );


        checkoutOverlay.classList.remove(
            "hidden"
        );

    }
);


// ==========================================
// CLOSE CHECKOUT
// ==========================================

closeCheckout.addEventListener(
    "click",
    () => {

        checkoutOverlay.classList.add(
            "hidden"
        );

    }
);


// ==========================================
// CHECKOUT / CREATE ORDER
// ==========================================

checkoutForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        if (cart.length === 0) {

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

                console.error(
                    "CHECKOUT ERROR:",
                    error
                );

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


        } catch (error) {

            console.error(
                "ORDER ERROR:",
                error
            );


            alert(
                "Could not place order: " +
                error.message
            );

        }

    }
);


// ==========================================
// SEARCH
// ==========================================

searchInput.addEventListener(
    "input",
    () => {

        const activeCategory =
            categoriesContainer.querySelector(
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


// ==========================================
// START STORE
// ==========================================

async function startStore() {

    await loadCategories();

    await loadProducts();

    updateCart();

}


startStore();
