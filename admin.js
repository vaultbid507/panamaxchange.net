
// =========================================================
// NOVASHOP ADMIN
// Supabase Admin Dashboard
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

const productForm =
    document.getElementById(
        "productForm"
    );

const productsContainer =
    document.getElementById(
        "productsContainer"
    );

const categoryForm =
    document.getElementById(
        "categoryForm"
    );

const categoriesContainer =
    document.getElementById(
        "categoriesContainer"
    );

const cancelEdit =
    document.getElementById(
        "cancelEdit"
    );

const cancelCategoryEdit =
    document.getElementById(
        "cancelCategoryEdit"
    );


// =========================================================
// LOGIN
// =========================================================

async function checkLogin() {

    const {
        data,
        error
    } = await supabaseClient
        .auth
        .getSession();


    if (error) {

        console.error(
            "SESSION ERROR:",
            error
        );

        return;

    }


    if (data.session) {

        await showDashboard();

    }

}


async function login(
    email,
    password
) {

    loginMessage.textContent = "";


    const {
        error
    } = await supabaseClient
        .auth
        .signInWithPassword({

            email,
            password

        });


    if (error) {

        loginMessage.textContent =
            error.message;

        return;

    }


    await showDashboard();

}


async function logout() {

    await supabaseClient
        .auth
        .signOut();


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


async function showDashboard() {

    loginSection.classList.add(
        "hidden"
    );

    dashboard.classList.remove(
        "hidden"
    );

    logoutButton.classList.remove(
        "hidden"
    );


    await loadCategories();

    await loadProducts();

    await loadDashboard();

}


loginForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const email =
            document
                .getElementById("email")
                .value
                .trim();


        const password =
            document
                .getElementById("password")
                .value;


        await login(
            email,
            password
        );

    }
);


logoutButton.addEventListener(
    "click",
    logout
);



// =========================================================
// DASHBOARD
// =========================================================

async function loadDashboard() {

    const {
        count: productCount,
        error: productError
    } = await supabaseClient
        .from("products")
        .select(
            "*",
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

        return;

    }


    document.getElementById(
        "productCount"
    ).textContent =
        productCount || 0;


    document.getElementById(
        "orderCount"
    ).textContent =
        orders.length;


    const revenue =
        orders.reduce(
            (
                total,
                order
            ) => {

                return (
                    total +
                    Number(order.total || 0)
                );

            },
            0
        );


    document.getElementById(
        "revenue"
    ).textContent =
        money(revenue);


    displayOrders(
        orders
    );

}



// =========================================================
// ORDERS
// =========================================================

function displayOrders(
    orders
) {

    const container =
        document.getElementById(
            "ordersContainer"
        );


    if (!orders.length) {

        container.innerHTML = `
            <div class="empty-state">
                No orders yet.
            </div>
        `;

        return;

    }


    let html = `

        <div class="table-wrapper">

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
                            Total
                        </th>

                        <th>
                            Status
                        </th>

                        <th>
                            Date
                        </th>

                    </tr>

                </thead>

                <tbody>

    `;


    orders.forEach(
        order => {

            html += `

                <tr>

                    <td>
                        #${escapeHTML(order.id)}
                    </td>

                    <td>
                        ${escapeHTML(
                            order.customer_name
                        )}
                    </td>

                    <td>
                        ${money(order.total)}
                    </td>

                    <td>
                        ${escapeHTML(
                            order.status || "Pending"
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            order.created_at
                        )}
                    </td>

                </tr>

            `;

        }
    );


    html += `

                </tbody>

            </table>

        </div>

    `;


    container.innerHTML =
        html;

}



// =========================================================
// CATEGORIES
// =========================================================

async function loadCategories() {

    const {
        data,
        error
    } = await supabaseClient
        .from("categories")
        .select("*")
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
            <div class="message">
                Could not load categories:
                ${escapeHTML(error.message)}
            </div>
        `;

        return;

    }


    displayCategories(
        data || []
    );


    populateCategorySelect(
        data || []
    );

}


function displayCategories(
    categories
) {

    if (!categories.length) {

        categoriesContainer.innerHTML = `
            <div class="empty-state">
                No categories yet.
            </div>
        `;

        return;

    }


    let html =
        `<div class="category-list">`;


    categories.forEach(
        category => {

            html += `

                <div class="category-row">

                    <div>

                        <div class="category-name">
                            ${escapeHTML(
                                category.name
                            )}
                        </div>

                        <span class="category-slug">
                            /${escapeHTML(
                                category.slug
                            )}
                        </span>

                    </div>


                    <div class="category-actions">

                        <button
                            type="button"
                            class="edit-button"
                            data-edit-category="${category.id}"
                        >
                            Edit
                        </button>


                        <button
                            type="button"
                            class="danger"
                            data-delete-category="${category.id}"
                        >
                            Delete
                        </button>

                    </div>

                </div>

            `;

        }
    );


    html += `</div>`;


    categoriesContainer.innerHTML =
        html;

}


categoriesContainer.addEventListener(
    "click",
    async event => {

        const editButton =
            event.target.closest(
                "[data-edit-category]"
            );


        if (editButton) {

            const id =
                Number(
                    editButton.dataset
                        .editCategory
                );


            const {
                data,
                error
            } = await supabaseClient
                .from("categories")
                .select("*")
                .eq("id", id)
                .single();


            if (error) {

                alert(
                    error.message
                );

                return;

            }


            editCategory(
                data
            );

            return;

        }


        const deleteButton =
            event.target.closest(
                "[data-delete-category]"
            );


        if (deleteButton) {

            await deleteCategory(
                Number(
                    deleteButton.dataset
                        .deleteCategory
                )
            );

        }

    }
);



// =========================================================
// CATEGORY DROPDOWN
// =========================================================

function populateCategorySelect(
    categories
) {

    const select =
        document.getElementById(
            "productCategory"
        );


    const currentValue =
        select.value;


    select.innerHTML = `
        <option value="">
            Select category
        </option>
    `;


    categories.forEach(
        category => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                category.slug;


            option.textContent =
                category.name;


            select.appendChild(
                option
            );

        }
    );


    if (currentValue) {

        select.value =
            currentValue;

    }

}



// =========================================================
// ADD / EDIT CATEGORY
// =========================================================

categoryForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const id =
            document.getElementById(
                "categoryId"
            ).value;


        const name =
            document.getElementById(
                "categoryName"
            ).value.trim();


        const slug =
            document.getElementById(
                "categorySlug"
            ).value
                .trim()
                .toLowerCase()
                .replace(
                    /\s+/g,
                    "-"
                );


        if (!name || !slug) {

            alert(
                "Please enter a category name and slug."
            );

            return;

        }


        let result;


        if (id) {

            result =
                await supabaseClient
                    .from("categories")
                    .update({

                        name,
                        slug

                    })
                    .eq(
                        "id",
                        id
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

            console.error(
                result.error
            );

            alert(
                "Could not save category: " +
                result.error.message
            );

            return;

        }


        resetCategoryForm();

        await loadCategories();

        await loadProducts();

    }
);



function editCategory(
    category
) {

    document.getElementById(
        "categoryId"
    ).value =
        category.id;


    document.getElementById(
        "categoryName"
    ).value =
        category.name;


    document.getElementById(
        "categorySlug"
    ).value =
        category.slug;


    categoryForm
        .querySelector(
            "button[type='submit']"
        )
        .textContent =
        "Update Category";


    cancelCategoryEdit.classList.remove(
        "hidden"
    );


    categoryForm.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

}


cancelCategoryEdit.addEventListener(
    "click",
    resetCategoryForm
);


function resetCategoryForm() {

    categoryForm.reset();


    document.getElementById(
        "categoryId"
    ).value = "";


    categoryForm
        .querySelector(
            "button[type='submit']"
        )
        .textContent =
        "Add Category";


    cancelCategoryEdit.classList.add(
        "hidden"
    );

}


async function deleteCategory(
    id
) {

    if (
        !confirm(
            "Delete this category?"
        )
    ) {

        return;

    }


    const {
        error
    } = await supabaseClient
        .from("categories")
        .delete()
        .eq(
            "id",
            id
        );


    if (error) {

        alert(
            "Could not delete category: " +
            error.message
        );

        return;

    }


    await loadCategories();

    await loadProducts();

}



// =========================================================
// PRODUCTS
// =========================================================

async function loadProducts() {

    const {
        data,
        error
    } = await supabaseClient
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
            <div class="message">
                ${escapeHTML(error.message)}
            </div>
        `;

        return;

    }


    displayAdminProducts(
        data || []
    );

}


function displayAdminProducts(
    products
) {

    if (!products.length) {

        productsContainer.innerHTML = `
            <div class="empty-state">
                No products yet.
            </div>
        `;

        return;

    }


    let html = `

        <div class="table-wrapper">

            <table class="product-table">

                <thead>

                    <tr>

                        <th>
                            Image
                        </th>

                        <th>
                            Name
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


    products.forEach(
        product => {

            const image =
                product.image_url
                    ? `
                        <img
                            src="${escapeAttribute(
                                product.image_url
                            )}"
                            alt="${escapeAttribute(
                                product.name
                            )}"
                        >
                    `
                    : "🛍️";


            html += `

                <tr>

                    <td>
                        ${image}
                    </td>

                    <td>
                        ${escapeHTML(
                            product.name
                        )}
                    </td>

                    <td>
                        ${money(
                            product.price
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            product.category || "-"
                        )}
                    </td>

                    <td>
                        ${Number(
                            product.stock || 0
                        )}
                    </td>

                    <td>

                        <button
                            class="edit-button"
                            data-edit-product="${product.id}"
                        >
                            Edit
                        </button>

                        <button
                            class="danger"
                            data-delete-product="${product.id}"
                        >
                            Delete
                        </button>

                    </td>

                </tr>

            `;

        }
    );


    html += `

                </tbody>

            </table>

        </div>

    `;


    productsContainer.innerHTML =
        html;

}


productsContainer.addEventListener(
    "click",
    async event => {

        const editButton =
            event.target.closest(
                "[data-edit-product]"
            );


        if (editButton) {

            const id =
                Number(
                    editButton.dataset
                        .editProduct
                );


            const {
                data,
                error
            } = await supabaseClient
                .from("products")
                .select("*")
                .eq("id", id)
                .single();


            if (error) {

                alert(
                    error.message
                );

                return;

            }


            editProduct(
                data
            );

            return;

        }


        const deleteButton =
            event.target.closest(
                "[data-delete-product]"
            );


        if (deleteButton) {

            await deleteProduct(
                Number(
                    deleteButton.dataset
                        .deleteProduct
                )
            );

        }

    }
);



// =========================================================
// PRODUCT ADD / UPDATE
// =========================================================

productForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const productId =
            document.getElementById(
                "productId"
            ).value;


        const imageFile =
            document.getElementById(
                "productImageFile"
            ).files[0];


        const existingImage =
            document.getElementById(
                "productImage"
            ).value.trim();


        const product = {

            name:
                document.getElementById(
                    "productName"
                ).value.trim(),

            description:
                document.getElementById(
                    "productDescription"
                ).value.trim(),

            price:
                Number(
                    document.getElementById(
                        "productPrice"
                    ).value
                ),

            category:
                document.getElementById(
                    "productCategory"
                ).value,

            stock:
                Number(
                    document.getElementById(
                        "productStock"
                    ).value
                ),

            image_url:
                existingImage || null

        };


        // Validate image

        if (imageFile) {

            if (
                !imageFile.type.startsWith(
                    "image/"
                )
            ) {

                alert(
                    "Please select an image."
                );

                return;

            }


            if (
                imageFile.size >
                5 * 1024 * 1024
            ) {

                alert(
                    "Image must be smaller than 5 MB."
                );

                return;

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
                error: uploadError
            } = await supabaseClient
                .storage
                .from(
                    "product-images"
                )
                .upload(
                    filePath,
                    imageFile,
                    {
                        cacheControl: "3600",
                        upsert: false
                    }
                );


            if (uploadError) {

                console.error(
                    uploadError
                );

                alert(
                    "Image upload failed: " +
                    uploadError.message
                );

                return;

            }


            const {
                data: publicUrlData
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


        let result;


        if (productId) {

            result =
                await supabaseClient
                    .from("products")
                    .update(product)
                    .eq(
                        "id",
                        productId
                    );

        } else {

            result =
                await supabaseClient
                    .from("products")
                    .insert(product);

        }


        if (result.error) {

            console.error(
                result.error
            );

            alert(
                "Could not save product: " +
                result.error.message
            );

            return;

        }


        resetProductForm();

        await loadProducts();

        await loadDashboard();


        alert(
            productId
                ? "Product updated!"
                : "Product added!"
        );

    }
);



// =========================================================
// EDIT PRODUCT
// =========================================================

async function editProduct(
    product
) {

    document.getElementById(
        "productId"
    ).value =
        product.id;


    document.getElementById(
        "productName"
    ).value =
        product.name || "";


    document.getElementById(
        "productDescription"
    ).value =
        product.description || "";


    document.getElementById(
        "productPrice"
    ).value =
        product.price || 0;


    document.getElementById(
        "productCategory"
    ).value =
        product.category || "";


    document.getElementById(
        "productStock"
    ).value =
        product.stock || 0;


    document.getElementById(
        "productImage"
    ).value =
        product.image_url || "";


    document.getElementById(
        "productImageFile"
    ).value = "";


    productForm
        .querySelector(
            "button[type='submit']"
        )
        .textContent =
        "Update Product";


    cancelEdit.classList.remove(
        "hidden"
    );


    productForm.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

}


cancelEdit.addEventListener(
    "click",
    resetProductForm
);


function resetProductForm() {

    productForm.reset();


    document.getElementById(
        "productId"
    ).value = "";


    document.getElementById(
        "productImage"
    ).value = "";


    productForm
        .querySelector(
            "button[type='submit']"
        )
        .textContent =
        "Add Product";


    cancelEdit.classList.add(
        "hidden"
    );

}



// =========================================================
// DELETE PRODUCT
// =========================================================

async function deleteProduct(
    id
) {

    if (
        !confirm(
            "Are you sure you want to delete this product?"
        )
    ) {

        return;

    }


    const {
        error
    } = await supabaseClient
        .from("products")
        .delete()
        .eq(
            "id",
            id
        );


    if (error) {

        alert(
            "Could not delete product: " +
            error.message
        );

        return;

    }


    await loadProducts();

    await loadDashboard();

}



// =========================================================
// HELPERS
// =========================================================

function money(
    value
) {

    return (
        "$" +
        Number(
            value || 0
        ).toFixed(2)
    );

}


function formatDate(
    value
) {

    if (!value) {

        return "-";

    }


    return new Date(
        value
    ).toLocaleDateString(
        undefined,
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );

}


function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


function escapeAttribute(
    value
) {

    return escapeHTML(
        value
    );

}



// =========================================================
// START
// =========================================================

checkLogin();
