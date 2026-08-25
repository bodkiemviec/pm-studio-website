# Cài đặt môi trường phát triển của tôi

## Quy ước coding chung
- Bao gồm comment chi tiết trong tất cả code
- Sử dụng camelCase cho tên hàm
- Ưu tiên TypeScript hơn JavaScript
- Sử dụng khối try-catch cho xử lý lỗi

## Công nghệ ưa thích
- Frontend: React + TypeScript + Tailwind CSS
- Backend: Node.js + Express + MongoDB
- Testing: Jest + React Testing Library
# Dự án trang thương mại điện tử

## Tổng quan dự án
Đây là trang thương mại điện tử dựa trên kiến trúc microservice, bao gồm các chức năng chính như quản lý người dùng, quản lý sản phẩm, xử lý đơn hàng.

## Quy ước riêng của dự án
- API tuân theo thiết kế RESTful
- Sử dụng Prisma ORM cho tất cả thao tác cơ sở dữ liệu
- Component frontend hỗ trợ thiết kế responsive
- Code liên quan đến thanh toán cần kiểm tra bảo mật bổ sung

## Cấu trúc thư mục
-`/src/components/` - React component có thể tái sử dụng
-`/src/pages/` - Component cấp trang
-`/src/api/` - Định nghĩa API
-`/src/utils/` - Hàm tiện ích
# Quy ước phát triển component

## Nguyên tắc thiết kế component
- Mỗi component cần có file .stories.js tương ứng
- Component hỗ trợ dark mode
- Tất cả props cần có định nghĩa kiểu TypeScript
- Bao gồm unit test cho component

## Quy ước về style
- Sử dụng tên lớp Tailwind CSS
- Tránh inline style
- Ưu tiên thiết kế responsive
# Dự án full-stack

## Cài đặt cơ bản
@./docs/coding-standards.md
@./docs/git-workflow.md

## Cài đặt riêng cho công nghệ
@./frontend/react-guidelines.md
@./backend/api-guidelines.md
@./database/schema-guidelines.md
# Quy ước phát triển React

## Cấu trúc component
- Sử dụng function component và Hooks
- Custom Hook bắt đầu bằng "use"
- Tên file component theo PascalCase

## Quản lý state
- useState cho state đơn giản
- useReducer cho state phức tạp
- Zustand cho state toàn cục
mkdir my-react-app
cd my-react-app
# Tạo tệp cài đặt chính
vim GEMINI.md
# Dự án React TypeScript

## Thông tin dự án
- Tên dự án: Ứng dụng Todo hiện đại
- Công nghệ: React 18 + TypeScript + Vite + Tailwind CSS
- Quản lý state: Zustand
- Routing: React Router v6

## Quy ước phát triển

### Phong cách code
- Thụt lề 2 dấu cách
- Ưu tiên dấu nháy đơn cho chuỗi
- Sử dụng destructuring cho props của component
- Tránh sử dụng kiểu any

### Quy ước component
- File component sử dụng phần mở rộng .tsx
- Tên component theo PascalCase
- Component xuất ra dưới dạng export default
- Mỗi component cần có định nghĩa kiểu tương ứng

### Quy ước style
- Thiết kế style bằng Tailwind CSS
- Ưu tiên thiết kế responsive (mobile first)
- Hỗ trợ dark mode
- Sử dụng biến CSS cho màu chủ đề

### Yêu cầu test
- Mỗi component cần có unit test
- Sử dụng React Testing Library
- Test coverage tối thiểu 80%

## Hướng dẫn riêng cho dự án
- Code được tạo ra bao gồm comment JSDoc chi tiết
- Bao gồm xử lý lỗi trong các lời gọi API
- Sử dụng react-hook-form + zod cho validation form
- Sử dụng React Query cho tất cả thao tác bất đồng bộ
# Trang thương mại điện tử full-stack

## Kiến trúc dự án
- Frontend: Next.js 14 + TypeScript
- Backend: Node.js + Express + Prisma
- Cơ sở dữ liệu: PostgreSQL
- Triển khai: Docker + Kubernetes

## Quy ước chung
@./docs/general-guidelines.md
@./docs/security-guidelines.md
@./docs/performance-guidelines.md

## Cài đặt môi trường
- Môi trường phát triển: PostgreSQL cục bộ
- Môi trường test: Cơ sở dữ liệu trong bộ nhớ
- Môi trường sản xuất: Cơ sở dữ liệu đám mây
# Quy ước phát triển frontend

## Quy ước riêng cho Next.js
- Sử dụng App Router (không phải Pages Router)
- Ưu tiên Server Component, Client Component khi cần thiết
- Sử dụng component next/image cho hình ảnh
- Tối ưu hóa font với next/font

## Quản lý state
- State server: TanStack Query
- State client: Zustand
- State form: React Hook Form
# Quy ước phát triển backend

## Thiết kế API
- Tuân thủ nghiêm ngặt nguyên tắc RESTful
- Sử dụng đặc tả OpenAPI 3.0
- Tất cả API cần validation đầu vào
- Phản hồi lỗi sử dụng định dạng thống nhất

## Thao tác cơ sở dữ liệu
- Sử dụng Prisma ORM
- Bao gồm xử lý lỗi trong tất cả truy vấn
- Ghi log cho các thao tác nhạy cảm
- Sử dụng transaction cho thao tác phức tạp
