document.addEventListener("DOMContentLoaded", () => {

  checkAdmin();

  const logoutButton =
    document.getElementById("adminLogoutButton");

  if (logoutButton) {
    logoutButton.addEventListener("click", logout);
  }


  const refreshTopups =
    document.getElementById("refreshTopups");

  if (refreshTopups) {
    refreshTopups.addEventListener(
      "click",
      loadTopups
    );
  }


  const refreshProducts =
    document.getElementById("refreshProducts");

  if (refreshProducts) {
    refreshProducts.addEventListener(
      "click",
      loadProducts
    );
  }


  const refreshUsers =
    document.getElementById("refreshUsers");

  if (refreshUsers) {
    refreshUsers.addEventListener(
      "click",
      loadUsers
    );
  }


  const productForm =
    document.getElementById("productForm");

  if (productForm) {
    productForm.addEventListener(
      "submit",
      addProduct
    );
  }

});


async function checkAdmin() {

  try {

    const response =
      await fetch("/api/auth/me");

    const data =
      await response.json();


    if (!data.success || !data.user) {

      window.location.href = "/";
      return;

    }


    if (data.user.role !== "admin") {

      window.location.href = "/shop.html";
      return;

    }


    const username =
      document.getElementById("adminUsername");

    if (username) {

      username.textContent =
        data.user.username;

    }


    await Promise.all([
      loadTopups(),
      loadProducts(),
      loadUsers()
    ]);


  } catch (error) {

    console.error(
      "CHECK ADMIN ERROR:",
      error
    );

    window.location.href = "/";

  }

}



async function loadTopups() {

  const container =
    document.getElementById(
      "topupAdminList"
    );

  if (!container) return;


  container.innerHTML = `
    <div class="admin-loading">
      กำลังโหลดคำขอเติมเครดิต...
    </div>
  `;


  try {

    const response =
      await fetch("/api/admin/topups");

    const data =
      await response.json();


    if (!response.ok || !data.success) {

      container.innerHTML = `
        <div class="admin-empty">
          ไม่สามารถโหลดข้อมูลได้
        </div>
      `;

      return;

    }


    const topups =
      data.topups || [];


    const pendingCount =
      topups.filter(
        item =>
          item.status === "pending"
      ).length;


    const pendingElement =
      document.getElementById(
        "pendingTopups"
      );


    if (pendingElement) {

      pendingElement.textContent =
        pendingCount;

    }


    if (topups.length === 0) {

      container.innerHTML = `
        <div class="admin-empty">
          ยังไม่มีคำขอเติมเครดิต
        </div>
      `;

      return;

    }


    container.innerHTML =
      topups.map(item => {

        let statusText =
          "รอตรวจสอบ";

        let statusClass =
          "pending";


        if (item.status === "approved") {

          statusText =
            "อนุมัติแล้ว";

          statusClass =
            "approved";

        }


        if (item.status === "rejected") {

          statusText =
            "ไม่อนุมัติ";

          statusClass =
            "rejected";

        }


        return `
          <div class="admin-topup-item">

            <div class="admin-topup-main">

              <strong>
                ${escapeHtml(
                  item.username || "-"
                )}
              </strong>

              <span>
                ฿${Number(
                  item.amount || 0
                ).toFixed(2)}
              </span>

              <small>
                ${formatDate(
                  item.created_at
                )}
              </small>

              ${
                item.reference
                  ? `
                    <small>
                      อ้างอิง:
                      ${escapeHtml(
                        item.reference
                      )}
                    </small>
                  `
                  : ""
              }

            </div>


            <div class="admin-topup-actions">

              <span
                class="
                  topup-status
                  ${statusClass}
                "
              >
                ${statusText}
              </span>


              ${
                item.status === "pending"
                  ? `
                    <button
                      class="approve-btn"
                      onclick="
                        approveTopup(
                          ${item.id}
                        )
                      "
                    >
                      อนุมัติ
                    </button>
                  `
                  : ""
              }

            </div>

          </div>
        `;

      }).join("");


  } catch (error) {

    console.error(
      "LOAD TOPUPS ERROR:",
      error
    );

    container.innerHTML = `
      <div class="admin-empty">
        เกิดข้อผิดพลาดในการโหลดข้อมูล
      </div>
    `;

  }

}


async function approveTopup(id) {

  const confirmed =
    confirm(
      "ต้องการอนุมัติคำขอเติมเครดิตนี้หรือไม่?"
    );


  if (!confirmed) {
    return;
  }


  try {

    const response =
      await fetch(
        `/api/admin/topups/${id}/approve`,
        {
          method: "POST"
        }
      );


    const data =
      await response.json();


    if (!response.ok || !data.success) {

      alert(
        data.message ||
        "ไม่สามารถอนุมัติรายการได้"
      );

      return;

    }


    alert(
      "อนุมัติเติมเครดิตเรียบร้อยแล้ว"
    );


    await loadTopups();


  } catch (error) {

    console.error(
      "APPROVE TOPUP ERROR:",
      error
    );

    alert(
      "เกิดข้อผิดพลาด"
    );

  }

}



async function loadProducts() {

  const container =
    document.getElementById(
      "adminProductList"
    );

  if (!container) return;


  container.innerHTML = `
    <div class="admin-loading">
      กำลังโหลดสินค้า...
    </div>
  `;


  try {

    const response =
      await fetch("/api/products");

    const data =
      await response.json();


    if (!response.ok || !data.success) {

      container.innerHTML = `
        <div class="admin-empty">
          ไม่สามารถโหลดสินค้าได้
        </div>
      `;

      return;

    }


    const products =
      data.products || [];


    const totalProducts =
      document.getElementById(
        "totalProducts"
      );


    if (totalProducts) {

      totalProducts.textContent =
        products.length;

    }


    if (products.length === 0) {

      container.innerHTML = `
        <div class="admin-empty">
          ยังไม่มีสินค้า
        </div>
      `;

      return;

    }


    container.innerHTML =
      products.map(product => {

        const category =
          product.category ||
          "อื่นๆ";


        return `
          <div class="admin-product-item">

            <div class="admin-product-image">

              <img
                src="${escapeAttribute(
                  product.image ||
                  "https://placehold.co/100x100"
                )}"
                alt=""
                onerror="
                  this.src =
                  'https://placehold.co/100x100'
                "
              >

            </div>


            <div class="admin-product-info">

              <strong>
                ${escapeHtml(
                  product.name
                )}
              </strong>

              <span>
                ฿${Number(
                  product.price || 0
                ).toFixed(2)}
              </span>

              <small>
                หมวดหมู่:
                ${escapeHtml(
                  category
                )}
              </small>

              <small>
                Stock:
                ${Number(
                  product.stock || 0
                )}
              </small>

            </div>


            <button
              class="delete-product-btn"
              onclick="
                deleteProduct(
                  ${product.id}
                )
              "
            >
              ปิดสินค้า
            </button>

          </div>
        `;

      }).join("");


  } catch (error) {

    console.error(
      "LOAD PRODUCTS ERROR:",
      error
    );

    container.innerHTML = `
      <div class="admin-empty">
        เกิดข้อผิดพลาด
      </div>
    `;

  }

}



async function addProduct(event) {

  event.preventDefault();


  const name =
    document.getElementById(
      "productName"
    ).value.trim();


  const description =
    document.getElementById(
      "productDescription"
    ).value.trim();


  const price =
    Number(
      document.getElementById(
        "productPrice"
      ).value
    );


  const stock =
    Number(
      document.getElementById(
        "productStock"
      ).value
    );


  const image =
    document.getElementById(
      "productImage"
    ).value.trim();


  /*
    อ่านหมวดหมู่สินค้า
  */

  const categoryElement =
    document.getElementById(
      "productCategory"
    );


  const category =
    categoryElement
      ? categoryElement.value
      : "อื่นๆ";


  const button =
    document.getElementById(
      "addProductButton"
    );


  const message =
    document.getElementById(
      "productMessage"
    );


  if (!name) {

    showMessage(
      message,
      "กรุณาใส่ชื่อสินค้า",
      "error"
    );

    return;

  }


  if (!Number.isFinite(price) || price < 0) {

    showMessage(
      message,
      "ราคาสินค้าไม่ถูกต้อง",
      "error"
    );

    return;

  }


  if (!Number.isInteger(stock) || stock < 0) {

    showMessage(
      message,
      "จำนวน Stock ไม่ถูกต้อง",
      "error"
    );

    return;

  }


  button.disabled = true;

  button.textContent =
    "กำลังเพิ่มสินค้า...";


  try {

    const response =
      await fetch(
        "/api/products",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            name,

            description,

            price,

            stock,

            image,

            category

          })
        }
      );


    const data =
      await response.json();


    if (!response.ok || !data.success) {

      showMessage(
        message,
        data.message ||
          "ไม่สามารถเพิ่มสินค้าได้",
        "error"
      );

      return;

    }


    showMessage(
      message,
      "เพิ่มสินค้าเรียบร้อยแล้ว",
      "success"
    );


    document
      .getElementById("productForm")
      .reset();


    await loadProducts();


  } catch (error) {

    console.error(
      "ADD PRODUCT ERROR:",
      error
    );

    showMessage(
      message,
      "เกิดข้อผิดพลาด",
      "error"
    );

  } finally {

    button.disabled = false;

    button.textContent =
      "เพิ่มสินค้า";

  }

}



async function deleteProduct(id) {

  const confirmed =
    confirm(
      "ต้องการปิดสินค้านี้หรือไม่?"
    );


  if (!confirmed) {
    return;
  }


  try {

    const response =
      await fetch(
        `/api/products/${id}`,
        {
          method: "DELETE"
        }
      );


    const data =
      await response.json();


    if (!response.ok || !data.success) {

      alert(
        data.message ||
        "ไม่สามารถปิดสินค้าได้"
      );

      return;

    }


    alert(
      "ปิดสินค้าเรียบร้อยแล้ว"
    );


    await loadProducts();


  } catch (error) {

    console.error(
      "DELETE PRODUCT ERROR:",
      error
    );

    alert(
      "เกิดข้อผิดพลาด"
    );

  }

}


async function loadUsers() {

  const container =
    document.getElementById(
      "adminUserList"
    );

  if (!container) return;


  container.innerHTML = `
    <div class="admin-loading">
      กำลังโหลดผู้ใช้...
    </div>
  `;


  try {

    const response =
      await fetch(
        "/api/admin/users"
      );


    const data =
      await response.json();


    if (!response.ok || !data.success) {

      container.innerHTML = `
        <div class="admin-empty">
          ไม่สามารถโหลดผู้ใช้ได้
        </div>
      `;

      return;

    }


    const users =
      data.users || [];


    const totalUsers =
      document.getElementById(
        "totalUsers"
      );


    if (totalUsers) {

      totalUsers.textContent =
        users.length;

    }


    if (users.length === 0) {

      container.innerHTML = `
        <div class="admin-empty">
          ยังไม่มีผู้ใช้
        </div>
      `;

      return;

    }


    container.innerHTML =
      users.map(user => {

        return `
          <div class="admin-user-item">

            <div>

              <strong>
                ${escapeHtml(
                  user.username
                )}
              </strong>

              <small>
                ID:
                ${user.id}
              </small>

            </div>


            <div>

              <span>
                เครดิต
                ฿${Number(
                  user.credit || 0
                ).toFixed(2)}
              </span>

              <small>
                ${escapeHtml(
                  user.role || "user"
                )}
              </small>

            </div>

          </div>
        `;

      }).join("");


  } catch (error) {

    console.error(
      "LOAD USERS ERROR:",
      error
    );

    container.innerHTML = `
      <div class="admin-empty">
        เกิดข้อผิดพลาด
      </div>
    `;

  }

}



async function logout() {

  try {

    await fetch(
      "/api/auth/logout",
      {
        method: "POST"
      }
    );

  } catch (error) {

    console.error(error);

  }


  window.location.href = "/";

}


function showMessage(
  element,
  text,
  type
) {

  if (!element) return;

  element.textContent =
    text;

  element.className =
    "form-message " + type;

}




function formatDate(dateString) {

  if (!dateString) {
    return "-";
  }


  const date =
    new Date(dateString);


  if (Number.isNaN(date.getTime())) {
    return dateString;
  }


  return date.toLocaleString(
    "th-TH",
    {
      dateStyle: "medium",
      timeStyle: "short"
    }
  );

}


function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function escapeAttribute(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

}