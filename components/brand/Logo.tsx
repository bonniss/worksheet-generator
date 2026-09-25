import Image from "next/image";

// Logo Worksheet Genie: cô tiên hình chữ W (emoji Fluent Emoji Flat — xem THIRD_PARTY_NOTICES.md).
// Nguồn duy nhất là app/icon.svg (Next phục vụ tại /icon.svg), component chỉ hiển thị lại file đó.
export const PRODUCT_NAME = "Worksheet Genie";

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return <Image src="/icon.svg" alt="" width={size} height={size} unoptimized priority className={className} />;
}
