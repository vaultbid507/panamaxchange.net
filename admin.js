// =========================================================
// NOVASHOP ADMIN
// CLEAN SUPABASE ADMIN PANEL
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
// ELEMENTS
// =========================================================

// Login

const loginSection =
    document.getElementById("loginSection");

const dashboard =
    document.getElementById("dashboard");

const loginForm =
    document.getElementById("loginForm");

const loginMessage =
    document.getElementById("loginMessage");

const forgotPasswordButton =
    document.getElementById(
        "forgotPasswordButton"
    );

const forgotPasswordMessage =
    document.getElementById(
        "forgotPasswordMessage"
    );

const logoutButton =
    document.getElementById("logoutButton");

const adminEmail =
    document.getElementById("adminEmail");


// Statistics

const productCount =
    document.getElementById("productCount");

const orderCount =
    document.getElementById("orderCount");

const revenue =
    document.getElementById("revenue");


// Orders

const ordersContainer =
    document.getElementById(
        "ordersContainer"
    );

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

// Products

const productsContainer =
    document.getElementById(
        "productsContainer"
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

const productImage =
    document.getElementById(
        "productImage"
    );

const productSubmitButton =
    document.getElementById(
        "productSubmitButton"
    );

const cancelEdit =
    document.getElementById(
        "cancelEdit"
    );

const imagePreview =
    document.getElementById(
        "imagePreview"
    );


// =========================================================
// STATE
// =========================================================

let categories = [];

let products = [];

let allOrders = [];


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

    return Number(value || 0)
        .toLocaleString(
            "en-US",
            {
                style: "currency",
                currency: "USD"
            }
        );

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


function normalizeStatus(value) {

    return String(
        value || "pending"
    )
        .trim()
        .toLowerCase();

}


function statusClass(status) {

    switch (
        normalizeStatus(status)
    ) {

        case "processing":
        case "shipped":
            return "status-info";

        case "delivered":
        case "completed":
        case "paid":
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
// ADMIN CHECK
// =========================================================

async function isAdmin(userId) {

    if (!userId) {
        return false;
    }

    const {
        data,
        error
    } = await supabaseClient
        .from("admin_users")
        .select("user_id")
        .eq(
            "user_id",
            id
        )
        .maybeSingle();

    if (error) {

        console.error(
            "ADMIN CHECK ERROR:",
            error
        );

        return false;
    }

    return !!data;
}


// =========================================================
// CHECK LOGIN
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

    if (!data.session) {
        showLogin();
        return;
    }

    const allowed =
        await isAdmin(
            data.session.user.id
        );

    if (!allowed) {

        await supabaseClient.auth.signOut();

        showLogin();

        showLoginMessage(
            "This account is not an administrator.",
            "error"
        );

        return;
    }

    await showDashboard(
        data.session
    );
}


// =========================================================
// SHOW LOGIN
// =========================================================

function showLogin() {

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


// =========================================================
// SHOW LOGIN MESSAGE
// =========================================================

function showLoginMessage(
    message,
    type = "error"
) {

    if (!loginMessage) {
        return;
    }

    loginMessage.textContent =
        message;

    loginMessage.className =
        "message " + type;
}


// =========================================================
// LOGIN
// =========================================================

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            showLoginMessage("");

            const email =
                document
                    .getElementById("email")
                    .value
                    .trim();

            const password =
                document
                    .getElementById("password")
                    .value;

            const button =
                loginForm.querySelector(
                    "button[type='submit']"
                );

            button.disabled = true;

            button.textContent =
                "Signing in...";

            try {

                const {
                    data,
                    error
                } =
                    await supabaseClient.auth
                        .signInWithPassword({
                            email,
                            password
                        });

                if (error) {
                    throw error;
                }

                const allowed =
                    await isAdmin(
                        data.user.id
                    );

                if (!allowed) {

                    await supabaseClient
                        .auth
                        .signOut();

                    throw new Error(
                        "This account is not registered as an administrator."
                    );
                }

                await showDashboard(
                    data.session
                );

            } catch (error) {

                console.error(
                    "LOGIN ERROR:",
                    error
                );

                showLoginMessage(
                    error.message,
                    "error"
                );

            } finally {

                button.disabled = false;

                button.textContent =
                    "Login";
            }

        }
    );

}


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
// REFRESH EVERYTHING
// =========================================================

async function refreshDashboard() {

    await Promise.all([
        loadCategories(),
        loadProducts(),
        loadOrders(),
        loadStats()
    ]);

}


// =========================================================
// LOGOUT
// =========================================================

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async () => {

            await supabaseClient
                .auth
                .signOut();

            showLogin();

            loginForm.reset();

            adminEmail.textContent = "";

        }
    );

}


// =========================================================
// FORGOT PASSWORD
// =========================================================

if (forgotPasswordButton) {

    forgotPasswordButton.addEventListener(
        "click",
        async () => {

            const emailInput =
                document.getElementById(
                    "email"
                );

            const email =
                emailInput.value.trim();

            if (!email) {

                forgotPasswordMessage.textContent =
                    "Enter your email address first.";

                forgotPasswordMessage.className =
                    "message error";

                emailInput.focus();

                return;
            }

            forgotPasswordButton.disabled =
                true;

            forgotPasswordButton.textContent =
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
                    "message success";

            } catch (error) {

                console.error(
                    "PASSWORD RESET ERROR:",
                    error
                );

                forgotPasswordMessage.textContent =
                    error.message;

                forgotPasswordMessage.className =
                    "message error";

            } finally {

                forgotPasswordButton.disabled =
                    false;

                forgotPasswordButton.textContent =
                    "Forgot Password?";
            }

        }
    );

}


// =========================================================
// LOAD STATS
// =========================================================

async function loadStats() {

    const {
        count: productsTotal,
        error: productError
    } =
        await supabaseClient
            .from("products")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            );

    if (productError) {

        console.error(
            "PRODUCT COUNT ERROR:",
            productError
        );
    }


    const {
        data: orders,
        error: orderError
    } =
        await supabaseClient
            .from("orders")
            .select(
                "id,total"
            );

    if (orderError) {

        console.error(
            "ORDER STATS ERROR:",
            orderError
        );

        return;
    }


    productCount.textContent =
        productsTotal || 0;

    orderCount.textContent =
        orders?.length || 0;


    const total =
        (orders || [])
            .reduce(
                (
                    sum,
                    order
                ) =>
                    sum +
                    Number(
                        order.total || 0
                    ),
                0
            );

    revenue.textContent =
        money(total);
}


// =========================================================
// LOAD ORDERS
// =========================================================

async function loadOrders() {

    if (!ordersContainer) {
        return;
    }

    ordersContainer.innerHTML = `
        <div class="loading">
            Loading orders...
        </div>
    `;

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("orders")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (error) {
            throw error;
        }

        allOrders =
            data || [];

        renderOrders();

        console.log(
            "ORDERS LOADED:",
            allOrders.length
        );

    } catch (error) {

        console.error(
            "LOAD ORDERS ERROR:",
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
    }
}


// =========================================================
// RENDER ORDERS
// =========================================================

function renderOrders() {

    const search =
        (
            orderSearch?.value ||
            ""
        )
        .trim()
        .toLowerCase();

    const selectedStatus =
        (
            orderStatusFilter?.value ||
            ""
        )
        .trim()
        .toLowerCase();


    const filtered =
        allOrders.filter(
            order => {

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
                    normalizeStatus(
                        order.status
                    );

                const searchMatch =
                    !search ||
                    id.includes(search) ||
                    name.includes(search) ||
                    email.includes(search);

                const statusMatch =
                    !selectedStatus ||
                    status === selectedStatus;

                return (
                    searchMatch &&
                    statusMatch
                );
            }
        );

    displayOrders(
        filtered
    );
}


// =========================================================
// DISPLAY ORDERS
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
                        Order
                    </th>

                    <th>
                        Customer
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


    orders.forEach(
        order => {

            const status =
                normalizeStatus(
                    order.status
                );

            const date =
                order.created_at
                    ? new Date(
                        order.created_at
                    ).toLocaleDateString()
                    : "—";


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

                        <div class="order-customer-name">

                            ${escapeHTML(
                                order.customer_name ||
                                "—"
                            )}

                        </div>

                        <div class="order-customer-email">

                            ${escapeHTML(
                                order.customer_email ||
                                "—"
                            )}

                        </div>

                    </td>


                    <td>

                        ${money(
                            order.total
                        )}

                    </td>


                    <td>

                        <span
                            class="status ${statusClass(
                                status
                            )}"
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
                            class="order-view-button"
                            onclick="viewOrder(${Number(
                                order.id
                            )})"
                        >
                            View
                        </button>

                    </td>

                </tr>

            `;
        }
    );


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
            Loading order...
        </div>
    `;


    try {

        const {
            data: order,
            error: orderError
        } =
            await supabaseClient
                .from("orders")
                .select("*")
                .eq(
                    "id",
                    orderId
                )
                .single();

        if (orderError) {
            throw orderError;
        }


        const {
            data: items,
            error: itemsError
        } =
            await supabaseClient
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
            throw itemsError;
        }


        renderOrderDetails(
            order,
            items || []
        );

    } catch (error) {

        console.error(
            "VIEW ORDER ERROR:",
            error
        );

        orderDetails.innerHTML = `
            <div class="empty-state">
                ${escapeHTML(
                    error.message
                )}
            </div>
        `;
    }
}


// =========================================================
// RENDER ORDER DETAILS
// =========================================================

function renderOrderDetails(
    order,
    items
) {

    const currentStatus =
        normalizeStatus(
            order.status
        );


    let itemsHTML = "";


    if (!items.length) {

        itemsHTML = `
            <div class="empty-state">
                No products recorded for this order.
            </div>
        `;

    } else {

        itemsHTML =
            items
                .map(
                    item => {

                        const quantity =
                            Number(
                                item.quantity || 0
                            );

                        const price =
                            Number(
                                item.price || 0
                            );

                        const total =
                            quantity * price;


                        return `

                            <div class="order-item">

                                <div>

                                    <strong>

                                        ${escapeHTML(
                                            item.product_name ||
                                            "Product"
                                        )}

                                    </strong>

                                    <div>

                                        ${quantity}
                                        ×
                                        ${money(price)}

                                    </div>

                                </div>


                                <strong>

                                    ${money(total)}

                                </strong>

                            </div>

                        `;
                    }
                )
                .join("");
    }


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

                <p>
                    Order date:
                    ${escapeHTML(
                        order.created_at
                            ? new Date(
                                order.created_at
                            ).toLocaleString()
                            : "—"
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
                    Status
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
                    Update Status
                </button>

            </div>


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

    const select =
        document.getElementById(
            "orderStatus"
        );

    const message =
        document.getElementById(
            "orderStatusMessage"
        );


    if (!select) {
        return;
    }


    const newStatus =
        normalizeStatus(
            select.value
        );


    if (message) {
        message.textContent =
            "Saving...";
    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from("orders")
                .update({
                    status: newStatus
                })
                .eq(
                    "id",
                    orderId
                );

        if (error) {
            throw error;
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

            message.className =
                "order-status-message status-success-text";
        }


    } catch (error) {

        console.error(
            "UPDATE STATUS ERROR:",
            error
        );


        if (message) {

            message.textContent =
                "Could not update order: " +
                error.message;

            message.className =
                "order-status-message status-danger-text";
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
// ORDER SEARCH
// =========================================================

if (orderSearch) {

    orderSearch.addEventListener(
        "input",
        renderOrders
    );
}


// =========================================================
// ORDER FILTER
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

    if (!categoriesContainer) {
        return;
    }

    categoriesContainer.innerHTML = `
        <div class="loading">
            Loading categories...
        </div>
    `;


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("categories")
                .select(
                    "id,name,slug"
                )
                .order(
                    "name",
                    {
                        ascending: true
                    }
                );

        if (error) {
            throw error;
        }


        categories =
            data || [];


        displayCategories(
            categories
        );


        populateCategorySelect(
            categories
        );

    } catch (error) {

        console.error(
            "LOAD CATEGORIES ERROR:",
            error
        );

        categoriesContainer.innerHTML = `
            <div class="empty-state">
                ${escapeHTML(
                    error.message
                )}
            </div>
        `;
    }
}


// =========================================================
// DISPLAY CATEGORIES
// =========================================================

function displayCategories(
    list
) {

    if (!list.length) {

        categoriesContainer.innerHTML = `
            <div class="empty-state">
                No categories yet.
            </div>
        `;

        return;
    }


    categoriesContainer.innerHTML =
        list
            .map(
                category => `

                    <div class="category-card">

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
                                onclick="editCategory(${Number(
                                    category.id
                                )})"
                            >
                                Edit
                            </button>


                            <button
                                type="button"
                                class="danger-button"
                                onclick="deleteCategory(${Number(
                                    category.id
                                )})"
                            >
                                Delete
                            </button>

                        </div>

                    </div>

                `
            )
            .join("");
}


// =========================================================
// CATEGORY FORM
// =========================================================

if (categoryForm) {

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


            if (!name || !slug) {

                alert(
                    "Enter a category name and slug."
                );

                return;
            }


            categorySubmitButton.disabled =
                true;


            try {

                let result;


                if (categoryId.value) {

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


                if (result.error) {
                    throw result.error;
                }


                resetCategoryForm();

                await loadCategories();

            } catch (error) {

                console.error(
                    "SAVE CATEGORY ERROR:",
                    error
                );

                alert(
                    "Could not save category:\n" +
                    error.message
                );

            } finally {

                categorySubmitButton.disabled =
                    false;
            }
        }
    );
}


// =========================================================
// EDIT CATEGORY
// =========================================================

function editCategory(id) {

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
// CANCEL CATEGORY
// =========================================================

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


if (cancelCategoryEdit) {

    cancelCategoryEdit.addEventListener(
        "click",
        resetCategoryForm
    );
}


// =========================================================
// DELETE CATEGORY
// =========================================================

async function deleteCategory(id) {

    const category =
        categories.find(
            item =>
                Number(item.id) ===
                Number(id)
        );

    if (!category) {
        return;
    }


    if (
        !confirm(
            `Delete category "${category.name}"?`
        )
    ) {
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
            "DELETE CATEGORY ERROR:",
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
// AUTO CATEGORY SLUG
// =========================================================

if (categoryName) {

    categoryName.addEventListener(
        "input",
        () => {

            if (categoryId.value) {
                return;
            }

            categorySlug.value =
                slugify(
                    categoryName.value
                );
        }
    );
}


// =========================================================
// CATEGORY SELECT
// =========================================================

function populateCategorySelect(
    list
) {

    if (!productCategory) {
        return;
    }


    const current =
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


    if (current) {
        productCategory.value =
            current;
    }
}


// =========================================================
// LOAD PRODUCTS
// =========================================================

async function loadProducts() {

    if (!productsContainer) {
        return;
    }

    productsContainer.innerHTML = `
        <div class="loading">
            Loading products...
        </div>
    `;


    try {

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
            throw error;
        }


        products =
            data || [];


        displayProducts(
            products
        );

    } catch (error) {

        console.error(
            "LOAD PRODUCTS ERROR:",
            error
        );

        productsContainer.innerHTML = `
            <div class="empty-state">
                ${escapeHTML(
                    error.message
                )}
            </div>
        `;
    }
}


// =========================================================
// DISPLAY PRODUCTS
// =========================================================

function displayProducts(
    list
) {

    if (!list.length) {

        productsContainer.innerHTML = `
            <div class="empty-state">
                No products yet.
            </div>
        `;

        return;
    }


    let html = `

        <table>

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
                            product.category ||
                            "—"
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
                                onclick="editProduct(${Number(
                                    product.id
                                )})"
                            >
                                Edit
                            </button>


                            <button
                                type="button"
                                class="danger-button"
                                onclick="deleteProduct(${Number(
                                    product.id
                                )})"
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
// PRODUCT FORM
// =========================================================

if (productForm) {

    productForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const id =
                productId.value;


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


            if (!product.name) {

                alert(
                    "Enter a product name."
                );

                return;
            }


            if (!product.category) {

                alert(
                    "Select a category."
                );

                return;
            }


            if (
                Number.isNaN(
                    product.price
                )
            ) {

                alert(
                    "Enter a valid price."
                );

                return;
            }


            if (
                Number.isNaN(
                    product.stock
                )
            ) {

                alert(
                    "Enter a valid stock quantity."
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


                if (result.error) {
                    throw result.error;
                }


                resetProductForm();

                await loadProducts();

                await loadStats();


            } catch (error) {

                console.error(
                    "SAVE PRODUCT ERROR:",
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
}


// =========================================================
// EDIT PRODUCT
// =========================================================

function editProduct(id) {

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
// RESET PRODUCT
// =========================================================

function resetProductForm() {

    productForm.reset();

    productId.value =
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


if (cancelEdit) {

    cancelEdit.addEventListener(
        "click",
        resetProductForm
    );
}


// =========================================================
// DELETE PRODUCT
// =========================================================

async function deleteProduct(id) {

    const product =
        products.find(
            item =>
                Number(item.id) ===
                Number(id)
        );

    if (!product) {
        return;
    }


    if (
        !confirm(
            `Delete "${product.name}"?`
        )
    ) {
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
            "DELETE PRODUCT ERROR:",
            error
        );

        alert(
            "Could not delete product:\n" +
            error.message
        );

        return;
    }


    await loadProducts();

    await loadStats();
}


// =========================================================
// IMAGE PREVIEW
// =========================================================

if (productImage) {

    productImage.addEventListener(
        "input",
        () => {

            showImagePreview(
                productImage.value.trim()
            );
        }
    );
}


function showImagePreview(url) {

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
            alt="Product preview"
            onerror="this.parentElement.classList.add('hidden')"
        >

    `;

    imagePreview.classList.remove(
        "hidden"
    );
}


// =========================================================
// AUTH STATE
// =========================================================

supabaseClient.auth.onAuthStateChange(
    (
        event,
        session
    ) => {

        if (
            event ===
            "SIGNED_OUT"
        ) {

            showLogin();

        }

    }
);


// =========================================================
// START
// =========================================================

checkLogin();
