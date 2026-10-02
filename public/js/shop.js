let currentUser = null;

let products = [];

let selectedProduct = null;

let selectedCategory = "ทั้งหมด";


const productList =
    document.getElementById("productList");

const usernameDisplay =
    document.getElementById("usernameDisplay");

const creditDisplay =
    document.getElementById("creditDisplay");

const heroCredit =
    document.getElementById("heroCredit");

const shopMessage =
    document.getElementById("shopMessage");

const refreshProducts =
    document.getElementById("refreshProducts");

const logoutButton =
    document.getElementById("logoutButton");

const buyModal =
    document.getElementById("buyModal");

const closeBuyModal =
    document.getElementById("closeBuyModal");

const modalProductImage =
    document.getElementById(
        "modalProductImage"
    );

const modalProductName =
    document.getElementById(
        "modalProductName"
    );

const modalProductDescription =
    document.getElementById(
        "modalProductDescription"
    );

const modalProductPrice =
    document.getElementById(
        "modalProductPrice"
    );

const modalProductStock =
    document.getElementById(
        "modalProductStock"
    );

const buyQuantity =
    document.getElementById(
        "buyQuantity"
    );

const modalTotal =
    document.getElementById(
        "modalTotal"
    );

const buyMessage =
    document.getElementById(
        "buyMessage"
    );

const confirmBuy =
    document.getElementById(
        "confirmBuy"
    );

const categoryButtons =
    document.querySelectorAll(
        ".category-btn"
    );


document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setupCategoryButtons();

        const loggedIn =
            await loadCurrentUser();

        if (!loggedIn) {
            return;
        }

        await loadProducts();

    }
);


function setupCategoryButtons() {

    categoryButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    selectedCategory =
                        button.dataset.category ||
                        "ทั้งหมด";


                    categoryButtons.forEach(
                        btn => {

                            btn.classList.remove(
                                "active"
                            );

                        }
                    );


                    button.classList.add(
                        "active"
                    );


                    renderProducts();

                }
            );

        }
    );

}


async function loadCurrentUser() {

    try {

        const response =
            await fetch(
                "/api/auth/me",
                {
                    credentials: "include"
                }
            );


        if (!response.ok) {

            window.location.href = "/";

            return false;
        }


        const data =
            await response.json();


        if (!data.success) {

            window.location.href = "/";

            return false;
        }


        currentUser =
            data.user;


        /*
            ถ้า Admin เปิด shop.html
            ส่งกลับหน้า Admin
        */

        if (
            currentUser.role === "admin"
        ) {

            window.location.href =
                "/admin.html";

            return false;
        }


        updateUserUI();


        return true;

    } catch (error) {

        console.error(error);

        window.location.href = "/";

        return false;
    }
}


function updateUserUI() {

    if (!currentUser) {
        return;
    }


    usernameDisplay.textContent =
        currentUser.username;


    updateCreditUI(
        currentUser.credit
    );
}


function updateCreditUI(
    credit
) {

    const amount =
        Number(credit || 0);


    const formatted =
        formatMoney(amount);


    creditDisplay.textContent =
        `เครดิต ${formatted}`;


    heroCredit.textContent =
        formatted;
}


async function loadProducts() {

    productList.innerHTML = `
        <div class="loading-card">

            <div class="loading-spinner"></div>

            <p>
                กำลังโหลดสินค้า...
            </p>

        </div>
    `;


    try {

        const response =
            await fetch(
                "/api/products"
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "โหลดสินค้าไม่สำเร็จ"
            );
        }


        products =
            data.products || [];


        renderProducts();

    } catch (error) {

        console.error(error);


        productList.innerHTML = `
            <div class="empty-card">

                <div class="empty-icon">
                    !
                </div>

                <h3>
                    โหลดสินค้าไม่สำเร็จ
                </h3>

                <p>
                    ${escapeHtml(
                        error.message
                    )}
                </p>

                <button
                    class="refresh-button"
                    onclick="loadProducts()"
                >
                    ลองใหม่
                </button>

            </div>
        `;
    }
}

function renderProducts() {

    if (!products.length) {

        productList.innerHTML = `
            <div class="empty-card">

                <div class="empty-icon">
                    🛍
                </div>

                <h3>
                    ยังไม่มีสินค้า
                </h3>

                <p>
                    ตอนนี้ร้านยังไม่มีสินค้า
                </p>

            </div>
        `;

        return;
    }


    /*
        กรองสินค้าตามหมวดหมู่
    */

    const filteredProducts =
        selectedCategory === "ทั้งหมด"
            ? products
            : products.filter(
                product =>
                    String(
                        product.category ||
                        "อื่นๆ"
                    ) === selectedCategory
            );


    if (!filteredProducts.length) {

        productList.innerHTML = `
            <div class="empty-card">

                <div class="empty-icon">
                    📦
                </div>

                <h3>
                    ยังไม่มีสินค้าในหมวดนี้
                </h3>

                <p>
                    ลองเลือกหมวดหมู่อื่น
                </p>

            </div>
        `;

        return;
    }


    productList.innerHTML =
        filteredProducts
            .map(
                product =>
                    createProductCard(
                        product
                    )
            )
            .join("");
}

function createProductCard(
    product
) {

    const stock =
        Number(product.stock || 0);


    const price =
        Number(product.price || 0);


    const soldOut =
        stock <= 0;


    const image =
        product.image &&
        product.image.trim()
            ? product.image
            : createPlaceholderImage(
                product.name
            );


    return `
        <article class="product-card">

            <div class="product-image-wrapper">

                <img
                    class="product-image"
                    src="${escapeAttribute(
                        image
                    )}"
                    alt="${escapeAttribute(
                        product.name
                    )}"
                    loading="lazy"
                    onerror="
                        this.src =
                        '${createPlaceholderImage(
                            product.name
                        )}'
                    "
                >


                <span
                    class="
                        product-stock
                        ${soldOut
                            ? "out"
                            : ""
                        }
                    "
                >
                    ${
                        soldOut
                            ? "หมด"
                            : `เหลือ ${stock}`
                    }
                </span>

            </div>


            <div class="product-body">

                <h3 class="product-name">
                    ${escapeHtml(
                        product.name
                    )}
                </h3>


                <p class="product-description">

                    ${
                        product.description
                            ? escapeHtml(
                                product.description
                            )
                            : "ไม่มีรายละเอียดสินค้า"
                    }

                </p>


                <div class="product-bottom">

                    <div class="product-price">
                        ${formatMoney(price)}
                    </div>


                    <button
                        class="buy-button"
                        ${
                            soldOut
                                ? "disabled"
                                : ""
                        }
                        onclick="
                            openBuyModal(
                                ${Number(product.id)}
                            )
                        "
                    >
                        ${
                            soldOut
                                ? "สินค้าหมด"
                                : "ซื้อสินค้า"
                        }
                    </button>

                </div>

            </div>

        </article>
    `;
}


function openBuyModal(
    productId
) {

    selectedProduct =
        products.find(
            product =>
                Number(product.id) ===
                Number(productId)
        );


    if (!selectedProduct) {

        return;
    }


    const stock =
        Number(
            selectedProduct.stock || 0
        );


    if (stock <= 0) {

        return;
    }


    const price =
        Number(
            selectedProduct.price || 0
        );


    const image =
        selectedProduct.image &&
        selectedProduct.image.trim()
            ? selectedProduct.image
            : createPlaceholderImage(
                selectedProduct.name
            );


    modalProductImage.src =
        image;


    modalProductImage.alt =
        selectedProduct.name;


    modalProductName.textContent =
        selectedProduct.name;


    modalProductDescription.textContent =
        selectedProduct.description ||
        "ไม่มีรายละเอียดสินค้า";


    modalProductPrice.textContent =
        formatMoney(price);


    modalProductStock.textContent =
        `เหลือ ${stock}`;


    buyQuantity.max =
        stock;


    buyQuantity.value =
        1;


    updateModalTotal();


    buyMessage.textContent =
        "";

    buyMessage.className =
        "message";


    confirmBuy.disabled =
        false;


    confirmBuy.textContent =
        "ยืนยันการซื้อ";


    buyModal.classList.remove(
        "hidden"
    );
}


function closeModal() {

    buyModal.classList.add(
        "hidden"
    );

    selectedProduct =
        null;
}


closeBuyModal.addEventListener(
    "click",
    closeModal
);


buyModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            buyModal
        ) {

            closeModal();
        }
    }
);

buyQuantity.addEventListener(
    "input",
    updateModalTotal
);


function updateModalTotal() {

    if (!selectedProduct) {
        return;
    }


    let quantity =
        Number(
            buyQuantity.value
        );


    const stock =
        Number(
            selectedProduct.stock
        );


    if (
        !Number.isInteger(quantity) ||
        quantity < 1
    ) {

        quantity = 1;

        buyQuantity.value =
            1;
    }


    if (quantity > stock) {

        quantity = stock;

        buyQuantity.value =
            stock;
    }


    const price =
        Number(
            selectedProduct.price
        );


    const total =
        price * quantity;


    modalTotal.textContent =
        formatMoney(total);
}


confirmBuy.addEventListener(
    "click",
    async () => {

        if (!selectedProduct) {
            return;
        }


        const quantity =
            Number(
                buyQuantity.value
            );


        if (
            !Number.isInteger(quantity) ||
            quantity <= 0
        ) {

            showBuyMessage(
                "จำนวนสินค้าไม่ถูกต้อง",
                "error"
            );

            return;
        }


        confirmBuy.disabled =
            true;


        confirmBuy.textContent =
            "กำลังซื้อ...";


        showBuyMessage(
            "",
            ""
        );


        try {

            const response =
                await fetch(
                    "/api/orders",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        credentials: "include",

                        body: JSON.stringify({
                            productId:
                                selectedProduct.id,

                            quantity
                        })
                    }
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(
                    data.message ||
                    "ซื้อสินค้าไม่สำเร็จ"
                );
            }


            showBuyMessage(
                "ซื้อสินค้าสำเร็จ",
                "success"
            );

            await loadCurrentUser();


            await loadProducts();


            setTimeout(() => {

                closeModal();

            }, 700);


        } catch (error) {

            console.error(error);


            showBuyMessage(
                error.message ||
                "ซื้อสินค้าไม่สำเร็จ",
                "error"
            );


            confirmBuy.disabled =
                false;


            confirmBuy.textContent =
                "ยืนยันการซื้อ";
        }
    }
);


function showBuyMessage(
    message,
    type
) {

    buyMessage.textContent =
        message;


    buyMessage.className =
        type
            ? `message ${type}`
            : "message";
}


refreshProducts.addEventListener(
    "click",
    async () => {

        refreshProducts.disabled =
            true;

        refreshProducts.textContent =
            "กำลังโหลด...";


        await loadProducts();


        refreshProducts.disabled =
            false;

        refreshProducts.textContent =
            "↻ รีเฟรช";
    }
);


logoutButton.addEventListener(
    "click",
    async () => {

        logoutButton.disabled =
            true;

        logoutButton.textContent =
            "กำลังออก...";


        try {

            await fetch(
                "/api/auth/logout",
                {
                    method: "POST",
                    credentials: "include"
                }
            );

        } catch (error) {

            console.error(error);
        }


        window.location.href =
            "/";
    }
);


function formatMoney(
    amount
) {

    return new Intl.NumberFormat(
        "th-TH",
        {
            style: "currency",
            currency: "THB",
            minimumFractionDigits: 2
        }
    ).format(
        Number(amount || 0)
    );
}

function escapeHtml(
    value
) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function escapeAttribute(
    value
) {

    return escapeHtml(value);
}

function createPlaceholderImage(
    name
) {

    const text =
        encodeURIComponent(
            String(name || "BOXSHOP")
                .slice(0, 20)
        );


    return `https://placehold.co/800x500/0d1422/ffffff?text=${text}`;
}