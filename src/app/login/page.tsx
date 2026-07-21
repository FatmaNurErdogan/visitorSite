// /login adresinde açılır. Personel (resepsiyon/employee/admin) buradan
// email + şifre ile giriş yapacak. Ziyaretçiler bu sayfayı hiç görmeyecek,
// onlar kendi linkinden (/visit/[token]) giriyor.
// TODO: giriş formu + next-auth ile giriş yapma işlemi
export default function LoginPage() {
  return (
    <main className="login-page">
      <h1>Giriş Yap</h1>
    </main>
  );
}
