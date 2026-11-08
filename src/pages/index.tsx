import Head from 'next/head';
import dynamic from 'next/dynamic';

const AppWithoutSSR = dynamic(() => import('@/App'), { ssr: false });

export default function Home() {
    return <>
        <Head>
            <title>Graveyard Shift — Afterhours Arcade</title>
            <meta name="description" content="A midnight game of chase. Collect souls as a skull, dodge the graves, and run when the man becomes He-Man." />
            <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
            <meta name="theme-color" content="#111419" />
            <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        </Head>
        <AppWithoutSSR />
    </>;
}
