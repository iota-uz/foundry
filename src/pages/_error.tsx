/**
 * Custom Error Page for Pages Router fallback
 */

import { NextPageContext } from 'next';
import Link from 'next/link';

interface ErrorProps {
  statusCode: number | undefined;
}

function Error({ statusCode }: ErrorProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0a0a0a',
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
        {typeof statusCode === 'number' ? statusCode : 'Error'}
      </h1>
      <p style={{ color: '#888888', marginBottom: '2rem' }}>
        {typeof statusCode === 'number'
          ? `An error ${statusCode} occurred on server`
          : 'An error occurred on client'}
      </p>
      <Link
        href="/"
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#3b82f6',
          color: 'white',
          borderRadius: '0.5rem',
          textDecoration: 'none',
        }}
      >
        Go home
      </Link>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
