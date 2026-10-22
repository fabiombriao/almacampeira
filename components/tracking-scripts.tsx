import Script from 'next/script'

const ID_PATTERN = /^[A-Za-z0-9_-]{4,30}$/

/** Carrega Meta Pixel e GA4 só quando os IDs foram cadastrados no admin. Sem banner de consentimento (decisão do dono). */
export function TrackingScripts({ pixelId, ga4Id }: { pixelId: string | null; ga4Id: string | null }) {
  const pixel = pixelId && /^\d{5,20}$/.test(pixelId) ? pixelId : null
  const ga4 = ga4Id && ID_PATTERN.test(ga4Id) ? ga4Id : null
  if (!pixel && !ga4) return null

  return (
    <>
      {pixel && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`}
        </Script>
      )}
      {ga4 && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${ga4}');`}
          </Script>
        </>
      )}
    </>
  )
}
