import { Link } from 'react-router';
import logo from '../../assets/logo-urt.svg';
import { legalDocuments } from './legal-content';
import styles from './InfoPages.module.css';

export default function LegalPage({ document }: { document: 'privacy' | 'terms' }) {
  const content = legalDocuments[document];
  return (
    <div className={styles.legalPage}>
      <header className={styles.legalHeader}>
        <Link to="/">
          <img src={logo} alt="URT — Your Service Tracker" height="36" />
        </Link>
        <h1>{content.title}</h1>
        <p>Terakhir diperbarui: {content.updated}</p>
      </header>
      <div className={styles.legal}>
        <article className={styles.legalBody}>
          {content.sections.map((section) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
              <h2 id={`${section.id}-title`}>{section.title}</h2>
              {section.blocks.map((block, index) =>
                block.type === 'paragraph' ? (
                  <p key={index}>{block.text}</p>
                ) : (
                  <ul key={index}>
                    {block.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ),
              )}
            </section>
          ))}
        </article>
      </div>
      <footer className={styles.legalFooter}>
        <span>© {new Date().getFullYear()} URT — Your Service Tracker</span>
        <nav>
          <Link to="/">Beranda</Link> · <Link to="/privacy">Privasi</Link> ·{' '}
          <Link to="/terms">Syarat Penggunaan</Link>
        </nav>
      </footer>
    </div>
  );
}
