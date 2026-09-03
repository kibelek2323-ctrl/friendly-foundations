import bottlyLogo from "@/assets/bottly-logo.png";

/** Bottly brand mark — rounded robot head used across all layouts. */
export function BrandMark({ size = 8 }: { size?: 8 | 9 }) {
  const px = size === 9 ? "size-9" : "size-8";
  return (
    <img
      src={bottlyLogo}
      alt=""
      aria-hidden="true"
      width={1024}
      height={1024}
      className={`${px} rounded-lg`}
    />
  );
}
