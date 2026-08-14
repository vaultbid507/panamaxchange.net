// ==========================================
// NOVASHOP - SUPABASE STORE
// ==========================================


// ------------------------------------------
// SUPABASE CONNECTION
// ------------------------------------------

const SUPABASE_URL = "https://tagbxmpizwlvgddgcpcl.supabase.co";

const SUPABASE_KEY = "sb_publishable_X36Iq53rm8U8HBkBfL06Vw_zErQRHK0";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


// ------------------------------------------
// STORE DATA
// ------------------------------------------

let products = [];

let cart =
    JSON.parse(
        localStorage.getItem("novashop-cart")
    ) || [];


// ------------------------------------------
// ELEMENTS
// ------------------------------------------

const productGrid =
    document.getElementById("productGrid");

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

const searchInput =
    document.getElementById("searchInput");


// ------------------------------------------
// MONEY
// ------------------------------------------

function money(value) {

    return "$" + Number(value).toFixed(2);

}


// ------------------------------------------
// LOAD PRODUCTS FROM SUPABASE
// ------------------------------------------

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


    console.log(
        "Products returned:",
        data
    );


    console.log(
        "Supabase error:",
        error
    );


    if (error) {

        console.error(
            "SUPABASE ERROR:",
            error
        );

        productGrid.innerHTML = `
            <p>
                Could not load products.
                Check the browser console.
            </p>
        `;

        return;
    }


  products = data.map(product => ({
    ...product,
    emoji: "🛍️"
}));

displayProducts();
    setupCategories();
    displayProducts();

}


// ------------------------------------------
// DISPLAY PRODUCTS
// ------------------------------------------

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
        products.filter(product => {

            const productCategory =
                String(
                    product.category || ""
                )
                .trim()
                .toLowerCase();


            const matchesCategory =
                selectedCategory === "all" ||
                productCategory ===
                    selectedCategory;


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

        });


    productGrid.innerHTML = "";


    if (
        filteredProducts.length === 0
    ) {

        productGrid.innerHTML = `
            <p>
                No products found.
            </p>
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
                            src="${product.image_url}"
                            alt="${product.name}"
                            class="product-image"
                            loading="lazy"
                        >
                      `
                    : `
                        <div class="product-image">
                            🛍️
                        </div>
                      `;


            card.innerHTML = `

                <div class="product-image-container">

                    ${imageHTML}

                </div>


                <div class="product-info">

                    <p class="product-category">
                        ${product.category}
                    </p>


                    <h3 class="product-name">
                        ${product.name}
                    </h3>


                    <p>
                        ${product.description || ""}
                    </p>


                    <p class="product-price">
                        ${money(product.price)}
                    </p>


                    <button
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

// ------------------------------------------
// ADD TO CART
// ------------------------------------------

function addToCart(productId) {

    const existing =
        cart.find(
            item =>
                item.id === productId
        );


    if (existing) {

        existing.quantity++;

    } else {

        cart.push({

            id: productId,

            quantity: 1

        });

    }


    saveCart();

    updateCart();

}


// ------------------------------------------
// REMOVE FROM CART
// ------------------------------------------

function removeFromCart(
    productId
) {

    cart =
        cart.filter(
            item =>
                item.id !== productId
        );


    saveCart();

    updateCart();

}


// ------------------------------------------
// CHANGE QUANTITY
// ------------------------------------------

function changeQuantity(
    productId,
    amount
) {

    const item =
        cart.find(
            item =>
                item.id === productId
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


// ------------------------------------------
// SAVE CART
// ------------------------------------------

function saveCart() {

    localStorage.setItem(
        "novashop-cart",
        JSON.stringify(cart)
    );

}


// ------------------------------------------
// UPDATE CART
// ------------------------------------------

function updateCart() {

    let total = 0;

    let count = 0;


    cartItems.innerHTML = "";


    if (cart.length === 0) {

        cartItems.innerHTML = `
            <p style="color:#777">
                Your cart is empty.
            </p>
        `;

    }


    cart.forEach(item => {

        const product =
            products.find(
                product =>
                    product.id === item.id
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


        div.innerHTML = `

           <div class="cart-item-image">

    ${
        product.image_url
            ? `
                <img
                    src="${product.image_url}"
                    alt="${product.name}"
                >
              `
            : "🛍️"
    }

</div>
            <div class="cart-item-info">

                <h4>
                    ${product.name}
                </h4>

                <p>
                    ${money(product.price)}
                </p>

                <div class="quantity">

                    <button
                        data-action="minus"
                        data-id="${product.id}"
                    >
                        −
                    </button>

                    <span>
                        ${item.quantity}
                    </span>

                    <button
                        data-action="plus"
                        data-id="${product.id}"
                    >
                        +
                    </button>

                    <button
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

    });


    cartCount.textContent =
        count;


    cartTotal.textContent =
        money(total);

}


// ------------------------------------------
// ADD BUTTONS
// ------------------------------------------

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


        button.textContent =
            "Added ✓";


        setTimeout(
            () => {

                button.textContent =
                    "Add to Cart";

            },
            1000
        );

    }
);


// ------------------------------------------
// CART BUTTONS
// ------------------------------------------

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


// ------------------------------------------
// OPEN CART
// ------------------------------------------

cartButton.addEventListener(
    "click",
    () => {

        cartOverlay.classList.remove(
            "hidden"
        );

    }
);


// ------------------------------------------
// CLOSE CART
// ------------------------------------------

closeCart.addEventListener(
    "click",
    () => {

        cartOverlay.classList.add(
            "hidden"
        );

    }
);


// ------------------------------------------
// OPEN CHECKOUT
// ------------------------------------------

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


// ------------------------------------------
// CLOSE CHECKOUT
// ------------------------------------------

closeCheckout.addEventListener(
    "click",
    () => {

        checkoutOverlay.classList.add(
            "hidden"
        );

    }
);


// ------------------------------------------
// CHECKOUT / CREATE ORDER
// ------------------------------------------

checkoutForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        if (cart.length === 0) {

            alert("Your cart is empty.");

            return;

        }


        const customerName =
            document
                .getElementById("customerName")
                .value
                .trim();


        const customerEmail =
            document
                .getElementById("customerEmail")
                .value
                .trim();


        const customerAddress =
            document
                .getElementById("customerAddress")
                .value
                .trim();


        try {

            const {
                data: orderId,
                error
            } = await supabaseClient.rpc(
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

// ------------------------------------------
// SEARCH
// ------------------------------------------

searchInput.addEventListener(
    "input",
    () => {

        const activeCategory =
           function setupCategories() {

    const categories =
        [
            ...new Set(
                products
                    .map(product =>
                        String(
                            product.category || ""
                        )
                        .trim()
                        .toLowerCase()
                    )
                    .filter(Boolean)
            )
        ]
        .sort();


    const categoryContainer =
        document.getElementById(
            "categoryContainer"
        );


    if (!categoryContainer) {

        return;

    }


    categoryContainer.innerHTML = "";


    const allButton =
        document.createElement(
            "button"
        );


    allButton.className =
        "category active";

    allButton.dataset.category =
        "all";

    allButton.textContent =
        "All";


    categoryContainer.appendChild(
        allButton
    );


    categories.forEach(
        category => {

            const button =
                document.createElement(
                    "button"
                );


            button.className =
                "category";


            button.dataset.category =
                category;


            button.textContent =
                category
                    .charAt(0)
                    .toUpperCase() +
                category.slice(1);


            categoryContainer.appendChild(
                button
            );

        }
    );


    categoryContainer
        .querySelectorAll(
            ".category"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    categoryContainer
                        .querySelectorAll(
                            ".category"
                        )
                        .forEach(btn => {

                            btn.classList.remove(
                                "active"
                            );

                        });


                    button.classList.add(
                        "active"
                    );


                    displayProducts(
                        button.dataset.category,
                        searchInput.value
                    );

                }
            );

        });

}

// ------------------------------------------
// CATEGORY FILTER
// ------------------------------------------

document
    .querySelectorAll(".category")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(
                        ".category"
                    )
                    .forEach(btn => {

                        btn.classList.remove(
                            "active"
                        );

                    });


                button.classList.add(
                    "active"
                );


                displayProducts(
                    button.dataset.category,
                    searchInput.value
                );

            }
        );

    });


// ------------------------------------------
// START STORE
// ------------------------------------------

loadProducts();

updateCart();
