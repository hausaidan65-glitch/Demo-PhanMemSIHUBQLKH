# Repository Guidelines

## Project Structure & Module Organization

This repository contains two JavaScript applications. `backend/` is a CommonJS Express 5 API: endpoints are in `routes/`, request handling in `controllers/`, database access in `models/`, and business logic in `services/`. Middleware, jobs, configuration, utilities, and scripts have dedicated folders. Runtime uploads are under `backend/uploads/`.

The browser application is the nested Vite project at `frontend/frontend/`. React source is in `src/`, organized into `pages/`, `admin/`, `components/`, `layouts/`, `router/`, `services/`, and `assets/`. Run frontend commands from `frontend/frontend/`. Postman data is under `postman/` and `.postman/`.

## Build, Test, and Development Commands

Install and run each application separately:

- `cd backend && npm install && npm run dev` starts the API with Nodemon (default port `5000`).
- `cd backend && npm start` runs the API with Node for production-like checks.
- `cd frontend/frontend && npm install && npm run dev` starts Vite (normally port `5173`).
- `cd frontend/frontend && npm run build` creates the production bundle in `dist/`.
- `cd frontend/frontend && npm run lint` checks React and JavaScript with ESLint.
- `cd frontend/frontend && npm run preview` serves the built bundle locally.

## Coding Style & Naming Conventions

Backend modules use CommonJS and double quotes; frontend modules use ES imports and generally single quotes. Use two-space indentation. Name React component files in PascalCase (`CourseCard.jsx`), variables in camelCase, and backend layers by responsibility (`courseController.js`, `courseRoutes.js`, `courseModel.js`). Keep API calls in frontend `services/`. Run ESLint before submitting frontend changes.

## Testing Guidelines

No automated test framework or coverage threshold is configured. Run frontend lint/build and manually exercise affected API routes and UI flows. Use Postman where applicable. Add future tests near the relevant module as `*.test.js` or `*.test.jsx` and define an `npm test` script.

## Commit & Pull Request Guidelines

Existing history uses short, informal summaries; improve on this with concise imperative commits such as `Add attendance export validation`. Keep unrelated changes separate. Pull requests should explain the problem and solution, list verification steps, link relevant issues, and include screenshots for UI changes or sample request/response data for API changes.

## Security & Configuration

Never commit secrets from `backend/.env` or frontend environment files. Document new environment keys and provide safe example values. Do not commit generated `dist/`, dependency directories, or user-uploaded files unless they are intentional fixtures.

## SIHUB Project Rules

- Không tự ý thay đổi business logic đang hoạt động.
- Không sửa database schema nếu chưa được yêu cầu.
- Không xóa API, route hoặc field cũ nếu chưa được yêu cầu rõ ràng.
- Trước khi sửa một chức năng, phải đọc cả frontend và backend liên quan để hiểu flow hiện tại.
- Import Excel cũ đang hoạt động phải được giữ nguyên.
- Google Form import phải được tách riêng, không làm phình hoặc phá service import Excel cũ.
- Refactor UI không được thay đổi business logic, state flow hoặc API handler hiện tại nếu không có yêu cầu.
- Sau mỗi thay đổi phải báo rõ file nào đã sửa, logic nào đã thay đổi và chạy kiểm tra phù hợp.
- Không tự commit hoặc push Git nếu chưa được yêu cầu.
- Ưu tiên thay đổi tối thiểu, giữ backward compatibility và không sửa file không liên quan.
- Nếu yêu cầu chưa rõ, ưu tiên phân tích trước và chưa sửa code.
- Trước khi sửa code lớn, hãy mô tả kế hoạch ngắn gọn rồi mới thực hiện.
