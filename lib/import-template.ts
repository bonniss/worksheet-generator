// Định dạng CSV import tài khoản — dùng chung cho route tải file mẫu, trang import và README.
export const IMPORT_COLUMNS = ["username", "name", "email", "role", "password"] as const;
export const IMPORT_REQUIRED = ["username", "name"] as const;
export const IMPORT_TEMPLATE_FILENAME = "mau-import-tai-khoan.csv";

export const IMPORT_TEMPLATE_CSV =
  [
    IMPORT_COLUMNS.join(","),
    "nguyenvana,Nguyễn Văn A,,user,",
    "tranthib,Trần Thị B,tranthib@example.com,admin,MatKhau@123",
    "hs.lop5a_01,Lê Văn C,,,",
  ].join("\r\n") + "\r\n";
