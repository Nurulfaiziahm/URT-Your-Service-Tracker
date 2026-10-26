import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForgotPasswordMutation } from './authApi';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { InlineNotice } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from './Auth.module.css';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Masukkan alamat email yang terdaftar.');
      return;
    }

    try {
      await forgotPassword({ email: email.trim().toLowerCase() }).unwrap();
      navigate('/reset-password', {
        state: { email: email.trim().toLowerCase(), requested: true },
      });
    } catch (err: unknown) {
      const apiErr = err as { data?: ApiErrorBody; error?: string };
      setErrorMessage(
        apiErr.data?.error ||
          apiErr.error ||
          'Gagal mengirim kode pemulihan. Pastikan format email benar.',
      );
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <header className={styles.heading}>
        <span className="eyebrow">Pemulihan Akun</span>
        <h1>Lupa Kata Sandi</h1>
        <p>Masukkan alamat email Anda untuk menerima kode verifikasi pengaturan ulang kata sandi.</p>
      </header>

      {errorMessage && <InlineNotice>{errorMessage}</InlineNotice>}

      <TextInput
        label="Alamat email"
        name="email"
        type="email"
        placeholder="nama@email.com"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Button type="submit" full pending={isLoading}>
        Kirim Kode Pemulihan
      </Button>

      <footer className={styles.links}>
        <span>
          Ingat kata sandi Anda?{' '}
          <Link to="/login" className="text-link">
            Masuk kembali
          </Link>
        </span>
      </footer>
    </form>
  );
}
