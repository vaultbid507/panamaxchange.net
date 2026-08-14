// =========================================================
// NOVASHOP ADMIN
// Supabase Administration
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
// FORGOT PASSWORD
// =========================================================

const forgotPasswordBtn =
    document.getElementById(
        "forgotPasswordBtn"
    );

const forgotPasswordMessage =
    document.getElementById(
        "forgotPasswordMessage"
    );


if (forgotPasswordBtn) {

    forgotPasswordBtn.addEventListener(
        "click",
        async function () {

            const emailInput =
                document.getElementById(
                    "email"
                );


            if (!emailInput) {

                console.error(
                    "Email input was not found."
                );

                return;

            }


            const email =
                emailInput.value.trim();


            if (!email) {

                forgotPasswordMessage.textContent =
                    "Please enter your email address first.";

                forgotPasswordMessage.className =
                    "auth-message error";

                emailInput.focus();

                return;

            }


            forgotPasswordBtn.disabled =
                true;


            forgotPasswordBtn.textContent =
                "Sending...";


            forgotPasswordMessage.textContent =
                "";


            try {

                const {
                    error
                } =
                    await supabaseClient.auth
                        .resetPasswordForEmail(
                            email,
                            {
                                redirectTo:
                                    window.location.origin +
                                    "/update-password.html"
                            }
                        );


                if (error) {

                    throw error;

                }


                forgotPasswordMessage.textContent =
                    "Password reset instructions have been sent to your email.";

                forgotPasswordMessage.className =
                    "auth-message success";


            } catch (error) {

                console.error(
                    "Password reset error:",
                    error
                );


                forgotPasswordMessage.textContent =
                    "Could not send reset email: " +
                    error.message;

                forgotPasswordMessage.className =
                    "auth-message error";

            }


            forgotPasswordBtn.disabled =
                false;


            forgotPasswordBtn.textContent =
                "Forgot Password?";

        }
    );

}

// =========================================================
// ELEMENTS
// =========================================================

// Login

const loginSection =
    document.getElementById(
        "loginSection"
    );


const dashboard =
    document.getElementById(
        "dashboard"
    );


const loginForm =
    document.getElementById(
        "loginForm"
    );


const loginMessage =
    document.getElementById(
        "loginMessage"
    );


const logoutButton =
    document.getElementById(
        "logoutButton"
    );


const adminEmail =
    document.getElementById(
        "adminEmail"
    );


// Dashboard

const productCount =
    document.getElementById(
        "productCount"
    );


const orderCount =
    document.getElementById(
        "orderCount"
    );


const revenue =
    document.getElementById(
        "revenue"
    );


const productsContainer =
    document.getElementById(
        "productsContainer"
    );


const ordersContainer =
    document.getElementById(
        "ordersContainer"
    );


// Categories

const categoryForm =
    document.getElementById(
        "categoryForm"
    );


const categoryId =
    document.getElementById(
        "categoryId"
    );


const categoryName =
    document.getElementById(
        "categoryName"
    );


const categorySlug =
    document.getElementById(
        "categorySlug"
    );


const categorySubmitButton =
    document.getElementById(
        "categorySubmitButton"
    );


const cancelCategoryEdit =
    document.getElementById(
        "cancelCategoryEdit"
    );


const categoriesContainer =
    document.getElementById(
        "categoriesContainer"
    );


// Products

const productForm =
    document.getElementById(
        "productForm"
    );


const productId =
    document.getElementById(
        "productId"
    );


const productName =
    document.getElementById(
        "productName"
    );


const productDescription =
    document.getElementById(
        "productDescription"
    );


const productPrice =
    document.getElementById(
        "productPrice"
    );


const productCategory =
    document.getElementById(
        "productCategory"
    );


const productStock =
    document.getElementById(
        "productStock"
    );


const productImageFile =
    document.getElementById(
        "productImageFile"
    );


const productImage =
    document.getElementById(
        "productImage"
    );


const imagePreview =
    document.getElementById(
        "imagePreview"
    );


const productSubmitButton =
    document.getElementById(
        "productSubmitButton"
    );


const cancelEdit =
    document.getElementById(
        "cancelEdit"
    );


// =========================================================
// STATE
// =========================================================

let categories = [];

let products = [];


// =========================================================
// HELPERS
// =========================================================

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function money(value) {

    return "$" +
        Number(value || 0).toFixed(2);

}


function slugify(value) {

    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(
            /[^a-z0-9]+/g,
            "-"
        )
        .replace(
            /^-+|-+$/g,
            ""
        );

}


// =========================================================
// LOGIN CHECK
// =========================================================

async function checkLogin() {

    const {
        data,
        error
    } = await supabaseClient.auth.getSession();


    if (error) {

        console.error(
            "SESSION ERROR:",
            error
        );

        return;

    }


    if (data.session) {

        showDashboard(
            data.session
        );

    }

}


// =========================================================
// LOGIN
// =========================================================

loginForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        loginMessage.textContent =
            "";


        const email =
            document
                .getElementById(
                    "email"
                )
                .value
                .trim();


        const password =
            document
                .getElementById(
                    "password"
                )
                .value;


        const submitButton =
            loginForm.querySelector(
                "button[type='submit']"
            );


        submitButton.disabled =
            true;


        submitButton.textContent =
            "Signing in...";


        const {
            data,
            error
        } =
            await supabaseClient.auth.signInWithPassword(
                {
                    email,
                    password
                }
            );


        submitButton.disabled =
            false;


        submitButton.textContent =
            "Login";


        if (error) {

            loginMessage.textContent =
                error.message;

            return;

        }


        showDashboard(
            data.session
        );

    }
);


// =========================================================
// SHOW DASHBOARD
// =========================================================

async function showDashboard(
    session
) {

    loginSection.classList.add(
        "hidden"
    );


    dashboard.classList.remove(
        "hidden"
    );


    logoutButton.classList.remove(
        "hidden"
    );


    if (
        session &&
        session.user
    ) {

        adminEmail.textContent =
            session.user.email || "";

    }


    await refreshDashboard();

}


// =========================================================
// REFRESH DASHBOARD
// =========================================================

async function refreshDashboard() {

    await loadCategories();

    await loadProducts();

    await loadOrders();

    await loadStats();

}


// =========================================================
// LOGOUT
// =========================================================

logoutButton.addEventListener(
    "click",
    async () => {

        await supabaseClient.auth.signOut();


        dashboard.classList.add(
            "hidden"
        );


        loginSection.classList.remove(
            "hidden"
        );


        logoutButton.classList.add(
            "hidden"
        );


        adminEmail.textContent =
            "";


        loginForm.reset();

    }
);


// =========================================================
// LOAD STATS
// =========================================================

async function loadStats() {

    const {
        count: productsTotal,
        error: productsError
    } =
        await supabaseClient
            .from("products")
            .select(
                "*",
                {
                    count: "exact",
                    head: true
                }
            );


    if (productsError) {

        console.error(
            "PRODUCT COUNT ERROR:",
            productsError
        );

    }


    const {
        data: orders,
        error: ordersError
    } =
        await supabaseClient
            .from("orders")
            .select(
                "id, total"
            );


    if (ordersError) {

        console.error(
            "ORDER COUNT ERROR:",
            ordersError
        );

        return;

    }


    productCount.textContent =
        productsTotal || 0;


    orderCount.textContent =
        orders.length;


    const totalRevenue =
        orders.reduce(
            (
                total,
                order
            ) => {

                return total +
                    Number(
                        order.total || 0
                    );

            },
            0
        );


    revenue.textContent =
        money(
            totalRevenue
        );

}

// =========================================================
// ORDER MANAGEMENT
// =========================================================

let allOrders = [];

const orderSearch =
    document.getElementById(
        "orderSearch"
    );

const orderStatusFilter =
    document.getElementById(
        "orderStatusFilter"
    );

const orderDetails =
    document.getElementById(
        "orderDetails"
    );


// =========================================================
// ORDER MANAGEMENT
// =========================================================

let allOrders = [];

const ordersContainer =
    document.getElementById("ordersContainer");

const orderSearch =
    document.getElementById("orderSearch");

const orderStatusFilter =
    document.getElementById("orderStatusFilter");

const orderDetails =
    document.getElementById("orderDetails");


// =========================================================
// HELPERS
// =========================================================

function orderEscapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function orderMoney(value) {

    const amount = Number(value || 0);

    return amount.toLocaleString("en-US", {
        style: "currency",
        currency: "USD"
    });

}


function orderDate(value) {

    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "numeric",
        day: "numeric"
    });

}


function normalizeOrderStatus(status) {

    return String(status || "pending")
        .trim()
        .toLowerCase();

}


function orderStatusClass(status) {

    const normalized =
        normalizeOrderStatus(status);

    switch (normalized) {

        case "processing":
        case "shipped":
            return "status-info";

        case "delivered":
        case "completed":
            return "status-success";

        case "cancelled":
        case "canceled":
            return "status-danger";

        case "pending":
        default:
            return "status-pending";
    }

}



// =========================================================
// RENDER / FILTER ORDERS
// =========================================================

function renderOrders() {

    const search =
        (
            orderSearch?.value || ""
        )
        .trim()
        .toLowerCase();


    const selectedStatus =
        normalizeOrderStatus(
            orderStatusFilter?.value || ""
        );


    const filteredOrders =
        allOrders.filter(order => {

            const orderId =
                String(
                    order.id || ""
                )
                .toLowerCase();


            const customer =
                String(
                    order.customer_name || ""
                )
                .toLowerCase();


            const email =
                String(
                    order.customer_email || ""
                )
                .toLowerCase();


            const matchesSearch =
                !search ||
                orderId.includes(search) ||
                customer.includes(search) ||
                email.includes(search);


            const status =
                normalizeOrderStatus(
                    order.status
                );


            const matchesStatus =
                !selectedStatus ||
                status === selectedStatus;


            return (
                matchesSearch &&
                matchesStatus
            );

        });


    displayOrders(
        filteredOrders
    );

}


// =========================================================
// DISPLAY ORDER TABLE
// =========================================================

function displayOrders(
    orders
) {

    if (!ordersContainer) {
        return;
    }


    if (!orders.length) {

        ordersContainer.innerHTML = `
            <div class="empty-state">
                No orders found.
            </div>
        `;

        return;
    }


    let html = `

        <table>

            <thead>

                <tr>

                    <th>
                        ID
                    </th>

                    <th>
                        Customer
                    </th>

                    <th>
                        Email
                    </th>

                    <th>
                        Total
                    </th>

                    <th>
                        Status
                    </th>

                    <th>
                        Date
                    </th>

                    <th>
                        Action
                    </th>

                </tr>

            </thead>

            <tbody>

    `;


    orders.forEach(order => {

        const status =
            normalizeOrderStatus(
                order.status
            );


        const statusLabel =
            status.charAt(0).toUpperCase() +
            status.slice(1);


        html += `

            <tr>

                <td>
                    <strong>
                        #${orderEscapeHTML(
                            order.id
                        )}
                    </strong>
                </td>


                <td>
                    ${orderEscapeHTML(
                        order.customer_name
                    )}
                </td>


                <td>
                    ${orderEscapeHTML(
                        order.customer_email
                    )}
                </td>


                <td>
                    ${orderMoney(
                        order.total
                    )}
                </td>


                <td>

                    <span
                        class="status ${orderStatusClass(
                            status
                        )}"
                    >
                        ${orderEscapeHTML(
                            statusLabel
                        )}
                    </span>

                </td>


                <td>
                    ${orderDate(
                        order.created_at
                    )}
                </td>


                <td>

                    <button
                        type="button"
                        class="edit-button"
                        onclick="viewOrder(${Number(
                            order.id
                        )})"
                    >
                        View
                    </button>

                </td>

            </tr>

        `;

    });


    html += `

            </tbody>

        </table>

    `;


    ordersContainer.innerHTML =
        html;

}

// =========================================================
// ORDER MANAGEMENT
// =========================================================

let allOrders = [];

const orderSearch =
    document.getElementById("orderSearch");

const orderStatusFilter =
    document.getElementById("orderStatusFilter");

const orderDetails =
    document.getElementById("orderDetails");


// =========================================================
// LOAD ORDERS
// =========================================================

async function loadOrders() {

    ordersContainer.innerHTML = `
        <div class="loading">
            Loading orders...
        </div>
    `;


    const {
        data,
        error
    } = await supabaseClient
        .from("orders")
        .select("*")
        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(
            "ORDERS ERROR:",
            error
        );

        ordersContainer.innerHTML = `
            <div class="empty-state">

                <strong>
                    Could not load orders.
                </strong>

                <br><br>

                ${escapeHTML(
                    error.message
                )}

            </div>
        `;

        return;
    }


    allOrders =
        data || [];


    renderOrders();

}


// =========================================================
// RENDER ORDERS
// =========================================================

function renderOrders() {

    const search =
        (
            orderSearch?.value || ""
        )
        .trim()
        .toLowerCase();


    const selectedStatus =
        (
            orderStatusFilter?.value || ""
        )
        .toLowerCase();


    const filteredOrders =
        allOrders.filter(order => {

            const id =
                String(
                    order.id || ""
                )
                .toLowerCase();


            const name =
                String(
                    order.customer_name || ""
                )
                .toLowerCase();


            const email =
                String(
                    order.customer_email || ""
                )
                .toLowerCase();


            const status =
                String(
                    order.status || "pending"
                )
                .toLowerCase();


            const matchesSearch =
                !search ||
                id.includes(search) ||
                name.includes(search) ||
                email.includes(search);


            const matchesStatus =
                !selectedStatus ||
                status === selectedStatus;


            return (
                matchesSearch &&
                matchesStatus
            );

        });


    displayOrders(
        filteredOrders
    );

}


// =========================================================
// DISPLAY ORDERS
// =========================================================

function displayOrders(
    orders
) {

    if (!orders.length) {

        ordersContainer.innerHTML = `
            <div class="empty-state">
                No orders found.
            </div>
        `;

        return;
    }


    let html = `

        <table>

            <thead>

                <tr>

                    <th>ID</th>

                    <th>Customer</th>

                    <th>Email</th>

                    <th>Total</th>

                    <th>Status</th>

                    <th>Date</th>

                    <th>Action</th>

                </tr>

            </thead>

            <tbody>

    `;


    orders.forEach(order => {

        const status =
            String(
                order.status || "pending"
            )
            .toLowerCase();


        let statusClass =
            "status-pending";


        if (
            status === "processing" ||
            status === "shipped"
        ) {

            statusClass =
                "status-info";

        }


        if (
            status === "delivered" ||
            status === "completed" ||
            status === "paid"
        ) {

            statusClass =
                "status-success";

        }


        if (
            status === "cancelled" ||
            status === "canceled"
        ) {

            statusClass =
                "status-danger";

        }


        const date =
            order.created_at
                ? new Date(
                    order.created_at
                ).toLocaleDateString()
                : "";


        html += `

            <tr>

                <td>

                    <strong>
                        #${escapeHTML(
                            order.id
                        )}
                    </strong>

                </td>


                <td>
                    ${escapeHTML(
                        order.customer_name
                    )}
                </td>


                <td>
                    ${escapeHTML(
                        order.customer_email
                    )}
                </td>


                <td>
                    ${money(
                        order.total
                    )}
                </td>


                <td>

                    <span
                        class="status ${statusClass}"
                    >
                        ${escapeHTML(
                            status
                        )}
                    </span>

                </td>


                <td>
                    ${escapeHTML(
                        date
                    )}
                </td>


                <td>

                    <button
                        type="button"
                        class="edit-button"
                        onclick="viewOrder(${Number(
                            order.id
                        )})"
                    >
                        View
                    </button>

                </td>

            </tr>

        `;

    });


    html += `

            </tbody>

        </table>

    `;


    ordersContainer.innerHTML =
        html;

}


// =========================================================
// VIEW ORDER
// =========================================================

async function viewOrder(
    orderId
) {

    if (!orderDetails) {
        return;
    }


    orderDetails.classList.remove(
        "hidden"
    );


    orderDetails.innerHTML = `

        <div class="loading">
            Loading order details...
        </div>

    `;


    const {
        data: order,
        error: orderError
    } = await supabaseClient
        .from("orders")
        .select("*")
        .eq(
            "id",
            orderId
        )
        .single();


    if (orderError) {

        orderDetails.innerHTML = `

            <div class="empty-state">

                ${escapeHTML(
                    orderError.message
                )}

            </div>

        `;

        return;
    }


    const {
        data: items,
        error: itemsError
    } = await supabaseClient
        .from("order_items")
        .select("*")
        .eq(
            "order_id",
            orderId
        )
        .order(
            "id",
            {
                ascending: true
            }
        );


    if (itemsError) {

        console.error(
            "ORDER ITEMS ERROR:",
            itemsError
        );

    }


    renderOrderDetails(
        order,
        items || []
    );

}


// =========================================================
// ORDER DETAILS
// =========================================================

function renderOrderDetails(
    order,
    items
) {

    let itemsHTML = "";


    if (!items.length) {

        itemsHTML = `
            <p>
                No products found for this order.
            </p>
        `;

    } else {

        itemsHTML =
            items.map(item => {

                const quantity =
                    Number(
                        item.quantity || 0
                    );


                const price =
                    Number(
                        item.price || 0
                    );


                const lineTotal =
                    quantity * price;


                return `

                    <div class="order-item">

                        <div>

                            <strong>
                                ${escapeHTML(
                                    item.product_name
                                )}
                            </strong>

                            <div>

                                ${quantity}
                                ×
                                ${money(price)}

                            </div>

                        </div>


                        <strong>

                            ${money(
                                lineTotal
                            )}

                        </strong>

                    </div>

                `;

            })
            .join("");

    }


    const currentStatus =
        String(
            order.status || "pending"
        )
        .toLowerCase();


    orderDetails.innerHTML = `

        <div class="order-details-card">


            <div class="order-details-header">

                <div>

                    <p class="eyebrow">
                        ORDER
                    </p>

                    <h3>
                        #${escapeHTML(
                            order.id
                        )}
                    </h3>

                </div>


                <button
                    type="button"
                    class="secondary-button"
                    onclick="closeOrderDetails()"
                >
                    Close
                </button>

            </div>


            <div class="order-customer">

                <h4>
                    Customer
                </h4>


                <p>

                    <strong>
                        ${escapeHTML(
                            order.customer_name
                        )}
                    </strong>

                </p>


                <p>
                    ${escapeHTML(
                        order.customer_email
                    )}
                </p>


                <p>
                    ${escapeHTML(
                        order.customer_address
                    )}
                </p>

            </div>


            <div class="order-items">

                <h4>
                    Products
                </h4>

                ${itemsHTML}

            </div>


            <div class="order-total">

                <span>
                    Total
                </span>

                <strong>
                    ${money(
                        order.total
                    )}
                </strong>

            </div>


            <div class="order-status-editor">

                <label for="orderStatus">
                    Order Status
                </label>


                <select id="orderStatus">

                    <option
                        value="pending"
                        ${
                            currentStatus ===
                            "pending"
                                ? "selected"
                                : ""
                        }
                    >
                        Pending
                    </option>


                    <option
                        value="processing"
                        ${
                            currentStatus ===
                            "processing"
                                ? "selected"
                                : ""
                        }
                    >
                        Processing
                    </option>


                    <option
                        value="shipped"
                        ${
                            currentStatus ===
                            "shipped"
                                ? "selected"
                                : ""
                        }
                    >
                        Shipped
                    </option>


                    <option
                        value="delivered"
                        ${
                            currentStatus ===
                            "delivered"
                                ? "selected"
                                : ""
                        }
                    >
                        Delivered
                    </option>


                    <option
                        value="cancelled"
                        ${
                            currentStatus ===
                            "cancelled"
                                ? "selected"
                                : ""
                        }
                    >
                        Cancelled
                    </option>

                </select>


                <button
                    type="button"
                    class="primary-button"
                    onclick="updateOrderStatus(${Number(
                        order.id
                    )})"
                >
                    Save Status
                </button>

            </div>


            <div
                id="orderStatusMessage"
                class="message"
            ></div>


        </div>

    `;

}


// =========================================================
// UPDATE STATUS
// =========================================================

async function updateOrderStatus(
    orderId
) {

    const statusElement =
        document.getElementById(
            "orderStatus"
        );


    const message =
        document.getElementById(
            "orderStatusMessage"
        );


    if (!statusElement) {
        return;
    }


    const newStatus =
        statusElement.value;


    if (message) {

        message.textContent =
            "Saving...";

    }


    const {
        error
    } = await supabaseClient
        .from("orders")
        .update({
            status: newStatus
        })
        .eq(
            "id",
            orderId
        );


    if (error) {

        console.error(
            "ORDER UPDATE ERROR:",
            error
        );


        if (message) {

            message.textContent =
                "Error: " +
                error.message;

        }

        return;
    }


    const localOrder =
        allOrders.find(
            order =>
                Number(order.id) ===
                Number(orderId)
        );


    if (localOrder) {

        localOrder.status =
            newStatus;

    }


    renderOrders();


    if (message) {

        message.textContent =
            "Order status updated successfully.";

    }


    if (
        typeof loadStats ===
        "function"
    ) {

        await loadStats();

    }

}


// =========================================================
// CLOSE ORDER DETAILS
// =========================================================

function closeOrderDetails() {

    if (!orderDetails) {
        return;
    }


    orderDetails.classList.add(
        "hidden"
    );


    orderDetails.innerHTML =
        "";

}


// =========================================================
// SEARCH
// =========================================================

if (orderSearch) {

    orderSearch.addEventListener(
        "input",
        renderOrders
    );

}


// =========================================================
// STATUS FILTER
// =========================================================

if (orderStatusFilter) {

    orderStatusFilter.addEventListener(
        "change",
        renderOrders
    );

}


// =========================================================
// VIEW ONE ORDER
// =========================================================

async function viewOrder(
    orderId
) {

    if (!orderDetails) {

        console.error(
            "orderDetails container was not found."
        );

        return;
    }


    orderDetails.classList.remove(
        "hidden"
    );


    orderDetails.innerHTML = `

        <div class="loading">
            Loading order details...
        </div>

    `;


    // -----------------------------------------
    // Get order
    // -----------------------------------------

    const {
        data: order,
        error: orderError
    } = await supabaseClient
        .from("orders")
        .select("*")
        .eq(
            "id",
            orderId
        )
        .single();


    if (orderError) {

        console.error(
            "Order error:",
            orderError
        );


        orderDetails.innerHTML = `

            <div class="empty-state">

                <strong>
                    Could not load order.
                </strong>

                <br><br>

                ${orderEscapeHTML(
                    orderError.message
                )}

            </div>

        `;

        return;
    }


    // -----------------------------------------
    // Get order items
    // -----------------------------------------

    const {
        data: items,
        error: itemsError
    } = await supabaseClient
        .from("order_items")
        .select("*")
        .eq(
            "order_id",
            orderId
        )
        .order(
            "id",
            {
                ascending: true
            }
        );


    if (itemsError) {

        console.error(
            "Order items error:",
            itemsError
        );

    }


    renderOrderDetails(
        order,
        items || []
    );

}


// =========================================================
// RENDER ORDER DETAILS
// =========================================================

function renderOrderDetails(
    order,
    items
) {

    const currentStatus =
        normalizeOrderStatus(
            order.status
        );


    let itemsHTML = "";


    if (!items.length) {

        itemsHTML = `

            <div class="empty-state">

                No products were recorded
                for this order.

            </div>

        `;

    } else {

        itemsHTML =
            items.map(item => {

                const quantity =
                    Number(
                        item.quantity || 0
                    );


                const price =
                    Number(
                        item.price || 0
                    );


                const lineTotal =
                    quantity * price;


                return `

                    <div class="order-item">

                        <div>

                            <strong>
                                ${orderEscapeHTML(
                                    item.product_name
                                )}
                            </strong>

                            <div>

                                ${quantity}
                                ×
                                ${orderMoney(
                                    price
                                )}

                            </div>

                        </div>


                        <strong>

                            ${orderMoney(
                                lineTotal
                            )}

                        </strong>

                    </div>

                `;

            })
            .join("");

    }


    orderDetails.innerHTML = `

        <div class="order-details-card">


            <!-- HEADER -->

            <div class="order-details-header">

                <div>

                    <p class="eyebrow">
                        ORDER
                    </p>

                    <h3>
                        #${orderEscapeHTML(
                            order.id
                        )}
                    </h3>

                </div>


                <button
                    type="button"
                    class="secondary-button"
                    onclick="closeOrderDetails()"
                >
                    Close
                </button>

            </div>


            <!-- CUSTOMER -->

            <div class="order-customer">

                <h4>
                    Customer
                </h4>


                <p>

                    <strong>
                        ${orderEscapeHTML(
                            order.customer_name
                        )}
                    </strong>

                </p>


                <p>

                    ${orderEscapeHTML(
                        order.customer_email
                    )}

                </p>


                <p>

                    ${orderEscapeHTML(
                        order.customer_address
                    )}

                </p>

            </div>


            <!-- ORDER DATE -->

            <div class="order-customer">

                <h4>
                    Order Information
                </h4>

                <p>

                    Order date:
                    <strong>
                        ${orderDate(
                            order.created_at
                        )}
                    </strong>

                </p>

            </div>


            <!-- ITEMS -->

            <div class="order-items">

                <h4>
                    Products
                </h4>

                ${itemsHTML}

            </div>


            <!-- TOTAL -->

            <div class="order-total">

                <span>
                    Total
                </span>

                <strong>
                    ${orderMoney(
                        order.total
                    )}
                </strong>

            </div>


            <!-- STATUS -->

            <div class="order-status-editor">

                <label
                    for="orderStatus"
                >
                    Order Status
                </label>


                <select
                    id="orderStatus"
                >

                    <option
                        value="pending"
                        ${
                            currentStatus === "pending"
                                ? "selected"
                                : ""
                        }
                    >
                        Pending
                    </option>


                    <option
                        value="processing"
                        ${
                            currentStatus === "processing"
                                ? "selected"
                                : ""
                        }
                    >
                        Processing
                    </option>


                    <option
                        value="shipped"
                        ${
                            currentStatus === "shipped"
                                ? "selected"
                                : ""
                        }
                    >
                        Shipped
                    </option>


                    <option
                        value="delivered"
                        ${
                            currentStatus === "delivered"
                                ? "selected"
                                : ""
                        }
                    >
                        Delivered
                    </option>


                    <option
                        value="cancelled"
                        ${
                            currentStatus === "cancelled"
                                ? "selected"
                                : ""
                        }
                    >
                        Cancelled
                    </option>

                </select>


                <button
                    type="button"
                    class="primary-button"
                    onclick="updateOrderStatus(${Number(
                        order.id
                    )})"
                >
                    Save Status
                </button>

            </div>


            <!-- STATUS MESSAGE -->

            <div
                id="orderStatusMessage"
                class="order-status-message"
            ></div>


        </div>

    `;

}


// =========================================================
// UPDATE ORDER STATUS
// =========================================================

async function updateOrderStatus(
    orderId
) {

    const statusSelect =
        document.getElementById(
            "orderStatus"
        );


    const message =
        document.getElementById(
            "orderStatusMessage"
        );


    if (!statusSelect) {
        return;
    }


    const newStatus =
        normalizeOrderStatus(
            statusSelect.value
        );


    if (message) {

        message.innerHTML =
            "Saving...";

    }


    const {
        error
    } = await supabaseClient
        .from("orders")
        .update({
            status: newStatus
        })
        .eq(
            "id",
            orderId
        );


    if (error) {

        console.error(
            "Status update error:",
            error
        );


        if (message) {

            message.innerHTML = `

                <span class="status-danger-text">

                    Could not update order:
                    ${orderEscapeHTML(
                        error.message
                    )}

                </span>

            `;

        }

        return;
    }


    // Update local copy immediately

    const localOrder =
        allOrders.find(
            order =>
                Number(order.id) ===
                Number(orderId)
        );


    if (localOrder) {

        localOrder.status =
            newStatus;

    }


    renderOrders();


    if (message) {

        message.innerHTML = `

            <span class="status-success-text">

                Order status updated successfully.

            </span>

        `;

    }


    // Refresh dashboard statistics
    // if your admin.js already has loadStats()

    if (
        typeof loadStats ===
        "function"
    ) {

        try {

            await loadStats();

        } catch (statsError) {

            console.warn(
                "Could not refresh stats:",
                statsError
            );

        }

    }

}


// =========================================================
// CLOSE ORDER DETAILS
// =========================================================

function closeOrderDetails() {

    if (!orderDetails) {
        return;
    }


    orderDetails.classList.add(
        "hidden"
    );


    orderDetails.innerHTML =
        "";

}


// =========================================================
// SEARCH
// =========================================================

if (orderSearch) {

    orderSearch.addEventListener(
        "input",
        renderOrders
    );

}


// =========================================================
// STATUS FILTER
// =========================================================

if (orderStatusFilter) {

    orderStatusFilter.addEventListener(
        "change",
        renderOrders
    );

}

// =========================================================
// LOAD CATEGORIES
// =========================================================

async function loadCategories() {

    categoriesContainer.innerHTML = `
        <div class="loading">
            Loading categories...
        </div>
    `;


    const {
        data,
        error
    } =
        await supabaseClient
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


        categoriesContainer.innerHTML = `
            <div class="empty-state">
                Could not load categories.
                <br>
                ${escapeHTML(error.message)}
            </div>
        `;

        return;

    }


    categories =
        data || [];


    displayCategories(
        categories
    );


    populateCategorySelect(
        categories
    );

}


// =========================================================
// DISPLAY CATEGORIES
// =========================================================

function displayCategories(
    list
) {

    if (
        list.length === 0
    ) {

        categoriesContainer.innerHTML = `
            <div class="empty-state">
                No categories yet.
            </div>
        `;

        return;

    }


    let html = "";


    list.forEach(
        category => {

            html += `

                <div
                    class="category-card"
                    data-id="${category.id}"
                >

                    <div>

                        <div class="category-name">
                            ${escapeHTML(
                                category.name
                            )}
                        </div>

                        <div class="category-slug">
                            ${escapeHTML(
                                category.slug
                            )}
                        </div>

                    </div>


                    <div class="category-actions">

                        <button
                            type="button"
                            class="edit-button"
                            data-action="edit-category"
                            data-id="${category.id}"
                        >
                            Edit
                        </button>


                        <button
                            type="button"
                            class="danger-button"
                            data-action="delete-category"
                            data-id="${category.id}"
                        >
                            Delete
                        </button>

                    </div>

                </div>

            `;

        }
    );


    categoriesContainer.innerHTML =
        html;

}


// =========================================================
// CATEGORY LIST BUTTONS
// =========================================================

categoriesContainer.addEventListener(
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
            action === "edit-category"
        ) {

            editCategory(
                id
            );

        }


        if (
            action === "delete-category"
        ) {

            deleteCategory(
                id
            );

        }

    }
);


// =========================================================
// CATEGORY FORM
// =========================================================

categoryForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const name =
            categoryName.value.trim();


        const slug =
            slugify(
                categorySlug.value
            );


        if (
            !name ||
            !slug
        ) {

            alert(
                "Please enter a category name and slug."
            );

            return;

        }


        categorySubmitButton.disabled =
            true;


        categorySubmitButton.textContent =
            categoryId.value
                ? "Updating..."
                : "Adding...";


        let result;


        if (
            categoryId.value
        ) {

            result =
                await supabaseClient
                    .from("categories")
                    .update({
                        name,
                        slug
                    })
                    .eq(
                        "id",
                        categoryId.value
                    );

        } else {

            result =
                await supabaseClient
                    .from("categories")
                    .insert({
                        name,
                        slug
                    });

        }


        categorySubmitButton.disabled =
            false;


        if (result.error) {

            console.error(
                "CATEGORY SAVE ERROR:",
                result.error
            );


            alert(
                "Could not save category:\n" +
                result.error.message
            );


            categorySubmitButton.textContent =
                categoryId.value
                    ? "Update Category"
                    : "Add Category";

            return;

        }


        resetCategoryForm();

        await loadCategories();

    }
);


// =========================================================
// EDIT CATEGORY
// =========================================================

function editCategory(
    id
) {

    const category =
        categories.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    if (!category) {

        return;

    }


    categoryId.value =
        category.id;


    categoryName.value =
        category.name;


    categorySlug.value =
        category.slug;


    categorySubmitButton.textContent =
        "Update Category";


    cancelCategoryEdit.classList.remove(
        "hidden"
    );


    categoryName.focus();

}


// =========================================================
// CANCEL CATEGORY EDIT
// =========================================================

cancelCategoryEdit.addEventListener(
    "click",
    resetCategoryForm
);


function resetCategoryForm() {

    categoryForm.reset();


    categoryId.value =
        "";


    categorySubmitButton.textContent =
        "Add Category";


    cancelCategoryEdit.classList.add(
        "hidden"
    );

}


// =========================================================
// DELETE CATEGORY
// =========================================================

async function deleteCategory(
    id
) {

    const category =
        categories.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    if (!category) {

        return;

    }


    const confirmed =
        confirm(
            `Delete category "${category.name}"?`
        );


    if (!confirmed) {

        return;

    }


    const {
        error
    } =
        await supabaseClient
            .from("categories")
            .delete()
            .eq(
                "id",
                id
            );


    if (error) {

        console.error(
            "CATEGORY DELETE ERROR:",
            error
        );


        alert(
            "Could not delete category:\n" +
            error.message
        );

        return;

    }


    await loadCategories();

}


// =========================================================
// PRODUCT CATEGORY DROPDOWN
// =========================================================

function populateCategorySelect(
    list
) {

    const currentValue =
        productCategory.value;


    productCategory.innerHTML = `
        <option value="">
            Select category
        </option>
    `;


    list.forEach(
        category => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                category.slug;


            option.textContent =
                category.name;


            productCategory.appendChild(
                option
            );

        }
    );


    if (
        currentValue
    ) {

        productCategory.value =
            currentValue;

    }

}


// =========================================================
// LOAD PRODUCTS
// =========================================================

async function loadProducts() {

    productsContainer.innerHTML = `
        <div class="loading">
            Loading products...
        </div>
    `;


    const {
        data,
        error
    } =
        await supabaseClient
            .from("products")
            .select("*")
            .order(
                "id",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "PRODUCT ERROR:",
            error
        );


        productsContainer.innerHTML = `
            <div class="empty-state">
                Could not load products.
                <br>
                ${escapeHTML(error.message)}
            </div>
        `;

        return;

    }


    products =
        data || [];


    displayProducts(
        products
    );

}


// =========================================================
// DISPLAY PRODUCTS
// =========================================================

function displayProducts(
    list
) {

    if (
        list.length === 0
    ) {

        productsContainer.innerHTML = `
            <div class="empty-state">
                No products yet.
            </div>
        `;

        return;

    }


    let html = `

        <table class="product-table">

            <thead>

                <tr>

                    <th>
                        Image
                    </th>

                    <th>
                        Product
                    </th>

                    <th>
                        Price
                    </th>

                    <th>
                        Category
                    </th>

                    <th>
                        Stock
                    </th>

                    <th>
                        Actions
                    </th>

                </tr>

            </thead>

            <tbody>

    `;


    list.forEach(
        product => {

            const image =
                product.image_url
                    ? `
                        <img
                            src="${escapeHTML(
                                product.image_url
                            )}"
                            alt="${escapeHTML(
                                product.name
                            )}"
                            class="product-table-image"
                        >
                    `
                    : `
                        <div class="product-placeholder">
                            🛍️
                        </div>
                    `;


            html += `

                <tr>

                    <td>
                        ${image}
                    </td>

                    <td>

                        <strong>
                            ${escapeHTML(
                                product.name
                            )}
                        </strong>

                    </td>

                    <td>
                        ${money(
                            product.price
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            product.category || "—"
                        )}
                    </td>

                    <td>
                        ${Number(
                            product.stock || 0
                        )}
                    </td>

                    <td>

                        <div class="table-actions">

                            <button
                                type="button"
                                class="edit-button"
                                data-action="edit-product"
                                data-id="${product.id}"
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                class="danger-button"
                                data-action="delete-product"
                                data-id="${product.id}"
                            >
                                Delete
                            </button>

                        </div>

                    </td>

                </tr>

            `;

        }
    );


    html += `

            </tbody>

        </table>

    `;


    productsContainer.innerHTML =
        html;

}


// =========================================================
// PRODUCT TABLE BUTTONS
// =========================================================

productsContainer.addEventListener(
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
            action === "edit-product"
        ) {

            editProduct(
                id
            );

        }


        if (
            action === "delete-product"
        ) {

            deleteProduct(
                id
            );

        }

    }
);


// =========================================================
// PRODUCT FORM
// =========================================================

productForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const id =
            productId.value;


        const imageFile =
            productImageFile.files[0];


        const product = {

            name:
                productName.value.trim(),

            description:
                productDescription.value.trim(),

            price:
                Number(
                    productPrice.value
                ),

            category:
                productCategory.value,

            stock:
                Number(
                    productStock.value
                ),

            image_url:
                productImage.value.trim()

        };


        if (
            !product.name
        ) {

            alert(
                "Please enter a product name."
            );

            return;

        }


        if (
            !product.category
        ) {

            alert(
                "Please select a category."
            );

            return;

        }


        if (
            Number.isNaN(
                product.price
            )
        ) {

            alert(
                "Please enter a valid price."
            );

            return;

        }


        if (
            Number.isNaN(
                product.stock
            )
        ) {

            alert(
                "Please enter a valid stock quantity."
            );

            return;

        }


        productSubmitButton.disabled =
            true;


        productSubmitButton.textContent =
            id
                ? "Updating..."
                : "Adding...";


        try {

            // --------------------------------
            // IMAGE UPLOAD
            // --------------------------------

            if (imageFile) {

                if (
                    !imageFile.type.startsWith(
                        "image/"
                    )
                ) {

                    throw new Error(
                        "Please select an image file."
                    );

                }


                if (
                    imageFile.size >
                    5 * 1024 * 1024
                ) {

                    throw new Error(
                        "Image must be smaller than 5 MB."
                    );

                }


                const extension =
                    imageFile.name
                        .split(".")
                        .pop()
                        .toLowerCase();


                const fileName =
                    crypto.randomUUID() +
                    "." +
                    extension;


                const filePath =
                    "products/" +
                    fileName;


                const {
                    error:
                        uploadError
                } =
                    await supabaseClient
                        .storage
                        .from(
                            "product-images"
                        )
                        .upload(
                            filePath,
                            imageFile,
                            {
                                cacheControl:
                                    "3600",

                                upsert:
                                    false
                            }
                        );


                if (
                    uploadError
                ) {

                    throw uploadError;

                }


                const {
                    data:
                        publicUrlData
                } =
                    supabaseClient
                        .storage
                        .from(
                            "product-images"
                        )
                        .getPublicUrl(
                            filePath
                        );


                product.image_url =
                    publicUrlData.publicUrl;

            }


            // --------------------------------
            // SAVE PRODUCT
            // --------------------------------

            let result;


            if (id) {

                result =
                    await supabaseClient
                        .from("products")
                        .update(
                            product
                        )
                        .eq(
                            "id",
                            id
                        );

            } else {

                result =
                    await supabaseClient
                        .from("products")
                        .insert(
                            product
                        );

            }


            if (
                result.error
            ) {

                throw result.error;

            }


            alert(
                id
                    ? "Product updated successfully!"
                    : "Product added successfully!"
            );


            resetProductForm();


            await loadProducts();

            await loadStats();

        } catch (error) {

            console.error(
                "PRODUCT SAVE ERROR:",
                error
            );


            alert(
                "Could not save product:\n" +
                error.message
            );

        } finally {

            productSubmitButton.disabled =
                false;


            productSubmitButton.textContent =
                productId.value
                    ? "Update Product"
                    : "Add Product";

        }

    }
);


// =========================================================
// EDIT PRODUCT
// =========================================================

function editProduct(
    id
) {

    const product =
        products.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    if (!product) {

        return;

    }


    productId.value =
        product.id;


    productName.value =
        product.name || "";


    productDescription.value =
        product.description || "";


    productPrice.value =
        product.price ?? "";


    productCategory.value =
        product.category || "";


    productStock.value =
        product.stock ?? 0;


    productImage.value =
        product.image_url || "";


    productImageFile.value =
        "";


    showImagePreview(
        product.image_url
    );


    productSubmitButton.textContent =
        "Update Product";


    cancelEdit.classList.remove(
        "hidden"
    );


    productForm.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


// =========================================================
// CANCEL PRODUCT EDIT
// =========================================================

cancelEdit.addEventListener(
    "click",
    resetProductForm
);


function resetProductForm() {

    productForm.reset();


    productId.value =
        "";


    productImage.value =
        "";


    productStock.value =
        "0";


    productSubmitButton.textContent =
        "Add Product";


    cancelEdit.classList.add(
        "hidden"
    );


    imagePreview.innerHTML =
        "";


    imagePreview.classList.add(
        "hidden"
    );

}


// =========================================================
// DELETE PRODUCT
// =========================================================

async function deleteProduct(
    id
) {

    const product =
        products.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    if (!product) {

        return;

    }


    const confirmed =
        confirm(
            `Delete "${product.name}"?`
        );


    if (!confirmed) {

        return;

    }


    const {
        error
    } =
        await supabaseClient
            .from("products")
            .delete()
            .eq(
                "id",
                id
            );


    if (error) {

        console.error(
            "PRODUCT DELETE ERROR:",
            error
        );


        alert(
            "Could not delete product:\n" +
            error.message
        );

        return;

    }


    if (
        Number(productId.value) ===
        Number(id)
    ) {

        resetProductForm();

    }


    await loadProducts();

    await loadStats();

}


// =========================================================
// IMAGE PREVIEW
// =========================================================

productImageFile.addEventListener(
    "change",
    () => {

        const file =
            productImageFile.files[0];


        if (!file) {

            return;

        }


        if (
            !file.type.startsWith(
                "image/"
            )
        ) {

            alert(
                "Please select an image."
            );

            productImageFile.value =
                "";

            return;

        }


        const url =
            URL.createObjectURL(
                file
            );


        showImagePreview(
            url
        );

    }
);


// =========================================================
// SHOW IMAGE PREVIEW
// =========================================================

function showImagePreview(
    url
) {

    if (!url) {

        imagePreview.innerHTML =
            "";

        imagePreview.classList.add(
            "hidden"
        );

        return;

    }


    imagePreview.innerHTML = `

        <img
            src="${escapeHTML(url)}"
            alt="Product image preview"
        >

    `;


    imagePreview.classList.remove(
        "hidden"
    );

}


// =========================================================
// AUTO SLUG
// =========================================================

categoryName.addEventListener(
    "input",
    () => {

        if (
            categoryId.value
        ) {

            return;

        }


        categorySlug.value =
            slugify(
                categoryName.value
            );

    }
);


// =========================================================
// AUTH STATE
// =========================================================

supabaseClient.auth.onAuthStateChange(
    (
        event,
        session
    ) => {

        if (
            event === "SIGNED_OUT"
        ) {

            dashboard.classList.add(
                "hidden"
            );


            loginSection.classList.remove(
                "hidden"
            );


            logoutButton.classList.add(
                "hidden"
            );

        }

    }
);


// =========================================================
// START
// =========================================================

checkLogin();
