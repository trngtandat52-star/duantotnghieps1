# 🌟 Lunihome Admin - Next.js App Router Edition

Dự án Bảng Điều Khiển Quản Trị (Admin Panel) cao cấp cho hệ thống đèn trang trí Lunihome, được chuyển đổi toàn diện sang **Next.js 16 (App Router)** với **TypeScript** và **Tailwind CSS**.

---

## 🚀 Hướng Dẫn Khởi Chạy

### 1. Khởi động Backend API (Port 5000)
Trong một cửa sổ Terminal:
```bash
cd backend
npm start
```
> Server API sẽ chạy tại: `http://localhost:5000/api`

### 2. Khởi động Next.js Admin (Port 3001)
Trong một cửa sổ Terminal khác:
```bash
cd admin
npm run dev
```
> Bảng điều khiển quản trị sẽ mở tại: `http://localhost:3001`

---

## 🔑 Tài Khoản Quản Trị Mặc Định

- **Email:** `admin@lunihome.vn`
- **Mật khẩu:** `admin123`

---

## 📂 Kiến Trúc & Cấu Trúc Dự Án

```
admin/
├── src/
│   ├── app/
│   │   ├── (admin)/               # Route Group được bảo vệ (Chỉ Admin)
│   │   │   ├── layout.tsx         # Layout chứa Sidebar + Topbar + Route Guard
│   │   │   ├── page.tsx           # Trang Tổng quan Dashboard & KPIs
│   │   │   ├── products/page.tsx  # Quản lý sản phẩm (Thêm, sửa, xóa, ẩn/hiện, lọc)
│   │   │   ├── inventory/page.tsx # Quản lý tồn kho & Nhật ký xuất nhập
│   │   │   ├── orders/page.tsx    # Quản lý đơn hàng (Quy trình tiến 1 chiều)
│   │   │   ├── categories/page.tsx# Quản lý danh mục & tự tạo slug
│   │   │   ├── coupons/page.tsx   # Quản lý mã giảm giá (Fixed / %)
│   │   │   ├── posts/page.tsx     # Quản lý tin tức / bài viết kiến thức đèn
│   │   │   └── users/page.tsx     # Quản lý người dùng & phân quyền Admin/Khách
│   │   ├── login/page.tsx         # Trang Đăng nhập Quản trị
│   │   ├── globals.css            # Custom CSS & Tailwind v4
│   │   └── layout.tsx             # Root Layout (Auth & Toast Providers)
│   ├── components/
│   │   ├── Icons.tsx              # Bộ biểu tượng SVG hiện đại, độc lập
│   │   ├── Sidebar.tsx            # Menu điều hướng phong cách Luxury Navy & Gold
│   │   └── Topbar.tsx             # Thanh tiêu đề, thông tin user & nút làm mới
│   ├── context/
│   │   ├── AuthContext.tsx        # Quản lý phiên đăng nhập & bảo vệ route
│   │   └── ToastContext.tsx       # Hệ thống thông báo Toast nổi
│   └── lib/
│       ├── api.ts                 # SDK gọi RESTful API sang Backend port 5000
│       └── types.ts               # Định nghĩa TypeScript Interfaces toàn hệ thống
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## 💡 Các Tính Năng Đã Hoàn Thiện

1. **Bảo mật & Phân quyền (Security & Auth Guard)**:
   - Kiểm tra Token JWT & vai trò `role === 'admin'`. Nếu không phải admin hoặc chưa đăng nhập, tự động chuyển về `/login`.
   - Ngăn chặn người dùng tự xóa tài khoản của chính mình.
2. **Tổng quan (Dashboard)**:
   - Thống kê thời gian thực: Tổng doanh thu, Tổng đơn hàng, Số đơn chờ duyệt, Tồn kho thấp, Khách hàng thành viên.
   - Bảng đơn hàng mới nhất, Phân loại trạng thái đơn hàng và phím tắt thao tác nhanh.
3. **Quản lý Sản phẩm (Products)**:
   - Bộ lọc tìm kiếm theo từ khóa/mã SKU, lọc theo danh mục, trạng thái hiển thị/ẩn, sắp xếp giá.
   - Thêm mới & Chỉnh sửa sản phẩm với đầy đủ ảnh, danh mục, SKU, nhãn, giá bán, giá gốc, tồn kho.
   - Đổi nhanh trạng thái Ẩn/Hiện ngay trên bảng với 1 cú click.
4. **Quản lý Tồn kho (Inventory Control)**:
   - Thống kê: Tổng mặt hàng, Tổng số lượng chiếc, Tổng giá trị lưu kho (VNĐ), Cảnh báo sắp hết/hết hàng.
   - 2 Chế độ xem: Danh sách tồn kho & Nhật ký xuất/nhập kho chi tiết (Inventory Logs).
   - Modal nhập kho nhanh (+qty), Modal xuất kho / kiểm kê đặt lại số lượng tồn.
   - Xem lịch sử biến động kho riêng cho từng sản phẩm.
5. **Quản lý Đơn hàng (Orders)**:
   - Lọc theo tình trạng (Chờ xác nhận, Đang đóng gói, Đang giao hàng, Hoàn thành, Đã hủy).
   - Xem chi tiết danh sách sản phẩm mua, thông tin người nhận, tiền hàng, phí ship, voucher.
   - Tiến trình xử lý chuẩn thương mại điện tử (Tiến 1 chiều, tự động đồng bộ sang Đã thanh toán khi hoàn tất đơn).
6. **Quản lý Danh mục (Categories)**:
   - Thêm/sửa danh mục, tự động chuyển đổi tên tiếng Việt có dấu thành đường dẫn tĩnh (Slug).
7. **Quản lý Mã giảm giá (Coupons)**:
   - Tạo mã voucher giảm giá theo số tiền cố định (VNĐ) hoặc phần trăm (%), thiết lập đơn hàng tối thiểu, kích hoạt/tạm dừng.
8. **Quản lý Bài viết (Posts)**:
   - Biên tập bài viết tin tức, cẩm nang thiết kế ánh sáng, ảnh bìa, tóm tắt và nội dung chi tiết.
9. **Quản lý Người dùng & Quyền (Users)**:
   - Danh sách thành viên, thêm tài khoản quản trị viên mới, sửa thông tin, đặt lại mật khẩu.
