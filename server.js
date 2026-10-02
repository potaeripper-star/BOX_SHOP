require("dotenv").config();

const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const bcrypt = require("bcrypt");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const app = express();

const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {
        recursive: true
    });
}

const db = new Database(
    path.join(DATA_DIR, "boxshop.db")
);

db.pragma("journal_mode = WAL");

app.use(
    helmet({
        contentSecurityPolicy: false
    })
);

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            "boxshop-development-secret",

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: false,
            maxAge:
                1000 *
                60 *
                60 *
                24 *
                7
        }
    })
);

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        credit REAL NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        price REAL NOT NULL DEFAULT 0,
        stock INTEGER NOT NULL DEFAULT 0,
        image TEXT DEFAULT '',
        category TEXT NOT NULL DEFAULT 'อื่นๆ',
        active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        total REAL NOT NULL,
        completed INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
            REFERENCES users(id),

        FOREIGN KEY (product_id)
            REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS topups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        reference TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
    );
`);

try {

    db.prepare(`
        ALTER TABLE products
        ADD COLUMN category TEXT
        NOT NULL DEFAULT 'อื่นๆ'
    `).run();

    console.log(
        "เพิ่ม category ให้ products แล้ว"
    );

} catch (error) {

    if (
        !error.message.includes(
            "duplicate column name"
        )
    ) {

        console.error(
            "CATEGORY MIGRATION ERROR:",
            error.message
        );

    }

}

function requireLogin(
    req,
    res,
    next
) {

    if (!req.session.user) {

        return res.status(401).json({
            success: false,
            message:
                "กรุณาเข้าสู่ระบบ"
        });

    }

    next();
}


function requireAdmin(
    req,
    res,
    next
) {

    if (!req.session.user) {

        return res.status(401).json({
            success: false,
            message:
                "กรุณาเข้าสู่ระบบ"
        });

    }

    if (
        req.session.user.role !==
        "admin"
    ) {

        return res.status(403).json({
            success: false,
            message:
                "ไม่มีสิทธิ์เข้าถึงส่วนนี้"
        });

    }

    next();
}

app.post(
    "/api/auth/register",
    async (req, res) => {

        try {

            const {
                username,
                password,
                confirmPassword
            } = req.body;


            if (
                !username ||
                !password
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "กรุณากรอกข้อมูลให้ครบ"
                });

            }


            if (
                username.length < 3 ||
                username.length > 30
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "ชื่อผู้ใช้ต้องมี 3-30 ตัวอักษร"
                });

            }


            if (
                !/^[A-Za-z0-9_]+$/.test(
                    username
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "ชื่อผู้ใช้ใช้ได้เฉพาะ A-Z, a-z, 0-9 และ _"
                });

            }


            if (
                password.length < 6
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "รหัสผ่านต้องมีอย่างน้อย 6 ตัว"
                });

            }


            if (
                confirmPassword !==
                undefined &&
                password !==
                confirmPassword
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "รหัสผ่านไม่ตรงกัน"
                });

            }


            const existingUser =
                db.prepare(`
                    SELECT id
                    FROM users
                    WHERE username = ?
                `).get(username);


            if (existingUser) {

                return res.status(409).json({
                    success: false,
                    message:
                        "ชื่อผู้ใช้นี้มีอยู่แล้ว"
                });

            }


            const passwordHash =
                await bcrypt.hash(
                    password,
                    12
                );


            const result =
                db.prepare(`
                    INSERT INTO users
                    (
                        username,
                        password_hash,
                        role,
                        credit,
                        active
                    )
                    VALUES (
                        ?,
                        ?,
                        'user',
                        0,
                        1
                    )
                `).run(
                    username,
                    passwordHash
                );


            return res.json({
                success: true,
                message:
                    "สมัครสมาชิกสำเร็จ",
                userId:
                    result.lastInsertRowid
            });

        } catch (error) {

            console.error(
                "REGISTER ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "เกิดข้อผิดพลาดในเซิร์ฟเวอร์"
            });

        }

    }
);

app.post(
    "/api/auth/login",
    async (req, res) => {

        try {

            const {
                username,
                password
            } = req.body;


            if (
                !username ||
                !password
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน"
                });

            }


            const user =
                db.prepare(`
                    SELECT *
                    FROM users
                    WHERE username = ?
                `).get(username);


            if (!user) {

                return res.status(401).json({
                    success: false,
                    message:
                        "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
                });

            }


            if (!user.active) {

                return res.status(403).json({
                    success: false,
                    message:
                        "บัญชีนี้ถูกปิดใช้งาน"
                });

            }


            const passwordCorrect =
                await bcrypt.compare(
                    password,
                    user.password_hash
                );


            if (!passwordCorrect) {

                return res.status(401).json({
                    success: false,
                    message:
                        "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
                });

            }


            req.session.user = {
                id: user.id,
                username: user.username,
                role: user.role
            };


            return res.json({
                success: true,
                message:
                    "เข้าสู่ระบบสำเร็จ",

                user: {
                    id: user.id,
                    username:
                        user.username,
                    role:
                        user.role,
                    credit:
                        user.credit
                }
            });

        } catch (error) {

            console.error(
                "LOGIN ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "เกิดข้อผิดพลาดในเซิร์ฟเวอร์"
            });

        }

    }
);

app.get(
    "/api/auth/me",
    requireLogin,
    (req, res) => {

        const user =
            db.prepare(`
                SELECT
                    id,
                    username,
                    role,
                    credit,
                    active,
                    created_at
                FROM users
                WHERE id = ?
            `).get(
                req.session.user.id
            );


        if (!user) {

            return res.status(404).json({
                success: false,
                message:
                    "ไม่พบผู้ใช้"
            });

        }


        res.json({
            success: true,
            user
        });

    }
);

app.post(
    "/api/auth/logout",
    (req, res) => {

        req.session.destroy(
            () => {

                res.json({
                    success: true,
                    message:
                        "ออกจากระบบแล้ว"
                });

            }
        );

    }
);

app.get(
    "/api/products",
    (req, res) => {

        try {

            const products =
                db.prepare(`
                    SELECT
                        id,
                        name,
                        description,
                        price,
                        stock,
                        image,
                        category,
                        created_at
                    FROM products
                    WHERE active = 1
                    ORDER BY id DESC
                `).all();


            res.json({
                success: true,
                products
            });

        } catch (error) {

            console.error(
                "GET PRODUCTS ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "ไม่สามารถโหลดสินค้าได้"
            });

        }

    }
);

app.get(
    "/api/products/:id",
    (req, res) => {

        try {

            const product =
                db.prepare(`
                    SELECT
                        id,
                        name,
                        description,
                        price,
                        stock,
                        image,
                        category,
                        created_at
                    FROM products
                    WHERE id = ?
                    AND active = 1
                `).get(
                    req.params.id
                );


            if (!product) {

                return res.status(404).json({
                    success: false,
                    message:
                        "ไม่พบสินค้า"
                });

            }


            res.json({
                success: true,
                product
            });

        } catch (error) {

            console.error(
                "GET PRODUCT ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "ไม่สามารถโหลดสินค้าได้"
            });

        }

    }
);

app.post(
    "/api/products",
    requireAdmin,
    (req, res) => {

        try {

            const {
                name,
                description = "",
                price,
                stock = 0,
                image = "",
                category = "อื่นๆ"
            } = req.body;


            if (!name) {

                return res.status(400).json({
                    success: false,
                    message:
                        "กรุณาระบุชื่อสินค้า"
                });

            }


            const productPrice =
                Number(price);

            const productStock =
                Number(stock);


            if (
                !Number.isFinite(
                    productPrice
                ) ||
                productPrice < 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "ราคาสินค้าไม่ถูกต้อง"
                });

            }


            if (
                !Number.isInteger(
                    productStock
                ) ||
                productStock < 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "จำนวน Stock ไม่ถูกต้อง"
                });

            }


            const productCategory =
                String(
                    category || "อื่นๆ"
                ).trim();


            const result =
                db.prepare(`
                    INSERT INTO products
                    (
                        name,
                        description,
                        price,
                        stock,
                        image,
                        category,
                        active
                    )
                    VALUES (
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        1
                    )
                `).run(
                    name.trim(),
                    description,
                    productPrice,
                    productStock,
                    image,
                    productCategory ||
                        "อื่นๆ"
                );


            res.json({
                success: true,
                message:
                    "เพิ่มสินค้าสำเร็จ",
                productId:
                    result.lastInsertRowid
            });

        } catch (error) {

            console.error(
                "ADD PRODUCT ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "เพิ่มสินค้าไม่สำเร็จ"
            });

        }

    }
);

app.delete(
    "/api/products/:id",
    requireAdmin,
    (req, res) => {

        try {

            const result =
                db.prepare(`
                    UPDATE products
                    SET
                        active = 0,
                        updated_at =
                            CURRENT_TIMESTAMP
                    WHERE id = ?
                `).run(
                    req.params.id
                );


            if (
                result.changes === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "ไม่พบสินค้า"
                });

            }


            res.json({
                success: true,
                message:
                    "ปิดสินค้าสำเร็จ"
            });

        } catch (error) {

            console.error(
                "DELETE PRODUCT ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "ไม่สามารถปิดสินค้าได้"
            });

        }

    }
);

app.get(
    "/api/credit",
    requireLogin,
    (req, res) => {

        try {

            const user =
                db.prepare(`
                    SELECT credit
                    FROM users
                    WHERE id = ?
                `).get(
                    req.session.user.id
                );


            res.json({
                success: true,
                credit:
                    user
                        ? user.credit
                        : 0
            });

        } catch (error) {

            console.error(
                "GET CREDIT ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "ไม่สามารถโหลดเครดิตได้"
            });

        }

    }
);

app.post(
    "/api/topups",
    requireLogin,
    (req, res) => {

        const amount =
            Number(req.body.amount);


        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "จำนวนเงินไม่ถูกต้อง"
            });

        }


        const reference =
            String(
                req.body.reference || ""
            ).trim();


        try {

            const result =
                db.prepare(`
                    INSERT INTO topups
                    (
                        user_id,
                        amount,
                        status,
                        reference
                    )
                    VALUES (
                        ?,
                        ?,
                        'pending',
                        ?
                    )
                `).run(
                    req.session.user.id,
                    amount,
                    reference
                );


            res.json({
                success: true,
                message:
                    "ส่งคำขอเติมเงินแล้ว",
                topupId:
                    result.lastInsertRowid
            });

        } catch (error) {

            console.error(
                "CREATE TOPUP ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "ไม่สามารถสร้างรายการเติมเงินได้"
            });

        }

    }
);

app.get(
    "/api/topups",
    requireLogin,
    (req, res) => {

        try {

            const topups =
                db.prepare(`
                    SELECT
                        id,
                        amount,
                        status,
                        reference,
                        created_at
                    FROM topups
                    WHERE user_id = ?
                    ORDER BY id DESC
                `).all(
                    req.session.user.id
                );


            res.json({
                success: true,
                topups
            });

        } catch (error) {

            console.error(
                "GET TOPUPS ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "ไม่สามารถโหลดประวัติเติมเครดิตได้"
            });

        }

    }
);

app.post(
    "/api/orders",
    requireLogin,
    (req, res) => {

        const productId =
            Number(
                req.body.productId
            );

        const quantity =
            Number(
                req.body.quantity || 1
            );


        if (
            !Number.isInteger(
                productId
            ) ||
            !Number.isInteger(
                quantity
            ) ||
            quantity <= 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "ข้อมูลการสั่งซื้อไม่ถูกต้อง"
            });

        }


        try {

            const transaction =
                db.transaction(() => {

                    const user =
                        db.prepare(`
                            SELECT *
                            FROM users
                            WHERE id = ?
                        `).get(
                            req.session.user.id
                        );


                    const product =
                        db.prepare(`
                            SELECT *
                            FROM products
                            WHERE id = ?
                            AND active = 1
                        `).get(
                            productId
                        );


                    if (!user) {

                        throw new Error(
                            "ไม่พบผู้ใช้"
                        );

                    }


                    if (!product) {

                        throw new Error(
                            "ไม่พบสินค้า"
                        );

                    }


                    if (
                        product.stock <
                        quantity
                    ) {

                        throw new Error(
                            "สินค้าไม่เพียงพอ"
                        );

                    }


                    const total =
                        product.price *
                        quantity;


                    if (
                        user.credit <
                        total
                    ) {

                        throw new Error(
                            "เครดิตไม่เพียงพอ"
                        );

                    }


                    db.prepare(`
                        UPDATE users
                        SET
                            credit =
                                credit - ?,
                            updated_at =
                                CURRENT_TIMESTAMP
                        WHERE id = ?
                    `).run(
                        total,
                        user.id
                    );


                    db.prepare(`
                        UPDATE products
                        SET
                            stock =
                                stock - ?,
                            updated_at =
                                CURRENT_TIMESTAMP
                        WHERE id = ?
                    `).run(
                        quantity,
                        product.id
                    );


                    const order =
                        db.prepare(`
                            INSERT INTO orders
                            (
                                user_id,
                                product_id,
                                product_name,
                                quantity,
                                price,
                                total,
                                completed
                            )
                            VALUES (
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                1
                            )
                        `).run(
                            user.id,
                            product.id,
                            product.name,
                            quantity,
                            product.price,
                            total
                        );


                    return {
                        orderId:
                            order.lastInsertRowid,
                        total
                    };

                });


            const result =
                transaction();


            res.json({
                success: true,
                message:
                    "สั่งซื้อสำเร็จ",
                ...result
            });

        } catch (error) {

            console.error(
                "ORDER ERROR:",
                error
            );

            res.status(400).json({
                success: false,
                message:
                    error.message
            });

        }

    }
);

app.get(
    "/api/orders",
    requireLogin,
    (req, res) => {

        try {

            const orders =
                db.prepare(`
                    SELECT
                        orders.id,
                        orders.product_id,
                        orders.product_name,
                        orders.quantity,
                        orders.price,
                        orders.total,
                        orders.completed,
                        orders.created_at,
                        products.image
                            AS product_image
                    FROM orders
                    LEFT JOIN products
                        ON products.id =
                           orders.product_id
                    WHERE orders.user_id = ?
                    ORDER BY orders.id DESC
                `).all(
                    req.session.user.id
                );


            res.json({
                success: true,
                orders
            });

        } catch (error) {

            console.error(
                "GET ORDERS ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "ไม่สามารถโหลดประวัติออเดอร์ได้"
            });

        }

    }
);

app.get(
    "/api/admin/topups",
    requireAdmin,
    (req, res) => {

        try {

            const topups =
                db.prepare(`
                    SELECT
                        topups.id,
                        topups.amount,
                        topups.status,
                        topups.reference,
                        topups.created_at,
                        users.username
                    FROM topups
                    JOIN users
                        ON users.id =
                           topups.user_id
                    ORDER BY
                        topups.id DESC
                `).all();


            res.json({
                success: true,
                topups
            });

        } catch (error) {

            console.error(
                "ADMIN TOPUPS ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "ไม่สามารถโหลดรายการเติมเงินได้"
            });

        }

    }
);

app.post(
    "/api/admin/topups/:id/approve",
    requireAdmin,
    (req, res) => {

        try {

            const transaction =
                db.transaction(() => {

                    const topup =
                        db.prepare(`
                            SELECT *
                            FROM topups
                            WHERE id = ?
                        `).get(
                            req.params.id
                        );


                    if (!topup) {

                        throw new Error(
                            "ไม่พบรายการเติมเงิน"
                        );

                    }


                    if (
                        topup.status !==
                        "pending"
                    ) {

                        throw new Error(
                            "รายการนี้ถูกดำเนินการแล้ว"
                        );

                    }


                    db.prepare(`
                        UPDATE topups
                        SET status = 'approved'
                        WHERE id = ?
                    `).run(
                        topup.id
                    );


                    db.prepare(`
                        UPDATE users
                        SET
                            credit =
                                credit + ?,
                            updated_at =
                                CURRENT_TIMESTAMP
                        WHERE id = ?
                    `).run(
                        topup.amount,
                        topup.user_id
                    );

                });


            transaction();


            res.json({
                success: true,
                message:
                    "อนุมัติเติมเครดิตสำเร็จ"
            });

        } catch (error) {

            console.error(
                "APPROVE TOPUP ERROR:",
                error
            );

            res.status(400).json({
                success: false,
                message:
                    error.message
            });

        }

    }
);

app.get(
    "/api/admin/users",
    requireAdmin,
    (req, res) => {

        try {

            const users =
                db.prepare(`
                    SELECT
                        id,
                        username,
                        role,
                        credit,
                        active,
                        created_at
                    FROM users
                    ORDER BY id DESC
                `).all();


            res.json({
                success: true,
                users
            });

        } catch (error) {

            console.error(
                "ADMIN USERS ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "ไม่สามารถโหลดผู้ใช้ได้"
            });

        }

    }
);

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "index.html"
            )
        );

    }
);

app.use(
    "/api",
    (req, res) => {

        res.status(404).json({
            success: false,
            message:
                "ไม่พบ API ที่ร้องขอ"
        });

    }
);

app.listen(
    PORT,
    () => {

        console.log("");
        console.log(
            "=============================="
        );
        console.log(
            "       BOXSHOP SERVER"
        );
        console.log(
            "=============================="
        );
        console.log(
            `Server running: http://localhost:${PORT}`
        );
        console.log(
            "=============================="
        );
        console.log("");

    }
);