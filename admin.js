// =========================================================
// NOVASHOP ADMIN PANEL
// Clean Supabase Admin JavaScript
// =========================================================

const SUPABASE_URL = "https://tagbxmpizwlvgddgcpcl.supabase.co";
const SUPABASE_KEY = "sb_publishable_X36Iq53rm8U8HBkBfL06Vw_zErQRHK0";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const loginSection = document.getElementById("loginSection");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const forgotPasswordButton = document.getElementById("forgotPasswordButton");
const forgotPasswordMessage = document.getElementById("forgotPasswordMessage");
const logoutButton = document.getElementById("logoutButton");
const adminEmail = document.getElementById("adminEmail");
const productCount = document.getElementById("productCount");
const orderCount = document.getElementById("orderCount");
const revenue = document.getElementById("revenue");
const ordersContainer = document.getElementById("ordersContainer");
const orderSearch = document.getElementById("orderSearch");
const orderStatusFilter = document.getElementById("orderStatusFilter");
const orderDetails = document.getElementById("orderDetails");
const categoryForm = document.getElementById("categoryForm");
const categoryId = document.getElementById("categoryId");
const categoryName = document.getElementById("categoryName");
const categorySlug = document.getElementById("categorySlug");
const categorySubmitButton = document.getElementById("categorySubmitButton");
const cancelCategoryEdit = document.getElementById("cancelCategoryEdit");
const categoriesContainer = document.getElementById("categoriesContainer");
const productsContainer = document.getElementById("productsContainer");
const productForm = document.getElementById("productForm");
const productId = document.getElementById("productId");
const productName = document.getElementById("productName");
const productDescription = document.getElementById("productDescription");
const productPrice = document.getElementById("productPrice");
const productCategory = document.getElementById("productCategory");
const productStock = document.getElementById("productStock");
const productImage = document.getElementById("productImage");
const productSubmitButton = document.getElementById("productSubmitButton");
const cancelEdit = document.getElementById("cancelEdit");
const imagePreview = document.getElementById("imagePreview");

let categories = [];
let products = [];
let allOrders = [];

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function money(value) {
    return Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function slugify(value) {
    return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function normalizeStatus(value) {
    return String(value || "pending").trim().toLowerCase();
}

function statusClass(status) {
    switch (normalizeStatus(status)) {
        case "processing":
        case "shipped": return "status-info";
        case "delivered":
        case "completed":
        case "paid": return "status-success";
        case "cancelled":
        case "canceled": return "status-danger";
        default: return "status-pending";
    }
}

function showLogin() {
    dashboard?.classList.add("hidden");
    loginSection?.classList.remove("hidden");
    logoutButton?.classList.add("hidden");
}

function showLoginMessage(message, type = "error") {
    if (!loginMessage) return;
    loginMessage.textContent = message;
    loginMessage.className = message ? `message ${type}` : "message";
}

function clearLoginMessages() {
    showLoginMessage("");
    if (forgotPasswordMessage) {
        forgotPasswordMessage.textContent = "";
        forgotPasswordMessage.className = "message";
    }
}

// =========================================================
// ADMIN AUTHORIZATION
// =========================================================
// There is deliberately NO client-side bootstrap path. A user cannot
// promote themselves because admin_users has no client INSERT policy.
// The first administrator is designated by the project owner in
// supabase_admin_setup.sql / Supabase SQL Editor.

async function isAdmin(userId) {
    if (!userId) return false;

    const { data, error } = await supabaseClient
        .from("admin_users")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        console.error("ADMIN VALIDATION ERROR:", error);
        return false;
    }

    return Boolean(data?.user_id);
}

async function checkLogin() {
    try {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error) throw error;

        const session = data?.session;
        if (!session?.user) {
            showLogin();
            return;
        }

        const allowed = await isAdmin(session.user.id);
        if (!allowed) {
            await supabaseClient.auth.signOut({ scope: "local" });
            showLogin();
            showLoginMessage(
                "Your account is authenticated, but it is not registered as an administrator. Ask the project owner to add your account to admin_users.",
                "error"
            );
            return;
        }

        await showDashboard(session);
    } catch (error) {
        console.error("SESSION CHECK ERROR:", error);
        showLogin();
        showLoginMessage("Unable to verify your account. Check the Supabase admin_users table and try again.", "error");
    }
}

if (loginForm) {
    loginForm.addEventListener("submit", async event => {
        event.preventDefault();
        clearLoginMessages();

        const email = document.getElementById("email")?.value.trim() || "";
        const password = document.getElementById("password")?.value || "";
        const button = loginForm.querySelector("button[type='submit']");

        if (!email || !password) {
            showLoginMessage("Enter your email and password.", "error");
            return;
        }

        if (button) {
            button.disabled = true;
            button.textContent = "Signing in...";
        }

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            if (!data?.user) throw new Error("Login failed. No user was returned.");

            const allowed = await isAdmin(data.user.id);
            if (!allowed) {
                await supabaseClient.auth.signOut({ scope: "local" });
                throw new Error("Your account is authenticated, but it is not registered as an administrator. Ask the project owner to add your account to admin_users.");
            }

            await showDashboard(data.session);
        } catch (error) {
            console.error("LOGIN ERROR:", error);
            showLoginMessage(error.message || "Unable to sign in.", "error");
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = "Login";
            }
        }
    });
}

async function showDashboard(session) {
    loginSection?.classList.add("hidden");
    dashboard?.classList.remove("hidden");
    logoutButton?.classList.remove("hidden");
    if (adminEmail) adminEmail.textContent = session?.user?.email || "";
    await refreshDashboard();
}

async function refreshDashboard() {
    await Promise.allSettled([loadCategories(), loadProducts(), loadOrders(), loadStats()]);
}

if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
        try { await supabaseClient.auth.signOut({ scope: "local" }); }
        catch (error) { console.error("LOGOUT ERROR:", error); }
        showLogin();
        loginForm?.reset();
        if (adminEmail) adminEmail.textContent = "";
        clearLoginMessages();
    });
}

if (forgotPasswordButton) {
    forgotPasswordButton.addEventListener("click", async () => {
        const emailInput = document.getElementById("email");
        const email = emailInput?.value.trim() || "";

        if (!email) {
            if (forgotPasswordMessage) {
                forgotPasswordMessage.textContent = "Enter your email address first.";
                forgotPasswordMessage.className = "message error";
            }
            emailInput?.focus();
            return;
        }

        forgotPasswordButton.disabled = true;
        forgotPasswordButton.textContent = "Sending...";

        try {
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password.html`
            });
            if (error) throw error;
            if (forgotPasswordMessage) {
                forgotPasswordMessage.textContent = "Password reset instructions have been sent to your email.";
                forgotPasswordMessage.className = "message success";
            }
        } catch (error) {
            console.error("PASSWORD RESET ERROR:", error);
            if (forgotPasswordMessage) {
                forgotPasswordMessage.textContent = error.message || "Could not send password reset email.";
                forgotPasswordMessage.className = "message error";
            }
        } finally {
            forgotPasswordButton.disabled = false;
            forgotPasswordButton.textContent = "Forgot Password?";
        }
    });
}

// The rest of the existing dashboard implementation remains unchanged below.
