# 🚀 Hướng Dẫn Sử Dụng & Tài Liệu RESTful API LuniHome

> **Hệ thống Backend API cho Đồ án tốt nghiệp website LuniHome (Đèn trang trí & Nội thất)**
> Xây dựng bằng **Node.js, Express.js & MySQL (XAMPP)**.

---

## 📌 1. Các bước khởi chạy nhanh (3 bước)

### Bước 1: Khởi động MySQL trong XAMPP
1. Mở phần mềm **XAMPP Control Panel** trên máy tính của bạn.
2. Tại dòng **MySQL**, bấm nút **Start** (khi hiện màu xanh và hiện cổng `3306` là thành công).

---

### Bước 2: Tạo Cơ sở dữ liệu & Nạp dữ liệu mẫu (Seeding)
Mở Terminal hoặc PowerShell tại thư mục `backend`, chạy lệnh:
```bash
npm run db:init
```
> **Hoặc nếu muốn dùng phpMyAdmin:**
> - Mở trình duyệt vào `http://localhost/phpmyadmin`
> - Tạo cơ sở dữ liệu tên `lunihome_db` (bảng mã `utf8mb4_unicode_ci`)
> - Bấm tab **Import** và chọn file: `backend/database/schema.sql`

---

### Bước 3: Khởi chạy máy chủ API
Tại thư mục `backend`, chạy lệnh:
```bash
npm run dev
# hoặc
npm start
```

Máy chủ sẽ khởi động tại: **`http://localhost:5000`**

Mở trình duyệt truy cập: **`http://localhost:5000`** để xem **Dashboard tài liệu API trực quan và test trực tiếp các Endpoint!**

---

## 💳 2. Cấu hình thanh toán Stripe

Thanh toán trực tuyến dùng Stripe Checkout (thẻ) với số tiền VND. Khóa bí mật chỉ được đặt ở backend:

1. Tạo `backend/.env` từ [`backend/.env.example`](./.env.example).
2. Tạo tài khoản Stripe và lấy khóa test trong Dashboard → Developers → API keys; điền `STRIPE_SECRET_KEY`.
3. Chạy Stripe CLI để chuyển webhook về máy:
   ```bash
   stripe listen --forward-to localhost:5000/api/orders/stripe/webhook
   ```
4. Sao chép webhook signing secret CLI hiển thị (`whsec_...`) vào `STRIPE_WEBHOOK_SECRET`.
5. Đặt `FRONTEND_BASE_URL` thành địa chỉ đang phục vụ cửa hàng (mặc định `http://localhost:3000`).
6. Khởi động backend và kiểm thử bằng thẻ test `4242 4242 4242 4242`, ngày hết hạn trong tương lai, CVC bất kỳ.

Không commit `backend/.env` hoặc dùng khóa test trong production. Thanh toán chỉ được đánh dấu thành công sau khi Stripe xác nhận; các phiên hết hạn sẽ hủy đơn và hoàn lại tồn kho. Khả năng nhận thanh toán thật phụ thuộc quốc gia và trạng thái tài khoản Stripe của cửa hàng.

---

## 🔐 3. Tài khoản thử nghiệm có sẵn

| Vai trò | Email | Mật khẩu | Chức năng |
|---|---|---|---|
| 👑 **Quản trị viên (Admin)** | `admin@lunihome.vn` | `admin123` | Quản lý toàn bộ đơn hàng, cập nhật trạng thái đơn, quản lý sản phẩm |
| 👤 **Khách hàng (Customer)** | `customer@gmail.com` | `123456` | Mua hàng, xem lịch sử đơn hàng, đánh giá sản phẩm, đổi mật khẩu |

---

## 📡 4. Danh sách đầy đủ các Endpoint RESTful API

### 🔑 A. Xác thực & Người dùng (`/api/auth`)
| Method | Endpoint | Yêu cầu Header | Mô tả |
|---|---|---|---|
| `POST` | `/api/auth/register` | Không | Đăng ký tài khoản (họ tên, email, mật khẩu, sđt, địa chỉ) |
| `POST` | `/api/auth/login` | Không | Đăng nhập (email, password), nhận JWT Token |
| `GET` | `/api/auth/me` | `Bearer <token>` | Lấy thông tin tài khoản đang đăng nhập |
| `PUT` | `/api/auth/profile` | `Bearer <token>` | Cập nhật thông tin cá nhân (họ tên, số điện thoại, địa chỉ) |
| `POST` | `/api/auth/change-password` | `Bearer <token>` | Đổi mật khẩu tài khoản |
| `POST` | `/api/auth/forgot-password` | Không | Khôi phục mật khẩu tạm thời |

---

### 💡 B. Sản phẩm (`/api/products`)
| Method | Endpoint | Query Params / Body | Mô tả |
|---|---|---|---|
| `GET` | `/api/products` | `?page=1&limit=12&category=den-tran&brand=philips&search=aurora&sort=price_asc&priceRange=under500` | Lấy danh sách sản phẩm (có tìm kiếm, lọc danh mục, thương hiệu, khoảng giá, sắp xếp, phân trang) |
| `GET` | `/api/products/:slug` | Slug hoặc ID | Chi tiết sản phẩm kèm danh sách đánh giá & sản phẩm liên quan |
| `POST` | `/api/products/:id/reviews` | `{"rating": 5, "comment": "Sản phẩm rất đẹp"}` | Gửi đánh giá sao & nhận xét cho sản phẩm |

---

### 📂 C. Danh mục & Thương hiệu (`/api/categories`, `/api/brands`)
| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/categories` | Lấy danh sách danh mục (Đèn trần, Đèn thả, Đèn bàn, Đèn tường...) kèm số lượng sản phẩm |
| `GET` | `/api/categories/:slug` | Chi tiết một danh mục theo slug |
| `GET` | `/api/brands` | Lấy danh sách thương hiệu (LumiHome, Philips, Rạng Đông, Panasonic, Duhal) |
| `GET` | `/api/banners` | Lấy các banner đang hiển thị, sắp xếp theo thứ tự cấu hình |
| `GET` | `/api/stores` | Lấy danh sách cửa hàng đang hiển thị, sắp xếp theo thứ tự cấu hình |

---

### 🛒 D. Đơn hàng & Thanh toán (`/api/orders`, `/api/coupons`)
| Method | Endpoint | Yêu cầu Header | Mô tả |
|---|---|---|---|
| `POST` | `/api/orders` | Tùy chọn `Bearer` | Tạo đơn COD (họ tên, sđt, địa chỉ, danh sách hàng, mã giảm giá) |
| `POST` | `/api/orders/stripe/checkout` | Tùy chọn `Bearer` | Tạo đơn Stripe Checkout; giá và tồn kho được xác thực từ CSDL |
| `GET` | `/api/orders/stripe/session/:sessionId` | Không | Xác nhận trạng thái thanh toán khi trở về từ Stripe |
| `POST` | `/api/orders/stripe/webhook` | Stripe signature | Webhook cập nhật đơn đã thanh toán hoặc phiên hết hạn |
| `GET` | `/api/orders/my-orders` | `Bearer <token>` | Lấy toàn bộ lịch sử đơn hàng của người dùng đăng nhập |
| `GET` | `/api/orders/:code` | Tùy chọn | Xem chi tiết đơn hàng theo mã đơn (vd: `LUNI-20261014`) |
| `PUT` | `/api/orders/:id/cancel` | `Bearer <token>` | Hủy đơn hàng đang chờ xử lý |
| `POST` | `/api/coupons/apply` | Không | Kiểm tra & áp dụng mã giảm giá (vd: `LUNI10`, `GIAM100K`, `FREESHIP`) |
| `GET` | `/api/orders` | `Bearer <admin_token>` | Admin: Xem danh sách tất cả đơn hàng |
| `PUT` | `/api/orders/:id/status` | `Bearer <admin_token>` | Admin: Cập nhật trạng thái đơn (`processing`, `shipping`, `completed`, `cancelled`) |

---

### 📰 E. Bài viết & Tin tức (`/api/posts`)
| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/posts` | Danh sách bài viết & mẹo bài trí (phân trang, tìm kiếm) |
| `GET` | `/api/posts/:slug` | Chi tiết bài viết theo slug (tự động đếm lượt xem + gợi ý bài viết liên quan) |

---

### 🛍️ F. Giỏ hàng & yêu thích (`/api/cart`, `/api/wishlist`)
Tất cả endpoint trong mục này yêu cầu JWT trong header `Authorization: Bearer <token>`. Dữ liệu được lưu riêng theo tài khoản trong MySQL.

| Method | Endpoint | Body / Mô tả |
|---|---|---|
| `GET` | `/api/cart` | Lấy giỏ hàng hiện tại |
| `POST` | `/api/cart/items` | `{"productId": 1, "quantity": 1, "variantSize": "24W", "variantColor": "Vàng ấm"}` — thêm sản phẩm |
| `PUT` | `/api/cart/items/:cartItemId` | `{"quantity": 2}` — cập nhật số lượng |
| `DELETE` | `/api/cart/items/:cartItemId` | Xóa một mặt hàng |
| `DELETE` | `/api/cart` | Xóa toàn bộ giỏ hàng |
| `GET` | `/api/wishlist` | Lấy danh sách yêu thích |
| `POST` | `/api/wishlist` | `{"productId": 1}` — thêm sản phẩm yêu thích |
| `DELETE` | `/api/wishlist/:productId` | Xóa sản phẩm yêu thích |

`npm run db:init` tạo bảng `cart_items`; danh sách yêu thích dùng bảng `wishlists`.

---

## 💻 5. Tích hợp sẵn với Frontend HTML
Thư mục gốc đã được trang bị file **`api.js`**:
- Tự động tích hợp đăng nhập tại [`dang-nhap.html`](file:///c:/Users/Admin/Downloads/duantotnghiep/dang-nhap.html)
- Tự động tích hợp đăng ký tại [`dang-ky.html`](file:///c:/Users/Admin/Downloads/duantotnghiep/dang-ky.html)
- Tự động đổi mật khẩu tại [`doi-pass.html`](file:///c:/Users/Admin/Downloads/duantotnghiep/doi-pass.html)
- Tự động quên mật khẩu tại [`quen-mat-khau.html`](file:///c:/Users/Admin/Downloads/duantotnghiep/quen-mat-khau.html)
- Tự động hiển thị tên người dùng và nút Đăng xuất trên thanh Header
- Đồng bộ giỏ hàng và yêu thích với MySQL; người dùng cần đăng nhập để lưu dữ liệu
- Cung cấp đối tượng toàn cục `LunihomeAPI` để gọi bất kỳ API nào từ Javascript:
```javascript
// Ví dụ: Lấy danh sách sản phẩm
const res = await LunihomeAPI.products.getAll({ category: 'den-tran', sort: 'price_asc' });
console.log(res.data);

// Ví dụ: Lấy banner đang hiển thị
const banners = await LunihomeAPI.banners.getAll();

// Ví dụ: Đăng nhập
const auth = await LunihomeAPI.auth.login('customer@gmail.com', '123456');

// Ví dụ: Đặt hàng
const order = await LunihomeAPI.orders.create({
  customerName: 'Nguyễn Văn A',
  customerPhone: '0901234567',
  shippingAddress: 'Hà Nội',
  paymentMethod: 'COD',
  items: [{ productId: 1, productName: 'Đèn trần Aurora', price: 1290000, quantity: 1 }]
});
```
