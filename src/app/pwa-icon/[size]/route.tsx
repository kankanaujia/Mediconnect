import { ImageResponse } from "next/og";

// App icons for the installable app (PWA), drawn on the fly: /pwa-icon/192, /pwa-icon/512.
const SIZES = [180, 192, 512];

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params;
  const size = SIZES.includes(Number(raw)) ? Number(raw) : 192;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0891b2",
          color: "white",
          fontSize: size * 0.42,
          fontWeight: 800,
          fontFamily: "sans-serif",
          letterSpacing: -size * 0.01,
        }}
      >
        MC
      </div>
    ),
    {
      width: size,
      height: size,
      headers: { "Cache-Control": "public, max-age=604800, immutable" },
    }
  );
}
