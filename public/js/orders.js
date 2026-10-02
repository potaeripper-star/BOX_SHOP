document.addEventListener("DOMContentLoaded", () => {

  const ordersList = document.getElementById("ordersList");
  const usernameDisplay = document.getElementById("usernameDisplay");
  const logoutButton = document.getElementById("logoutButton");
  const refreshOrders = document.getElementById("refreshOrders");


  async function checkUser() {

    try {

      const response = await fetch("/api/auth/me");

      const data = await response.json();

      if (!data.success || !data.user) {

        window.location.href = "/";

        return null;
      }

      if (data.user.role === "admin") {

        window.location.href = "/admin.html";

        return null;
      }

      usernameDisplay.textContent = data.user.username;

      return data.user;

    } catch (error) {

      console.error(error);

      window.location.href = "/";

      return null;
    }
  }


  async function loadOrders() {

    ordersList.innerHTML = `
      <div class="orders-loading">
        กำลังโหลดประวัติออเดอร์...
      </div>
    `;


    try {

      const response = await fetch("/api/orders");

      const data = await response.json();


      if (!response.ok || !data.success) {

        throw new Error(
          data.message || "ไม่สามารถโหลดประวัติออเดอร์ได้"
        );

      }


      const orders = data.orders || [];


      if (orders.length === 0) {

        ordersList.innerHTML = `
          <div class="orders-empty">

            <div class="orders-empty-icon">
              📦
            </div>

            <h2>
              ยังไม่มีประวัติออเดอร์
            </h2>

            <p>
              เมื่อมึงซื้อสินค้า รายการสั่งซื้อจะแสดงตรงนี้
            </p>

            <a href="/shop.html" class="primary-btn">
              ไปที่ร้านค้า
            </a>

          </div>
        `;

        return;
      }


      ordersList.innerHTML = orders.map(order => {

        const status =
          order.completed === 1
            ? "สำเร็จ"
            : "กำลังดำเนินการ";


        const statusClass =
          order.completed === 1
            ? "success"
            : "pending";


        const date = formatDate(order.created_at);


        return `
          <article class="order-card">

            <div class="order-image">

              ${
                order.product_image
                  ? `<img
                      src="${escapeHtml(order.product_image)}"
                      alt="${escapeHtml(order.product_name || "สินค้า")}"
                      onerror="this.src='https://placehold.co/160x120?text=BOXSHOP'"
                    >`
                  : `
                    <img
                      src="https://placehold.co/160x120?text=BOXSHOP"
                      alt="BOXSHOP"
                    >
                  `
              }

            </div>


            <div class="order-info">

              <div class="order-top">

                <h2>
                  ${escapeHtml(order.product_name || "สินค้า")}
                </h2>

                <span class="order-status ${statusClass}">
                  ${status}
                </span>

              </div>


              <div class="order-details">

                <div>
                  <span>Order ID</span>
                  <strong>#${order.id}</strong>
                </div>


                <div>
                  <span>จำนวน</span>
                  <strong>${order.quantity}</strong>
                </div>


                <div>
                  <span>ราคา</span>
                  <strong>
                    ${formatMoney(order.total)}
                  </strong>
                </div>


                <div>
                  <span>วันที่</span>
                  <strong>
                    ${date}
                  </strong>
                </div>

              </div>

            </div>

          </article>
        `;

      }).join("");


    } catch (error) {

      console.error("LOAD ORDERS ERROR:", error);

      ordersList.innerHTML = `
        <div class="orders-error">

          <h2>
            โหลดประวัติไม่สำเร็จ
          </h2>

          <p>
            ${escapeHtml(error.message)}
          </p>

          <button
            class="secondary-btn"
            onclick="location.reload()"
          >
            ลองใหม่
          </button>

        </div>
      `;

    }

  }


  function formatMoney(value) {

    const number = Number(value) || 0;

    return number.toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + " เครดิต";

  }


  function formatDate(value) {

    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short"
    });

  }


  function escapeHtml(value) {

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }


  refreshOrders.addEventListener(
    "click",
    loadOrders
  );


  logoutButton.addEventListener(
    "click",
    async () => {

      try {

        await fetch("/api/auth/logout", {
          method: "POST"
        });

      } catch (error) {

        console.error(error);

      }

      window.location.href = "/";

    }
  );


  async function init() {

    const user = await checkUser();

    if (!user) {
      return;
    }

    await loadOrders();

  }


  init();

});