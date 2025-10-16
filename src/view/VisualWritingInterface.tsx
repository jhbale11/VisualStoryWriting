export default function VisualWritingInterface() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f5f5f5' }}>
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
          Legacy Interface
        </h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>
          This interface is temporarily unavailable. Please use the Glossary Builder instead.
        </p>
        <a
          href="#/"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: '#667eea',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 'bold'
          }}
        >
          Go to Glossary Builder
        </a>
      </div>
    </div>
  );
}
