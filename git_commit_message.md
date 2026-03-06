# Git commit message — viết theo Conventional Commits
## Quy ước này giúp nhìn vào git log biết ngay ai làm gì:
```
feat:     thêm tính năng mới
fix:      sửa bug
chore:    việc lặt vặt không ảnh hưởng logic (cài package, config...)
docs:     cập nhật tài liệu
refactor: tái cấu trúc code không thêm/sửa tính năng
style:    format code, không đổi logic
test:     thêm/sửa test

git commit -m "feat: add POST /api/auth/register endpoint"
git commit -m "fix: fix available_slots not restored when booking cancelled"
git commit -m "chore: install mongoose and jsonwebtoken"
```

## Git branch — quy ước đặt tên
```
main           → production (chỉ merge từ develop khi release)
develop        → branch chính, BE và FE đều merge vào đây

feature/auth               → BE làm tính năng auth
feature/tour-management    → BE làm CRUD tour
feature/fe-home-page       → FE làm trang chủ
feature/fe-booking-flow    → FE làm luồng đặt tour

fix/booking-slot-bug       → sửa bug cụ thể
```
## Mỗi tính năng mới tạo branch riêng từ develop
git checkout develop
git pull origin develop
git checkout -b feature/auth

## Làm xong → merge về develop
git checkout develop
git merge feature/auth
git push origin develop