// Ported from the repository's index.html; preserve its layout and content.
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import logo from '../../assets/logo-urt.svg';
import './landing.css';

type Persona = 'owner' | 'technician' | 'customer';
const personas: Persona[] = ['owner', 'technician', 'customer'];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [persona, setPersona] = useState<Persona>('owner');
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [ticketCode, setTicketCode] = useState('');
  const [activeSection, setActiveSection] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const navToggle = useRef<HTMLButtonElement>(null);
  const ticketInput = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    );
    root.current
      ?.querySelectorAll('main section[id]')
      .forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  function handlePersonaKey(event: KeyboardEvent<HTMLButtonElement>, current: Persona) {
    let next = personas.indexOf(current);
    if (event.key === 'ArrowRight') next = (next + 1) % personas.length;
    else if (event.key === 'ArrowLeft') next = (next - 1 + personas.length) % personas.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = personas.length - 1;
    else return;
    event.preventDefault();
    setPersona(personas[next]);
    root.current?.querySelector<HTMLButtonElement>(`#tab-${personas[next]}`)?.focus();
  }

  function handleTrackingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = ticketCode.trim().replace(/^#/, '').toUpperCase();
    if (code) navigate(`/tracking/${encodeURIComponent(code)}`);
  }

  return (
    <div
      className="urt-landing"
      translate="no"
      ref={root}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && menuOpen) {
          setMenuOpen(false);
          navToggle.current?.focus();
        }
      }}
    >
      <a className="skip-link" href="#main-content">
        Lewati ke konten utama
      </a>
      <header className="site-header">
        <div className="site-header__container">
          <Link to="/" className="site-header__brand" aria-label="URT Beranda">
            <img src={logo} alt="URT — Your Service Tracker" height="36" />
          </Link>
          <button
            ref={navToggle}
            className={menuOpen ? 'nav-toggle is-active' : 'nav-toggle'}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            onClick={() => setMenuOpen(!menuOpen)}
            type="button"
            id="navToggle"
            aria-controls="primaryNav"
          >
            <span className="nav-toggle__bar"></span>
            <span className="nav-toggle__bar"></span>
            <span className="nav-toggle__bar"></span>
          </button>
          <nav
            className={menuOpen ? 'site-nav is-open' : 'site-nav'}
            onClick={() => setMenuOpen(false)}
            id="primaryNav"
            aria-label="Navigasi Utama"
          >
            <ul className="site-nav__list">
              <li>
                <Link to="/" className="site-nav__link" aria-current="page">
                  Beranda
                </Link>
              </li>
              <li>
                <a
                  className={
                    activeSection === 'alur-kerja' ? 'site-nav__link is-active' : 'site-nav__link'
                  }
                  href="#alur-kerja"
                >
                  Alur Kerja
                </a>
              </li>
              <li>
                <a
                  className={
                    activeSection === 'peran' ? 'site-nav__link is-active' : 'site-nav__link'
                  }
                  href="#peran"
                >
                  Tiga Peran
                </a>
              </li>
              <li>
                <a
                  className={
                    activeSection === 'layanan' ? 'site-nav__link is-active' : 'site-nav__link'
                  }
                  href="#layanan"
                >
                  Fitur
                </a>
              </li>
              <li>
                <a
                  className={
                    activeSection === 'lacak-servis' ? 'site-nav__link is-active' : 'site-nav__link'
                  }
                  href="#lacak-servis"
                >
                  Lacak Servis
                </a>
              </li>
              <li>
                <a
                  className={
                    activeSection === 'harga' ? 'site-nav__link is-active' : 'site-nav__link'
                  }
                  href="#harga"
                >
                  Harga
                </a>
              </li>
            </ul>
            <div className="site-nav__actions">
              <Link to="/portal" className="btn btn--secondary btn--sm">
                Masuk Portal
              </Link>
              <Link to="/owner/register" className="btn btn--primary btn--sm">
                Daftar Tempat Servis
              </Link>
            </div>
          </nav>
        </div>
      </header>
      <main tabIndex={-1} id="main-content">
        <section className="hero" aria-labelledby="hero-title">
          <div className="container hero__container">
            <div className="hero__content">
              <div className="eyebrow">PLATFORM UNTUK TEMPAT SERVIS</div>
              <h1 id="hero-title" className="hero__headline">
                {' '}
                Kelola Tempat Servis Lebih Mudah dengan URT{' '}
              </h1>
              <p className="hero__lead">
                {' '}
                Satukan pelanggan, teknisi, dan pemilik usaha ke dalam satu ekosistem operasional.
                Dari diagnosis perangkat hingga pelacakan mandiri, operasional jadi rapi dan servis
                terasa jauh lebih profesional.{' '}
              </p>
              <div className="hero__actions">
                <Link to="/portal" className="btn btn--primary btn--lg">
                  Masuk ke Portal
                </Link>
                <a href="#alur-kerja" className="btn btn--secondary btn--lg">
                  Lihat Cara Kerja
                </a>
              </div>
              <p className="hero__caption">
                {' '}
                Satu alur terstruktur untuk servis laptop, smartphone, komputer, dan
                elektronik.{' '}
              </p>
            </div>
            <div className="hero__visual">
              <div className="app-screen">
                <div className="app-screen__header">
                  <div className="app-screen__controls" aria-hidden="true">
                    <span className="dot dot--red"></span>
                    <span className="dot dot--yellow"></span>
                    <span className="dot dot--green"></span>
                  </div>
                  <div className="app-screen__tabs">
                    <span className="app-screen__tab is-active">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        style={{ marginRight: '4px', verticalAlign: '-1px' }}
                      >
                        <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                        <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                        <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                        <rect x="3" y="14" width="7" height="7" rx="1"></rect>
                      </svg>{' '}
                      Ringkasan Operasional{' '}
                    </span>
                    <span className="app-screen__tab"> Tiket Aktif (24) </span>
                  </div>
                  <div className="app-screen__meta">
                    <span className="status-badge status-badge--success">
                      <span
                        className="badge-dot badge-dot--success"
                        style={{ animation: 'urt-landing-pulse 2s infinite' }}
                      ></span>{' '}
                      Live Sync{' '}
                    </span>
                  </div>
                </div>
                <div className="app-screen__body">
                  <div className="dashboard-preview">
                    <div className="dashboard-preview__header">
                      <div>
                        <h2 className="ui-heading"> Ringkasan Operasional Tempat Servis </h2>
                        <p className="ui-subtext">
                          {' '}
                          Pusat kendali antrean, penugasan, dan persetujuan hari ini{' '}
                        </p>
                      </div>
                      <span className="tag tag--navy">iFix Lab Jakarta</span>
                    </div>
                    <div className="metrics-grid">
                      <article className="metric-card">
                        <span className="metric-card__label">Servis Aktif</span>
                        <strong className="metric-card__value">24</strong>
                        <span className="metric-card__trend metric-card__trend--neutral">
                          Total berjalan
                        </span>
                      </article>
                      <article className="metric-card">
                        <span className="metric-card__label">Menunggu Diagnosis</span>
                        <strong className="metric-card__value">8</strong>
                        <span className="metric-card__trend metric-card__trend--warning">
                          Antrean teknisi
                        </span>
                      </article>
                      <article className="metric-card">
                        <span className="metric-card__label">Dalam Pengerjaan</span>
                        <strong className="metric-card__value">12</strong>
                        <span className="metric-card__trend metric-card__trend--active">
                          Sedang diproses
                        </span>
                      </article>
                      <article className="metric-card">
                        <span className="metric-card__label">Siap Diambil</span>
                        <strong className="metric-card__value">4</strong>
                        <span className="metric-card__trend metric-card__trend--success">
                          QC selesai
                        </span>
                      </article>
                    </div>
                    <div className="table-card">
                      <div className="table-card__header">
                        <h3 className="table-card__title">Tiket Servis Terbaru</h3>
                        <span className="table-card__counter">3 dari 24 tiket</span>
                      </div>
                      <div className="table-responsive">
                        <table className="ui-table">
                          <thead>
                            <tr>
                              <th scope="col">No. Tiket</th>
                              <th scope="col">Perangkat</th>
                              <th scope="col">Pelanggan</th>
                              <th scope="col">Teknisi</th>
                              <th scope="col">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="font-mono">#URT-1024</td>
                              <td>
                                <strong>MacBook Pro 13" (2020)</strong>
                              </td>
                              <td>Ahmad Fauzi</td>
                              <td>Rizky Pratama</td>
                              <td>
                                <span className="status-badge status-badge--warning">
                                  <span className="badge-dot badge-dot--warning"></span> Menunggu
                                  Persetujuan{' '}
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td className="font-mono">#URT-1025</td>
                              <td>
                                <strong>iPhone 14 Pro Max</strong>
                              </td>
                              <td>Rina Putri</td>
                              <td>Budi Santoso</td>
                              <td>
                                <span className="status-badge status-badge--info">
                                  <span className="badge-dot badge-dot--info"></span> Diagnosis{' '}
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td className="font-mono">#URT-1026</td>
                              <td>
                                <strong>ASUS VivoBook 15</strong>
                              </td>
                              <td>Hendra Wijaya</td>
                              <td>Andi Saputra</td>
                              <td>
                                <span className="status-badge status-badge--active">
                                  <span className="badge-dot badge-dot--active"></span> Dalam
                                  Pengerjaan{' '}
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="section section--canvas" aria-labelledby="problem-title">
          <div className="container">
            <div className="section-header text-center">
              <span className="eyebrow">TANTANGAN OPERASIONAL</span>
              <h2 id="problem-title" className="section-title">
                {' '}
                Servis masih dikelola lewat percakapan chat dan buku catatan?{' '}
              </h2>
              <p className="section-lead">
                {' '}
                Ketika tempat servis berkembang, metode konvensional menimbulkan hambatan
                komunikasi, pekerjaan tercecer, dan keraguan pelanggan.{' '}
              </p>
            </div>
            <div className="grid grid--3">
              <article className="feature-card">
                <div className="feature-card__number">01</div>
                <h3 className="feature-card__title">Status Servis Sulit Dilacak</h3>
                <p className="feature-card__text">
                  {' '}
                  Pelanggan berulang kali menanyakan progres lewat WhatsApp karena tidak ada saluran
                  terpusat untuk memeriksa status perangkat secara independen.{' '}
                </p>
              </article>
              <article className="feature-card">
                <div className="feature-card__number">02</div>
                <h3 className="feature-card__title"> Informasi dan Catatan Tersebar </h3>
                <p className="feature-card__text">
                  {' '}
                  Keluhan fisik, nota manual, dan suku cadang tersimpan di pesan pribadi. Riwayat
                  servis lama sulit ditelusuri saat perangkat yang sama kembali diservis.{' '}
                </p>
              </article>
              <article className="feature-card">
                <div className="feature-card__number">03</div>
                <h3 className="feature-card__title"> Estimasi dan Approval Tidak Rapi </h3>
                <p className="feature-card__text">
                  {' '}
                  Biaya tambahan atau persetujuan suku cadang kerap disampaikan secara lisan tanpa
                  dokumentasi tertulis, memicu ketidaksesuaian nominal saat pengambilan barang.{' '}
                </p>
              </article>
            </div>
            <div className="callout-banner">
              <p className="callout-banner__text">
                <strong>Solusi URT:</strong> Mengubah fragmentasi catatan menjadi satu alur digital
                terstruktur yang transparan bagi Owner, Teknisi, dan Pelanggan.{' '}
              </p>
            </div>
          </div>
        </section>
        <section className="section" aria-labelledby="core-story-title">
          <div className="container">
            <div className="story-headline">
              <span className="eyebrow">FILOSOFI PRODUK</span>
              <h2 id="core-story-title" className="story-headline__title">
                {' '}
                Satu servis. Tiga peran.
                <br />
                Satu alur kerja terpadu.{' '}
              </h2>
              <p className="story-headline__lead">
                {' '}
                URT bukan sekadar aplikasi pencatatan tiket servis biasa. Ini adalah ekosistem kerja
                kolaboratif di mana setiap peran memegang tanggung jawab spesifik dalam satu alur
                yang tidak terputus.{' '}
              </p>
            </div>
          </div>
        </section>
        <section
          id="peran"
          className="section section--light"
          aria-labelledby="persona-section-title"
        >
          <div className="container">
            <div className="section-header">
              <span className="eyebrow">DITRANCANG KHUSUS UNTUK SETIAP PERAN</span>
              <h2 id="persona-section-title" className="section-title">
                {' '}
                Bagaimana Setiap Persona Mengoperasikan URT{' '}
              </h2>
              <p className="section-lead">
                {' '}
                Pilih peran di bawah ini untuk melihat bagaimana antarmuka dan alur kerja URT
                menyesuaikan kebutuhan spesifik masing-masing pengguna.{' '}
              </p>
            </div>
            <div className="persona-tabs" role="tablist" aria-label="Persona Pengguna URT">
              <button
                className={persona === 'owner' ? 'persona-tab is-active' : 'persona-tab'}
                aria-selected={persona === 'owner'}
                tabIndex={persona === 'owner' ? 0 : -1}
                onClick={() => setPersona('owner')}
                onKeyDown={(event) => handlePersonaKey(event, 'owner')}
                type="button"
                role="tab"
                aria-controls="panel-owner"
                id="tab-owner"
                data-persona="owner"
              >
                <span className="persona-tab__index">01</span>
                <span className="persona-tab__name">Owner / Manager</span>
              </button>
              <button
                className={persona === 'technician' ? 'persona-tab is-active' : 'persona-tab'}
                aria-selected={persona === 'technician'}
                tabIndex={persona === 'technician' ? 0 : -1}
                onClick={() => setPersona('technician')}
                onKeyDown={(event) => handlePersonaKey(event, 'technician')}
                type="button"
                role="tab"
                aria-controls="panel-technician"
                id="tab-technician"
                data-persona="technician"
              >
                <span className="persona-tab__index">02</span>
                <span className="persona-tab__name">Teknisi Servis</span>
              </button>
              <button
                className={persona === 'customer' ? 'persona-tab is-active' : 'persona-tab'}
                aria-selected={persona === 'customer'}
                tabIndex={persona === 'customer' ? 0 : -1}
                onClick={() => setPersona('customer')}
                onKeyDown={(event) => handlePersonaKey(event, 'customer')}
                type="button"
                role="tab"
                aria-controls="panel-customer"
                id="tab-customer"
                data-persona="customer"
              >
                <span className="persona-tab__index">03</span>
                <span className="persona-tab__name">Pelanggan</span>
              </button>
            </div>
            <div
              className={persona === 'owner' ? 'persona-panel is-active' : 'persona-panel'}
              hidden={persona !== 'owner'}
              id="panel-owner"
              role="tabpanel"
              aria-labelledby="tab-owner"
            >
              <div className="persona-layout">
                <div className="persona-layout__content">
                  <span className="tag tag--blue">01. Owner Persona</span>
                  <h3 className="persona-layout__title">
                    {' '}
                    Owner melihat seluruh operasional dalam satu kendali terpusat.{' '}
                  </h3>
                  <p className="persona-layout__desc">
                    {' '}
                    Sebagai pemilik tempat servis, Anda tidak lagi perlu berada di meja kasir
                    sepanjang hari untuk mengetahui kesehatan bisnis. URT memberikan visibilitas
                    penuh atas volume tiket, performa teknisi, pendapatan harian, dan kepuasan
                    pelanggan secara instan.{' '}
                  </p>
                  <div className="responsibility-block">
                    <h4 className="responsibility-block__heading">
                      {' '}
                      Tanggung Jawab &amp; Tindakan Utama:{' '}
                    </h4>
                    <ul className="checklist">
                      <li>
                        {' '}
                        Memantau antrean servis aktif, pending approval, hingga unit siap
                        serah.{' '}
                      </li>
                      <li> Mendistribusikan tiket servis secara adil ke masing-masing teknisi. </li>
                      <li> Mengelola katalog harga jasa servis dan data suku cadang cadangan. </li>
                      <li> Menganalisis performa kerja teknisi dan laporan pendapatan berkala. </li>
                      <li> Mengontrol hak akses tim serta langganan platform tempat servis. </li>
                    </ul>
                  </div>
                  <div className="persona-layout__action">
                    <Link to="/portal" className="btn btn--primary">
                      Jelajahi Portal Owner
                    </Link>
                    <a href="#harga" className="btn btn--secondary">
                      Lihat Paket Langganan
                    </a>
                  </div>
                </div>
                <div className="persona-layout__visual">
                  <div className="ui-mockup">
                    <div className="ui-mockup__header">
                      <span className="ui-mockup__title">Owner Dashboard — Operasional Toko</span>
                      <span className="status-badge status-badge--active">Aktif</span>
                    </div>
                    <div className="ui-mockup__body">
                      <div className="mini-metrics">
                        <div className="mini-metrics__item">
                          <span className="mini-metrics__title">Tiket Aktif</span>
                          <span className="mini-metrics__num">24 Unit</span>
                        </div>
                        <div className="mini-metrics__item">
                          <span className="mini-metrics__title">Menunggu ACC</span>
                          <span className="mini-metrics__num">6 Unit</span>
                        </div>
                        <div className="mini-metrics__item">
                          <span className="mini-metrics__title">Selesai Hari Ini</span>
                          <span className="mini-metrics__num">8 Unit</span>
                        </div>
                      </div>
                      <div className="ui-box">
                        <h4 className="ui-box__title"> Beban Kerja Teknisi Hari Ini </h4>
                        <div className="technician-load">
                          <div className="technician-load__row">
                            <span className="technician-load__name">Andi Saputra</span>
                            <span className="technician-load__stat">8 Unit (Optimal)</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-bar__fill" style={{ width: '80%' }}></div>
                          </div>
                          <div className="technician-load__row">
                            <span className="technician-load__name">Budi Santoso</span>
                            <span className="technician-load__stat">6 Unit (Sedang)</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-bar__fill" style={{ width: '60%' }}></div>
                          </div>
                          <div className="technician-load__row">
                            <span className="technician-load__name">Rizky Pratama</span>
                            <span className="technician-load__stat">5 Unit (Sedang)</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-bar__fill" style={{ width: '50%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              className={persona === 'technician' ? 'persona-panel is-active' : 'persona-panel'}
              hidden={persona !== 'technician'}
              id="panel-technician"
              role="tabpanel"
              aria-labelledby="tab-technician"
            >
              <div className="persona-layout">
                <div className="persona-layout__content">
                  <span className="tag tag--orange">02. Technician Persona</span>
                  <h3 className="persona-layout__title">
                    {' '}
                    Teknisi tahu apa yang harus dikerjakan berikutnya tanpa terdistraksi chat.{' '}
                  </h3>
                  <p className="persona-layout__desc">
                    {' '}
                    Teknisi fokus pada keahlian perbaikan perangkat tanpa perlu meladeni pesan
                    status dari pelanggan berulang kali. Antrean tiket terstruktur memberikan
                    catatan keluhan yang rapi, riwayat pengecekan, serta formulir diagnosis biaya
                    yang jelas.{' '}
                  </p>
                  <div className="responsibility-block">
                    <h4 className="responsibility-block__heading"> Alur Kerja Teknisi: </h4>
                    <div className="workflow-strip">
                      <span className="workflow-strip__step">Antrean</span>
                      <span className="workflow-strip__arrow">→</span>
                      <span className="workflow-strip__step">Diagnosis</span>
                      <span className="workflow-strip__arrow">→</span>
                      <span className="workflow-strip__step">Input Estimasi</span>
                      <span className="workflow-strip__arrow">→</span>
                      <span className="workflow-strip__step">Pengerjaan</span>
                      <span className="workflow-strip__arrow">→</span>
                      <span className="workflow-strip__step">Quality Check</span>
                    </div>
                    <ul className="checklist mt-16">
                      <li>
                        {' '}
                        Menerima notifikasi tiket servis baru yang ditugaskan secara personal.{' '}
                      </li>
                      <li>
                        {' '}
                        Mengunggah foto fisik unit dan catatan komponen rusak saat diagnosis
                        awal.{' '}
                      </li>
                      <li> Mengisi kalkulasi estimasi biaya suku cadang dan jasa perbaikan. </li>
                      <li>
                        {' '}
                        Memperbarui status pengerjaan yang otomatis tersinkron ke pelanggan.{' '}
                      </li>
                    </ul>
                  </div>
                  <div className="persona-layout__action">
                    <Link to="/portal" className="btn btn--primary">
                      Jelajahi Portal Teknisi
                    </Link>
                  </div>
                </div>
                <div className="persona-layout__visual">
                  <div className="ui-mockup">
                    <div className="ui-mockup__header">
                      <span className="ui-mockup__title">Kartu Kerja Teknisi: #URT-1024</span>
                      <span className="status-badge status-badge--warning">
                        <span className="badge-dot badge-dot--warning"></span> Menunggu
                        Approval{' '}
                      </span>
                    </div>
                    <div className="ui-mockup__body">
                      <div className="ticket-detail-grid">
                        <div>
                          <span className="ui-label">Perangkat &amp; Pelanggan</span>
                          <p className="ui-value">MacBook Pro 13" (Ahmad Fauzi)</p>
                        </div>
                        <div>
                          <span className="ui-label">Keluhan Masuk</span>
                          <p className="ui-value"> Mati total setelah terkena tumpahan air </p>
                        </div>
                      </div>
                      <div className="diagnosis-card">
                        <div className="diagnosis-card__title"> Hasil Diagnosis Teknisi: </div>
                        <p className="diagnosis-card__body">
                          {' '}
                          Korsleting pada IC Power rail 3.3V dan korosi pada konektor baterai.
                          Diperlukan re-soldering komponen daya serta pembersihan ultrasonik
                          board.{' '}
                        </p>
                        <div className="estimate-tag">
                          <span>
                            Estimasi Total: <strong>Rp 850.000</strong>
                          </span>
                          <span className="text-muted">(Suku Cadang + Jasa)</span>
                        </div>
                      </div>
                      <div className="action-footer">
                        <button type="button" className="btn btn--secondary btn--sm" disabled>
                          {' '}
                          Tunggu Konfirmasi Pelanggan{' '}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              className={persona === 'customer' ? 'persona-panel is-active' : 'persona-panel'}
              hidden={persona !== 'customer'}
              id="panel-customer"
              role="tabpanel"
              aria-labelledby="tab-customer"
            >
              <div className="persona-layout">
                <div className="persona-layout__content">
                  <span className="tag tag--green">03. Customer Persona</span>
                  <h3 className="persona-layout__title">
                    {' '}
                    Pelanggan tahu kondisi servis tanpa harus bertanya berulang kali.{' '}
                  </h3>
                  <p className="persona-layout__desc">
                    {' '}
                    Rasa cemas pelanggan saat menitipkan perangkat berharga hilang dengan
                    transparansi penuh. Dari struk tiket dengan kode unik, pelanggan melihat
                    diagnosis teknisi, menyetujui atau menolak estimasi biaya secara mandiri, dan
                    memantau tahap perbaikan.{' '}
                  </p>
                  <div className="responsibility-block">
                    <h4 className="responsibility-block__heading"> Fitur Pengalaman Pelanggan: </h4>
                    <ul className="checklist">
                      <li> Cek status kapan saja via kode unik tanpa login yang merepotkan. </li>
                      <li>
                        {' '}
                        Menerima rincian biaya yang transparan sebelum teknisi membongkar unit.{' '}
                      </li>
                      <li>
                        {' '}
                        Tombol persetujuan 1-klik untuk menyetujui atau menolak estimasi
                        servis.{' '}
                      </li>
                      <li> Estimasi waktu pengambilan perangkat yang terukur dan diperbarui. </li>
                      <li> Akses riwayat servis lengkap untuk klaim garansi di kemudian hari. </li>
                    </ul>
                  </div>
                  <div className="persona-layout__action">
                    <a href="#lacak-servis" className="btn btn--primary">
                      Coba Lacak Servis Sekarang
                    </a>
                  </div>
                </div>
                <div className="persona-layout__visual">
                  <div className="ui-mockup">
                    <div className="ui-mockup__header">
                      <span className="ui-mockup__title">Pelacakan Mandiri: #URT-1024</span>
                      <span className="status-badge status-badge--active">Pengerjaan</span>
                    </div>
                    <div className="ui-mockup__body">
                      <div className="tracking-device-card">
                        <div>
                          <strong>MacBook Pro 13" Space Gray</strong>
                          <div className="text-muted">Serial: C02DW0**MD6R</div>
                        </div>
                        <span className="tag tag--blue">Est. Siap: Hari ini, 16:00</span>
                      </div>
                      <div className="timeline">
                        <div className="timeline__item is-done">
                          <div className="timeline__marker">✓</div>
                          <div className="timeline__content">
                            <strong>Pengajuan Servis Diterima</strong>
                            <span className="timeline__time">14 Okt 2026, 09:30</span>
                          </div>
                        </div>
                        <div className="timeline__item is-done">
                          <div className="timeline__marker">✓</div>
                          <div className="timeline__content">
                            <strong>Diagnosis Selesai</strong>
                            <span className="timeline__time">14 Okt 2026, 11:15</span>
                          </div>
                        </div>
                        <div className="timeline__item is-done">
                          <div className="timeline__marker">✓</div>
                          <div className="timeline__content">
                            <strong>Estimasi Disetujui Pelanggan (Rp 850.000)</strong>
                            <span className="timeline__time">14 Okt 2026, 11:40</span>
                          </div>
                        </div>
                        <div className="timeline__item is-active">
                          <div className="timeline__marker">●</div>
                          <div className="timeline__content">
                            <strong>Dalam Pengerjaan Servis</strong>
                            <span className="timeline__time">Pemasangan IC Power berlangsung</span>
                          </div>
                        </div>
                        <div className="timeline__item is-pending">
                          <div className="timeline__marker">○</div>
                          <div className="timeline__content">
                            <strong>Quality Check (QC)</strong>
                            <span className="timeline__time">Pemeriksaan fungsi perangkat</span>
                          </div>
                        </div>
                        <div className="timeline__item is-pending">
                          <div className="timeline__marker">○</div>
                          <div className="timeline__content">
                            <strong>Selesai &amp; Siap Diambil</strong>
                            <span className="timeline__time">
                              Pengambilan di kasir tempat servis
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section
          id="alur-kerja"
          className="section section--canvas"
          aria-labelledby="connected-title"
        >
          <div className="container">
            <div className="section-header text-center">
              <span className="eyebrow">INTEGRASI SEMPURNA</span>
              <h2 id="connected-title" className="section-title">
                {' '}
                Satu Alur yang Menghubungkan Ketiga Pihak{' '}
              </h2>
              <p className="section-lead">
                {' '}
                Setiap kali status diubah oleh teknisi atau pelanggan, seluruh sistem bereaksi
                secara real-time.{' '}
              </p>
            </div>
            <div className="flow-diagram">
              <div className="flow-card">
                <span className="flow-card__role">PELANGGAN</span>
                <h3 className="flow-card__step">1. Mengajukan Servis</h3>
                <p className="flow-card__desc">
                  {' '}
                  Menyerahkan perangkat dan mencatat kendala fisik.{' '}
                </p>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-card flow-card--primary">
                <span className="flow-card__role">URT CORE SYSTEM</span>
                <h3 className="flow-card__step">2. Pembuatan Tiket</h3>
                <p className="flow-card__desc">
                  {' '}
                  Membuat ID unik, mencatat log waktu, menugaskan teknisi.{' '}
                </p>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-card">
                <span className="flow-card__role">TEKNISI</span>
                <h3 className="flow-card__step">3. Diagnosis &amp; Pengerjaan</h3>
                <p className="flow-card__desc">
                  {' '}
                  Pemeriksaan komponen, kalkulasi biaya, perbaikan hardware.{' '}
                </p>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-card flow-card--owner">
                <span className="flow-card__role">OWNER</span>
                <h3 className="flow-card__step">4. Pantau &amp; Rekap Transaksi</h3>
                <p className="flow-card__desc">
                  {' '}
                  Otomatisasi invoice, penyerahan garansi, laporan omzet.{' '}
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="section" aria-labelledby="journey-title">
          <div className="container">
            <div className="section-header text-center">
              <span className="eyebrow">SIKLUS STATUS TIKET</span>
              <h2 id="journey-title" className="section-title">
                {' '}
                9 Tahap Siklus Servis URT Tanpa Informasi yang Terputus{' '}
              </h2>
              <p className="section-lead">
                {' '}
                Status tidak hanya mengandalkan kode warna, melainkan label semantik dan peran
                verifikasi yang jelas.{' '}
              </p>
            </div>
            <div className="journey-grid">
              <div className="journey-card">
                <span className="journey-card__step">Tahap 1</span>
                <span className="status-badge status-badge--neutral">Pengajuan</span>
                <h3 className="journey-card__title">Registrasi Masuk</h3>
                <p className="journey-card__desc">
                  {' '}
                  Pelanggan menyerahkan unit, menerima tanda terima fisik &amp; nomor tiket.{' '}
                </p>
              </div>
              <div className="journey-card">
                <span className="journey-card__step">Tahap 2</span>
                <span className="status-badge status-badge--neutral">Menunggu Diagnosis</span>
                <h3 className="journey-card__title">Antrean Meja</h3>
                <p className="journey-card__desc">
                  {' '}
                  Tiket dialokasikan ke teknisi sesuai spesialisasi jenis kerusakan.{' '}
                </p>
              </div>
              <div className="journey-card">
                <span className="journey-card__step">Tahap 3</span>
                <span className="status-badge status-badge--info">Diagnosis</span>
                <h3 className="journey-card__title">Pemeriksaan Fisik</h3>
                <p className="journey-card__desc">
                  {' '}
                  Teknisi menguji voltase, motherboard, atau komponen modul yang cacat.{' '}
                </p>
              </div>
              <div className="journey-card">
                <span className="journey-card__step">Tahap 4</span>
                <span className="status-badge status-badge--warning">Menunggu Persetujuan</span>
                <h3 className="journey-card__title">Pengajuan Estimasi</h3>
                <p className="journey-card__desc">
                  {' '}
                  Rincian biaya tampil ke portal pelanggan menunggu tombol persetujuan.{' '}
                </p>
              </div>
              <div className="journey-card">
                <span className="journey-card__step">Tahap 5</span>
                <span className="status-badge status-badge--success">Disetujui</span>
                <h3 className="journey-card__title">Konfirmasi Pelanggan</h3>
                <p className="journey-card__desc">
                  {' '}
                  Customer menyetujui nominal harga; suku cadang langsung dialokasikan.{' '}
                </p>
              </div>
              <div className="journey-card">
                <span className="journey-card__step">Tahap 6</span>
                <span className="status-badge status-badge--active">Dalam Pengerjaan</span>
                <h3 className="journey-card__title">Proses Servis</h3>
                <p className="journey-card__desc">
                  {' '}
                  Pergantian part, reparasi sirkuit, atau perbaikan software dilakukan.{' '}
                </p>
              </div>
              <div className="journey-card">
                <span className="journey-card__step">Tahap 7</span>
                <span className="status-badge status-badge--info">QC (Quality Check)</span>
                <h3 className="journey-card__title">Uji Kualitas</h3>
                <p className="journey-card__desc">
                  {' '}
                  Tes performa, suhu, stabilitas sistem sebelum perangkat diserahkan.{' '}
                </p>
              </div>
              <div className="journey-card">
                <span className="journey-card__step">Tahap 8</span>
                <span className="status-badge status-badge--success">Selesai</span>
                <h3 className="journey-card__title">Siap Diambil</h3>
                <p className="journey-card__desc">
                  {' '}
                  Pelanggan menerima notifikasi unit telah siap diambil dan pelunasan.{' '}
                </p>
              </div>
              <div className="journey-card">
                <span className="journey-card__step">Tahap 9</span>
                <span className="status-badge status-badge--neutral">Riwayat Servis</span>
                <h3 className="journey-card__title">Arsip &amp; Garansi</h3>
                <p className="journey-card__desc">
                  {' '}
                  Data tersimpan di histori pelanggan &amp; owner untuk masa klaim garansi.{' '}
                </p>
              </div>
            </div>
          </div>
        </section>
        <section id="layanan" className="section section--canvas" aria-labelledby="features-title">
          <div className="container">
            <div className="section-header">
              <span className="eyebrow">KAPABILITAS SISTEM</span>
              <h2 id="features-title" className="section-title">
                {' '}
                Semua Kebutuhan Servis, Satu Platform{' '}
              </h2>
              <p className="section-lead">
                {' '}
                Dirancang berdasarkan pengalaman nyata tempat servis komputer, handphone, dan
                elektronik.{' '}
              </p>
            </div>
            <div className="grid grid--3">
              <div className="feature-category">
                <div className="feature-category__header">
                  <span className="tag tag--blue">Modul 01</span>
                  <h3 className="feature-category__title">Service Management</h3>
                </div>
                <ul className="feature-list">
                  <li>
                    <strong>Pengajuan &amp; Tiket Servis:</strong> Pencatatan serial number, kondisi
                    fisik, dan keluhan awal secara instan.{' '}
                  </li>
                  <li>
                    <strong>Diagnosis &amp; Estimasi:</strong> Dokumentasi catatan teknis kerusakan
                    dan estimasi suku cadang.{' '}
                  </li>
                  <li>
                    <strong>Approval Online:</strong> Pelanggan menyetujui biaya secara transparan
                    lewat browser mereka.{' '}
                  </li>
                  <li>
                    <strong>Pelacakan Status:</strong> Kode lacak mandiri tanpa harus membuat akun
                    yang berbelit.{' '}
                  </li>
                </ul>
              </div>
              <div className="feature-category">
                <div className="feature-category__header">
                  <span className="tag tag--navy">Modul 02</span>
                  <h3 className="feature-category__title">Operational Management</h3>
                </div>
                <ul className="feature-list">
                  <li>
                    <strong>Database Pelanggan:</strong> Buku telepon pelanggan beserta seluruh
                    arsip perbaikan perangkat terdahulu.{' '}
                  </li>
                  <li>
                    <strong>Manajemen Beban Teknisi:</strong> Distribusi pekerjaan seimbang untuk
                    mencegah keterlambatan servis.{' '}
                  </li>
                  <li>
                    <strong>Laporan &amp; Transaksi:</strong> Rekap kas harian, servis selesai, dan
                    status pembayaran tempo/lunas.{' '}
                  </li>
                  <li>
                    <strong>Pengaturan Katalog:</strong> Standarisasi ongkos jasa pengerjaan dan
                    harga part standar.{' '}
                  </li>
                </ul>
              </div>
              <div className="feature-category">
                <div className="feature-category__header">
                  <span className="tag tag--green">Modul 03</span>
                  <h3 className="feature-category__title">Customer Experience</h3>
                </div>
                <ul className="feature-list">
                  <li>
                    <strong>Pelacakan Mandiri:</strong> Akses status 24 jam sehari dari smartphone
                    pelanggan.{' '}
                  </li>
                  <li>
                    <strong>Transparansi Suku Cadang:</strong> Rincian komponen baru yang dipasang
                    tertera dengan jelas.{' '}
                  </li>
                  <li>
                    <strong>Estimasi Akurat:</strong> Target perkiraan unit selesai sehingga
                    pelanggan tidak menunggu tanpa kepastian.{' '}
                  </li>
                  <li>
                    <strong>Riwayat Garansi:</strong> Bukti klaim garansi digital yang tidak hilang
                    seperti struk kertas.{' '}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
        <section className="section" aria-labelledby="comparison-title">
          <div className="container">
            <div className="section-header text-center">
              <span className="eyebrow">TRANSFORMASI DIGITAL</span>
              <h2 id="comparison-title" className="section-title">
                {' '}
                Mengapa Beralih dari Cara Manual ke URT?{' '}
              </h2>
              <p className="section-lead">
                {' '}
                Bandingkan selisih waktu dan akurasi saat Anda meninggalkan pembukuan chat
                WhatsApp.{' '}
              </p>
            </div>
            <div className="comparison-grid">
              <div className="comparison-card comparison-card--before">
                <div className="comparison-card__header">
                  <span className="comparison-badge comparison-badge--before">Sebelum URT</span>
                  <h3 className="comparison-card__title"> Sistem Manual &amp; Terfragmentasi </h3>
                </div>
                <ul className="comparison-list">
                  <li>
                    <span className="comparison-icon">×</span>
                    <div>
                      <strong>Chat WhatsApp bertumpuk:</strong> Admin menghabiskan 3-4 jam hanya
                      untuk menjawab pesan tanya status.{' '}
                    </div>
                  </li>
                  <li>
                    <span className="comparison-icon">×</span>
                    <div>
                      <strong>Nota kertas mudah hilang:</strong> Riwayat keluhan dan serial number
                      rawan hilang atau sobek di workshop.{' '}
                    </div>
                  </li>
                  <li>
                    <span className="comparison-icon">×</span>
                    <div>
                      <strong>Sengketa biaya servis:</strong> Pelanggan sering mempermasalahkan
                      biaya baru yang sebelumnya disampaikan lisan.{' '}
                    </div>
                  </li>
                  <li>
                    <span className="comparison-icon">×</span>
                    <div>
                      <strong>Antrean teknisi tidak terpantau:</strong> Pekerjaan menumpuk di satu
                      teknisi sementara yang lain menganggur.{' '}
                    </div>
                  </li>
                </ul>
              </div>
              <div className="comparison-card comparison-card--after">
                <div className="comparison-card__header">
                  <span className="comparison-badge comparison-badge--after">Dengan URT</span>
                  <h3 className="comparison-card__title"> Satu Platform Terintegrasi </h3>
                </div>
                <ul className="comparison-list">
                  <li>
                    <span className="comparison-icon">✓</span>
                    <div>
                      <strong>Pelacakan mandiri:</strong> Pelanggan cek status sendiri secara online
                      melalui kode tiket.{' '}
                    </div>
                  </li>
                  <li>
                    <span className="comparison-icon">✓</span>
                    <div>
                      <strong>Database digital terpusat:</strong> Setiap catatan unit, suku cadang,
                      dan garansi tersimpan selamanya di cloud.{' '}
                    </div>
                  </li>
                  <li>
                    <span className="comparison-icon">✓</span>
                    <div>
                      <strong>Approval digital tercatat:</strong> Pekerjaan dimulai setelah
                      pelanggan menekan persetujuan nominal biaya.{' '}
                    </div>
                  </li>
                  <li>
                    <span className="comparison-icon">✓</span>
                    <div>
                      <strong>Alokasi teknisi seimbang:</strong> Owner melihat beban kerja teknisi
                      harian dalam satu layar pantau.{' '}
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
        <section
          id="lacak-servis"
          className="section section--canvas"
          aria-labelledby="tracking-title"
        >
          <div className="container container--sm">
            <div className="tracking-card">
              <div className="text-center">
                <span className="eyebrow">PORTAL PELACAKAN MANDIRI</span>
                <h2 id="tracking-title" className="section-title">
                  {' '}
                  Lacak Progres Servis Perangkat Anda{' '}
                </h2>
                <p className="section-lead">
                  {' '}
                  Ketahui status pemeriksaan, hasil diagnosis teknisi, estimasi suku cadang, serta
                  rincian biaya tanpa harus menunggu balasan chat admin.{' '}
                </p>
              </div>
              <form
                onSubmit={handleTrackingSubmit}
                className="tracking-form"
                id="trackingForm"
                aria-label="Formulir Lacak Servis"
              >
                <div className="tracking-form__group">
                  <label htmlFor="nomor-tiket" className="sr-only">
                    Nomor Tiket Servis
                  </label>
                  <input
                    ref={ticketInput}
                    value={ticketCode}
                    onChange={(event) => setTicketCode(event.target.value)}
                    type="text"
                    id="nomor-tiket"
                    name="ticket"
                    className="tracking-form__input"
                    placeholder="Contoh: URT-1024 atau URT-2026-123456"
                    required
                    autoComplete="off"
                  />
                  <button type="submit" className="btn btn--primary">
                    {' '}
                    Lacak Servis{' '}
                  </button>
                </div>
                <p className="tracking-form__help">
                  {' '}
                  Nomor tiket tertera pada struk fisik atau pesan konfirmasi saat perangkat
                  diserahkan.{' '}
                </p>
              </form>
              <div className="demo-ticket-hint">
                <span>Ingin mencoba sampel tiket?</span>
                <button
                  onClick={() => {
                    setTicketCode('URT-1024');
                    ticketInput.current?.focus();
                  }}
                  type="button"
                  className="btn-text font-mono"
                  id="btnFillDemoTicket"
                  data-ticket="URT-1024"
                >
                  {' '}
                  Isi #URT-1024{' '}
                </button>
              </div>
            </div>
          </div>
        </section>
        <section id="harga" className="section" aria-labelledby="pricing-title">
          <div className="container">
            <div className="section-header text-center">
              <span className="eyebrow">INVESTASI OPERASIONAL</span>
              <h2 id="pricing-title" className="section-title">
                {' '}
                Pilih Paket Sesuai Skala Tempat Servis Anda{' '}
              </h2>
              <p className="section-lead">
                {' '}
                Semua fitur operasional esensial sudah disertakan. Tanpa biaya instalasi
                tersembunyi.{' '}
              </p>
              <div className="pricing-toggle-wrap">
                <div className="pricing-toggle" role="group" aria-label="Pilihan periode tagihan">
                  <button
                    className={
                      billing === 'monthly'
                        ? 'pricing-toggle__btn is-active'
                        : 'pricing-toggle__btn'
                    }
                    aria-pressed={billing === 'monthly'}
                    onClick={() => setBilling('monthly')}
                    type="button"
                    id="btnBillingMonthly"
                  >
                    {' '}
                    Bulanan{' '}
                  </button>
                  <button
                    className={
                      billing === 'annual' ? 'pricing-toggle__btn is-active' : 'pricing-toggle__btn'
                    }
                    aria-pressed={billing === 'annual'}
                    onClick={() => setBilling('annual')}
                    type="button"
                    id="btnBillingAnnual"
                  >
                    {' '}
                    Tahunan <span className="pricing-discount-tag">Hemat 2 Bulan</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="pricing-grid">
              <article className="pricing-card">
                <div className="pricing-card__header">
                  <span className="tag tag--navy">Paket Standar</span>
                  <h3 className="pricing-card__name">Bulanan</h3>
                  <p className="pricing-card__desc">
                    {' '}
                    Cocok untuk tempat servis independen yang ingin mulai merapikan operasional
                    tanpa komitmen panjang.{' '}
                  </p>
                </div>
                <div className="pricing-card__price">
                  <div className="pricing-value" id="priceMonthlyDisplay">
                    <span className="pricing-value__currency">Rp</span>
                    <span
                      className="pricing-value__amount"
                      data-monthly="99.000"
                      data-annual="83.250"
                    >
                      {billing === 'annual' ? '83.250' : '99.000'}
                    </span>
                    <span className="pricing-value__period">/ bulan</span>
                  </div>
                  <div className="pricing-billing-subtext" id="priceMonthlyBilledText">
                    {billing === 'annual'
                      ? 'Ditagih tahunan (Rp 999.000/tahun)'
                      : 'Ditagih setiap bulan'}
                  </div>
                </div>
                <ul className="pricing-features">
                  <li>Manajemen Tiket &amp; Servis Tak Terbatas</li>
                  <li>Portal Lacak Mandiri untuk Pelanggan</li>
                  <li>Akses hingga 3 Akun Teknisi</li>
                  <li>Input Diagnosis &amp; Estimasi Real-time</li>
                  <li>Laporan Ringkasan Transaksi Bulanan</li>
                  <li>Penyimpanan Riwayat Servis Digital</li>
                </ul>
                <div className="pricing-card__action">
                  <Link to="/register" className="btn btn--secondary btn--block">
                    Pilih Paket Bulanan
                  </Link>
                </div>
              </article>
              <article className="pricing-card pricing-card--featured">
                <div className="pricing-card__badge"> PALING DIMINATI TEMPAT SERVIS </div>
                <div className="pricing-card__header">
                  <span className="tag tag--blue">Paket Tahunan</span>
                  <h3 className="pricing-card__name">Tahunan (Hemat 17%)</h3>
                  <p className="pricing-card__desc">
                    {' '}
                    Solusi ideal untuk workshop dan tempat servis yang berkomitmen pada standar
                    layanan jangka panjang.{' '}
                  </p>
                </div>
                <div className="pricing-card__price">
                  <div className="pricing-value" id="priceAnnualDisplay">
                    <span className="pricing-value__currency">Rp</span>
                    <span
                      className="pricing-value__amount"
                      data-monthly="999.000"
                      data-annual="999.000"
                    >
                      999.000
                    </span>
                    <span className="pricing-value__period">/ tahun</span>
                  </div>
                  <div className="pricing-billing-subtext">
                    {' '}
                    Setara Rp 83.250/bulan (Hemat Rp 189.000/thn){' '}
                  </div>
                </div>
                <ul className="pricing-features">
                  <li>
                    <strong>Semua fitur Paket Bulanan</strong>
                  </li>
                  <li>Akses Teknisi Tanpa Batas (Unlimited)</li>
                  <li>Katalog Suku Cadang &amp; Stok Spare Part</li>
                  <li>Prioritas Dukungan Teknis Pelanggan</li>
                  <li>Ekspor Laporan Finansial ke Excel / CSV</li>
                  <li>Struk Servis Digital dengan Branding Tempat Servis</li>
                </ul>
                <div className="pricing-card__action">
                  <Link to="/register" className="btn btn--primary btn--block">
                    Daftar Paket Tahunan
                  </Link>
                </div>
              </article>
            </div>
          </div>
        </section>
        <section className="cta-section" aria-labelledby="cta-title">
          <div className="container container--sm text-center">
            <span className="eyebrow eyebrow--light">SIAP MERAPIKAN WORKSHOP ANDA?</span>
            <h2 id="cta-title" className="cta-section__title">
              {' '}
              Kelola servis, teknisi, dan pelanggan dalam satu platform terstruktur.{' '}
            </h2>
            <p className="cta-section__lead">
              {' '}
              Bergabunglah bersama puluhan tempat servis modern yang telah meninggalkan pencatatan
              manual dan beralih ke alur kerja profesional.{' '}
            </p>
            <div className="cta-section__actions">
              <Link to="/register" className="btn btn--white btn--lg">
                Daftar Tempat Servis
              </Link>
              <Link to="/portal" className="btn btn--outline-white btn--lg">
                Masuk ke Portal
              </Link>
            </div>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div className="container site-footer__container">
          <div className="site-footer__brand-col">
            <Link to="/" className="site-footer__brand" aria-label="URT Beranda">
              <img src={logo} alt="URT — Your Service Tracker" height="36" />
            </Link>
            <p className="site-footer__tagline">
              {' '}
              Operasional rapi.
              <br />
              Servis lebih profesional.{' '}
            </p>
            <p className="site-footer__summary">
              {' '}
              Platform digital untuk membantu tempat servis laptop, handphone, komputer, dan
              elektronik mengelola pelanggan, teknisi, dan operasional dengan efisien.{' '}
            </p>
          </div>
          <nav className="site-footer__col" aria-label="Tautan Platform">
            <h3 className="site-footer__heading">Platform</h3>
            <ul className="site-footer__links">
              <li>
                <Link to="/">Beranda</Link>
              </li>
              <li>
                <a href="#alur-kerja">Alur Servis</a>
              </li>
              <li>
                <a href="#peran">Tiga Peran</a>
              </li>
              <li>
                <a href="#layanan">Fitur &amp; Modul</a>
              </li>
              <li>
                <a href="#lacak-servis">Lacak Servis Mandiri</a>
              </li>
              <li>
                <a href="#harga">Paket Harga</a>
              </li>
            </ul>
          </nav>
          <nav className="site-footer__col" aria-label="Portal Akses">
            <h3 className="site-footer__heading">Akses Portal</h3>
            <ul className="site-footer__links">
              <li>
                <Link to="/portal">Portal Owner</Link>
              </li>
              <li>
                <Link to="/portal">Portal Teknisi</Link>
              </li>
              <li>
                <Link to="/portal">Portal Pelanggan</Link>
              </li>
              <li>
                <Link to="/register">Pendaftaran Akun Baru</Link>
              </li>
            </ul>
          </nav>
          <div className="site-footer__col">
            <h3 className="site-footer__heading">Hubungi Kami</h3>
            <ul className="site-footer__links">
              <li>
                <a href="https://web.whatsapp.com" target="_blank" rel="noopener noreferrer">
                  WhatsApp Support
                </a>
              </li>
              <li>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer">
                  YouTube Tutorial
                </a>
              </li>
              <li>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
                  LinkedIn Official
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="container site-footer__bottom">
          <p className="site-footer__copyright">
            © 2026 URT — Kelompok 2 UT. Hak cipta dilindungi.{' '}
          </p>
          <ul className="site-footer__legal-links">
            <li>
              <Link to="/privacy">Kebijakan Privasi</Link>
            </li>
            <li>
              <Link to="/terms">Syarat &amp; Ketentuan</Link>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
