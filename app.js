// ==========================================
// NOVASHOP
// Simple online store
// ==========================================


// PRODUCTS
// ------------------------------------------

const products = [

    {
        id: 1,
        name: "Wireless Headphones",
        price: 49.99,
        category: "electronics",
        emoji: "🎧"
    },

    {
        id: 2,
        name: "Smart Watch",
        price: 79.99,
        category: "electronics",
        emoji: "⌚"
    },

    {
        id: 3,
        name: "Classic Sneakers",
        price: 64.99,
        category: "fashion",
        emoji: "👟"
    },

    {
        id: 4,
        name: "Premium Hoodie",
        price: 44.99,
        category: "fashion",
        emoji: "🧥"
    },

    {
        id: 5,
        name: "Desk Lamp",
        price: 29.99,
        category: "home",
        emoji: "💡"
    },

    {
        id: 6,
        name: "Coffee Maker",
        price: 89.99,
        category: "home",
        emoji: "☕"
    },

    {
        id: 7,
        name: "Bluetooth Speaker",
        price: 39.99,
        category: "electronics",
        emoji: "🔊"
    },

    {
        id: 8,
        name: "Travel Backpack",
        price: 54.99,
        category: "fashion",
        emoji: "🎒"
    }

];


// CART
// ------------------------------------------

let cart =
    JSON.parse(localStorage.getItem("novashop-cart"))
    || [];


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


// SAVE CART
// ------------------------------------------

function saveCart() {

    localStorage.setItem(
        "novashop-cart",
        JSON.stringify(cart)
    );

}


// FORMAT MONEY
// ------------------------------------------

function money(value) {

    return "$" + value.toFixed(2);

}


// DISPLAY PRODUCTS
// ------------------------------------------

function displayProducts(
    category = "all",
    search = ""
) {

    const filteredProducts =
        products.filter(product => {

            const matchesCategory =
                category === "all"
                || product.category === category;

            const matchesSearch =
                product.name
                    .toLowerCase()
                    .includes(
                        search.toLowerCase()
                    );

            return (
                matchesCategory
                && matchesSearch
            );

        });


    productGrid.innerHTML = "";


    if (filteredProducts.length === 0) {

        productGrid.innerHTML = `
            <p>
                No products found.
            </p>
        `;

        return;

    }


    filteredProducts.forEach(product => {

        const card =
            document.createElement("article");

        card.className = "product-card";


        card.innerHTML = `

            <div class="product-image">
                ${product.emoji}
            </div>

            <div class="product-info">

                <p class="product-category">
                    ${product.category}
                </p>

                <h3 class="product-name">
                    ${product.name}
                </h3>

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


        productGrid.appendChild(card);

    });

}


// ADD TO CART
// ------------------------------------------

function addToCart(productId) {

    const existing =
        cart.find(item =>
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


// REMOVE FROM CART
// ------------------------------------------

function removeFromCart(productId) {

    cart =
        cart.filter(item =>
            item.id !== productId
        );

    saveCart();

    updateCart();

}


// CHANGE QUANTITY
// ------------------------------------------

function changeQuantity(
    productId,
    amount
) {

    const item =
        cart.find(
            item => item.id === productId
        );


    if (!item) return;


    item.quantity += amount;


    if (item.quantity <= 0) {

        removeFromCart(productId);

        return;

    }


    saveCart();

    updateCart();

}


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


        if (!product) return;


        const itemTotal =
            product.price * item.quantity;


        total += itemTotal;

        count += item.quantity;


        const div =
            document.createElement("div");

        div.className = "cart-item";


        div.innerHTML = `

            <div class="cart-item-image">
                ${product.emoji}
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


        cartItems.appendChild(div);

    });


    cartCount.textContent = count;

    cartTotal.textContent = money(total);

}


// PRODUCT BUTTONS
// ------------------------------------------

productGrid.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                ".add-button"
            );


        if (!button) return;


        const productId =
            Number(button.dataset.id);


        addToCart(productId);


        button.textContent =
            "Added ✓";


        setTimeout(() => {

            button.textContent =
                "Add to Cart";

        }, 1000);

    }
);


// CART BUTTONS
// ------------------------------------------

cartItems.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest("button");


        if (!button) return;


        const id =
            Number(button.dataset.id);


        const action =
            button.dataset.action;


        if (action === "plus") {

            changeQuantity(id, 1);

        }


        if (action === "minus") {

            changeQuantity(id, -1);

        }


        if (action === "remove") {

            removeFromCart(id);

        }

    }
);


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


// CHECKOUT
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


// PLACE ORDER
// ------------------------------------------

checkoutForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();


        const customer = {

            name:
                document.getElementById(
                    "customerName"
                ).value,

            email:
                document.getElementById(
                    "customerEmail"
                ).value,

            address:
                document.getElementById(
                    "customerAddress"
                ).value

        };


        const order = {

            id:
                "ORDER-" +
                Date.now(),

            customer,

            products: cart,

            createdAt:
                new Date().toISOString()

        };


        console.log(
            "ORDER CREATED:",
            order
        );


        alert(
            "Thank you for your order, " +
            customer.name +
            "!"
        );


        cart = [];

        saveCart();

        updateCart();

        checkoutForm.reset();

        checkoutOverlay.classList.add(
            "hidden"
        );

    }
);


// SEARCH
// ------------------------------------------

searchInput.addEventListener(
    "input",
    () => {

        const activeCategory =
            document.querySelector(
                ".category.active"
            );


        const category =
            activeCategory.dataset.category;


        displayProducts(
            category,
            searchInput.value
        );

    }
);


// CATEGORY FILTER
// ------------------------------------------

document
    .querySelectorAll(".category")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(".category")
                    .forEach(btn =>
                        btn.classList.remove(
                            "active"
                        )
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

    });


// INITIALIZE
// ------------------------------------------

displayProducts();

updateCart();
