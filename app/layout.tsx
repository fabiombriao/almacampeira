import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { TrackingScripts } from "@/components/tracking-scripts";
import { getStoreSettings } from "@/lib/data/catalog";
import { siteBaseUrl } from "@/lib/site";
import { themeCss } from "@/lib/theme";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getStoreSettings();
  return {
    metadataBase: siteBaseUrl(),
    title: { default: `${s.name} | ${s.tagline}`, template: `%s | ${s.name}` },
    description: s.about_text,
    openGraph: {
      siteName: s.name,
      title: `${s.name} | ${s.tagline}`,
      description: s.about_text,
      locale: "pt_BR",
      type: "website",
      images: [{ url: s.logo_url, width: 1254, height: 1254, alt: s.name }],
    },
    icons: { icon: s.logo_url },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getStoreSettings();
  return (
    <html lang="pt-BR" className={`${inter.variable} ${cormorant.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <style dangerouslySetInnerHTML={{ __html: themeCss(s.theme) }} />
        {children}
        <TrackingScripts pixelId={s.meta_pixel_id} ga4Id={s.ga4_measurement_id} />
      </body>
    </html>
  );
}
