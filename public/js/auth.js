const loginForm =
    document.getElementById("loginForm");

const loginMessage =
    document.getElementById("loginMessage");

const loginButton =
    document.getElementById("loginButton");


if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            const username =
                document
                    .getElementById("username")
                    .value
                    .trim();

            const password =
                document
                    .getElementById("password")
                    .value;


            if (!username || !password) {

                showMessage(
                    loginMessage,
                    "กรุณากรอกข้อมูลให้ครบ",
                    "error"
                );

                return;
            }


            loginButton.disabled = true;

            loginButton.textContent =
                "กำลังเข้าสู่ระบบ...";


            showMessage(
                loginMessage,
                "",
                ""
            );


            try {

                const response =
                    await fetch(
                        "/api/auth/login",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            credentials: "include",

                            body: JSON.stringify({
                                username,
                                password
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
                        "เข้าสู่ระบบไม่สำเร็จ"
                    );
                }


                showMessage(
                    loginMessage,
                    "เข้าสู่ระบบสำเร็จ กำลังเข้าสู่ร้าน...",
                    "success"
                );


                setTimeout(() => {

                    if (
                        data.user &&
                        data.user.role === "admin"
                    ) {

                        window.location.href =
                            "/admin.html";

                    } else {

                        window.location.href =
                            "/shop.html";
                    }

                }, 500);


            } catch (error) {

                console.error(error);


                showMessage(
                    loginMessage,
                    error.message ||
                    "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้",
                    "error"
                );


                loginButton.disabled = false;

                loginButton.textContent =
                    "เข้าสู่ระบบ";
            }

        }
    );

}

const registerForm =
    document.getElementById("registerForm");

const registerMessage =
    document.getElementById("registerMessage");

const registerButton =
    document.getElementById("registerButton");


if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const username =
                document
                    .getElementById("username")
                    .value
                    .trim();

            const password =
                document
                    .getElementById("password")
                    .value;

            const confirmPassword =
                document
                    .getElementById("confirmPassword")
                    .value;

            if (!username) {

                showMessage(
                    registerMessage,
                    "กรุณากรอกชื่อผู้ใช้",
                    "error"
                );

                return;
            }


            if (
                username.length < 3 ||
                username.length > 30
            ) {

                showMessage(
                    registerMessage,
                    "ชื่อผู้ใช้ต้องมี 3-30 ตัวอักษร",
                    "error"
                );

                return;
            }


            if (
                !/^[A-Za-z0-9_]+$/.test(
                    username
                )
            ) {

                showMessage(
                    registerMessage,
                    "ชื่อผู้ใช้ใช้ได้เฉพาะ A-Z, a-z, 0-9 และ _",
                    "error"
                );

                return;
            }

            if (password.length < 6) {

                showMessage(
                    registerMessage,
                    "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
                    "error"
                );

                return;
            }


            if (
                password !== confirmPassword
            ) {

                showMessage(
                    registerMessage,
                    "รหัสผ่านไม่ตรงกัน",
                    "error"
                );

                return;
            }

            registerButton.disabled = true;

            registerButton.textContent =
                "กำลังสมัครสมาชิก...";


            showMessage(
                registerMessage,
                "",
                ""
            );


            try {

                const response =
                    await fetch(
                        "/api/auth/register",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                username,
                                password,
                                confirmPassword
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
                        "สมัครสมาชิกไม่สำเร็จ"
                    );
                }

                showMessage(
                    registerMessage,
                    "สมัครสมาชิกสำเร็จ กำลังไปหน้าเข้าสู่ระบบ...",
                    "success"
                );


                registerButton.textContent =
                    "สมัครสำเร็จ";


                setTimeout(() => {

                    window.location.href =
                        "/";

                }, 1000);


            } catch (error) {

                console.error(error);


                showMessage(
                    registerMessage,
                    error.message ||
                    "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้",
                    "error"
                );


                registerButton.disabled =
                    false;

                registerButton.textContent =
                    "สมัครสมาชิก";
            }

        }
    );

}

function showMessage(
    element,
    message,
    type
) {

    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.className =
        type
            ? `message ${type}`
            : "message";
}