import { auth } from "@/lib/better-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Store,
  BarChart3,
  Package,
  Smartphone,
  Zap,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Users,
  Globe,
  CreditCard,
  LayoutDashboard,
  Receipt,
  Menu
} from "lucide-react";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session?.user) {
    const user = session.user as { tenantId?: string | null };
    if (user.tenantId) {
      redirect("/dashboard/analytics");
    } else {
      redirect("/onboarding");
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Navbar */}
      <header className="border-b sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground shadow-lg">
              <Store className="w-5 h-5" />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
              Awan POS
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <Link href="#features" className="hover:text-primary transition-colors">Fitur</Link>
            <Link href="#how-it-works" className="hover:text-primary transition-colors">Cara Kerja</Link>
            <Link href="#pricing" className="hover:text-primary transition-colors">Harga</Link>
            <Link href="#faq" className="hover:text-primary transition-colors">FAQ</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/sign-in" className="hidden sm:block">
              <Button variant="ghost">Masuk</Button>
            </Link>
            <Link href="/sign-up">
              <Button className="shadow-lg hover:shadow-primary/25 transition-all">Mulai Sekarang</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background -z-10" />
          <div className="container mx-auto px-4 text-center">
            <Badge variant="secondary" className="mb-8 px-4 py-1.5 text-sm font-medium rounded-full border-primary/20 bg-primary/5 text-primary animate-in fade-in slide-in-from-bottom-4 duration-1000">
              ✨ Baru: Analisis Stok dengan AI
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 max-w-5xl mx-auto leading-tight animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
              Sistem Operasi untuk <br />
              <span className="text-primary relative">
                Bisnis Ritel Modern
                <svg className="absolute w-full h-3 -bottom-1 left-0 text-primary/20 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                </svg>
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              Kelola penjualan, inventaris, dan pelanggan dalam satu platform. Dibuat untuk kecepatan, dirancang untuk pertumbuhan, dan dicintai oleh pebisnis di Indonesia.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
              <Link href="/sign-up">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-xl hover:shadow-primary/25 hover:scale-105 transition-all">
                  Coba Gratis <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="#demo">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full hover:bg-muted/50">
                  Lihat Demo
                </Button>
              </Link>
            </div>

            {/* Dashboard Preview */}
            <div className="mt-20 relative mx-auto max-w-6xl rounded-2xl border bg-background/50 backdrop-blur shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
              <div className="aspect-[16/9] bg-muted/30 p-2 md:p-4">
                <div className="w-full h-full bg-background rounded-xl shadow-sm border overflow-hidden relative">
                  {/* Abstract UI Representation */}
                  <div className="absolute top-0 left-0 w-64 h-full border-r bg-muted/10 hidden md:block">
                    <div className="p-4 space-y-4">
                      <div className="h-8 w-3/4 bg-muted rounded animate-pulse" />
                      <div className="space-y-2">
                        <div className="h-4 w-full bg-muted/50 rounded" />
                        <div className="h-4 w-full bg-muted/50 rounded" />
                        <div className="h-4 w-5/6 bg-muted/50 rounded" />
                      </div>
                    </div>
                  </div>
                  <div className="md:ml-64 p-6 md:p-8">
                    <div className="flex justify-between mb-8">
                      <div className="h-8 w-48 bg-muted rounded animate-pulse" />
                      <div className="flex gap-2">
                        <div className="h-8 w-8 bg-muted rounded-full" />
                        <div className="h-8 w-8 bg-muted rounded-full" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="h-32 bg-primary/5 border border-primary/10 rounded-xl p-4">
                        <div className="h-8 w-8 bg-primary/20 rounded-lg mb-4" />
                        <div className="h-6 w-24 bg-muted rounded mb-2" />
                        <div className="h-8 w-32 bg-muted rounded" />
                      </div>
                      <div className="h-32 bg-muted/30 border rounded-xl p-4" />
                      <div className="h-32 bg-muted/30 border rounded-xl p-4" />
                    </div>
                    <div className="h-64 bg-muted/20 border rounded-xl" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-12 border-y bg-muted/30">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-8">
              Dipercaya oleh 1.000+ Bisnis Modern
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              {/* Placeholders for logos */}
              <div className="flex items-center gap-2 font-bold text-xl"><Store className="w-6 h-6" /> TokoRitel</div>
              <div className="flex items-center gap-2 font-bold text-xl"><Zap className="w-6 h-6" /> CepatMart</div>
              <div className="flex items-center gap-2 font-bold text-xl"><Package className="w-6 h-6" /> GudangKu</div>
              <div className="flex items-center gap-2 font-bold text-xl"><Globe className="w-6 h-6" /> IndoShop</div>
              <div className="flex items-center gap-2 font-bold text-xl"><Users className="w-6 h-6" /> Komunitas</div>
            </div>
          </div>
        </section>

        {/* Features Deep Dive */}
        <section id="features" className="py-24 md:py-32">
          <div className="container mx-auto px-4">
            <div className="text-center mb-24">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Semua yang Anda butuhkan untuk mengelola toko</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Kami menggabungkan semua alat yang Anda butuhkan dalam satu platform intuitif. Tidak perlu lagi pusing dengan banyak aplikasi atau spreadsheet.
              </p>
            </div>

            {/* Feature 1: POS */}
            <div className="grid md:grid-cols-2 gap-16 items-center mb-32">
              <div className="order-2 md:order-1">
                <div className="bg-gradient-to-br from-primary/10 to-transparent p-8 rounded-3xl border border-primary/10 aspect-square flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                  <LayoutDashboard className="w-48 h-48 text-primary/40" />
                  {/* Floating Elements */}
                  <div className="absolute top-1/4 right-1/4 bg-background p-4 rounded-xl shadow-xl border animate-bounce duration-[3000ms]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">Pembayaran Sukses</div>
                        <div className="text-xs text-muted-foreground">Rp 124.500 diterima</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="text-3xl md:text-4xl font-bold mb-4">Kasir Cepat & Mudah</h3>
                <p className="text-lg text-muted-foreground mb-8">
                  Percepat antrian dengan alur kasir yang optimal. Scan barcode, terapkan diskon, dan proses pembayaran dalam hitungan detik.
                </p>
                <ul className="space-y-4">
                  <FeatureItem text="Bekerja offline - tidak pernah kehilangan penjualan" />
                  <FeatureItem text="Dukungan berbagai metode pembayaran (QRIS, Tunai, Kartu)" />
                  <FeatureItem text="Struk dan invoice yang dapat disesuaikan" />
                  <FeatureItem text="Split bill dan pembayaran bertahap" />
                </ul>
              </div>
            </div>

            {/* Feature 2: Inventory */}
            <div className="grid md:grid-cols-2 gap-16 items-center mb-32">
              <div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-6">
                  <Package className="w-6 h-6" />
                </div>
                <h3 className="text-3xl md:text-4xl font-bold mb-4">Manajemen Stok Pintar</h3>
                <p className="text-lg text-muted-foreground mb-8">
                  Berhenti menebak stok barang. Lacak inventaris secara real-time di berbagai lokasi dan dapatkan peringatan saat stok menipis.
                </p>
                <ul className="space-y-4">
                  <FeatureItem text="Pelacakan stok real-time" />
                  <FeatureItem text="Varian produk (ukuran, warna, bahan)" />
                  <FeatureItem text="Peringatan stok rendah otomatis" />
                  <FeatureItem text="Impor/ekspor massal via CSV" />
                </ul>
              </div>
              <div>
                <div className="bg-gradient-to-bl from-blue-500/10 to-transparent p-8 rounded-3xl border border-blue-500/10 aspect-square flex items-center justify-center relative overflow-hidden">
                  <Package className="w-48 h-48 text-blue-500/40" />
                  <div className="absolute bottom-1/4 left-1/4 bg-background p-4 rounded-xl shadow-xl border animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
                        <Zap className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">Stok Menipis</div>
                        <div className="text-xs text-muted-foreground">Sisa 5 item</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3: Analytics */}
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="order-2 md:order-1">
                <div className="bg-gradient-to-tr from-purple-500/10 to-transparent p-8 rounded-3xl border border-purple-500/10 aspect-square flex items-center justify-center relative overflow-hidden">
                  <BarChart3 className="w-48 h-48 text-purple-500/40" />
                  <div className="absolute top-1/3 left-1/3 bg-background p-4 rounded-xl shadow-xl border">
                    <div className="space-y-2 w-48">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Pendapatan</span>
                        <span className="text-green-600">+12%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 w-3/4" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-6">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-3xl md:text-4xl font-bold mb-4">Wawasan Berbasis Data</h3>
                <p className="text-lg text-muted-foreground mb-8">
                  Pahami bisnis Anda lebih dalam. Identifikasi produk terlaris, jam sibuk, dan preferensi pelanggan.
                </p>
                <ul className="space-y-4">
                  <FeatureItem text="Laporan penjualan dan pendapatan" />
                  <FeatureItem text="Pelacakan kinerja karyawan" />
                  <FeatureItem text="Riwayat pembelian pelanggan" />
                  <FeatureItem text="Ekspor data untuk akuntansi" />
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Harga Simpel & Transparan</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Mulai gratis, upgrade saat Anda tumbuh. Tanpa biaya tersembunyi.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Starter Plan */}
              <Card className="border-2 hover:border-primary/50 transition-colors relative">
                <CardHeader>
                  <CardTitle className="text-2xl">Starter</CardTitle>
                  <CardDescription>Cocok untuk toko kecil</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">Gratis</span>
                    <span className="text-muted-foreground">/selamanya</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <PricingItem text="1 Lokasi Toko" />
                    <PricingItem text="1 Kasir (POS)" />
                    <PricingItem text="Hingga 100 Produk" />
                    <PricingItem text="Analitik Dasar" />
                    <PricingItem text="Dukungan Email" />
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href="/sign-up" className="w-full">
                    <Button variant="outline" className="w-full h-12">Mulai Sekarang</Button>
                  </Link>
                </CardFooter>
              </Card>

              {/* Pro Plan */}
              <Card className="border-2 border-primary shadow-xl scale-105 relative z-10">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                  Paling Populer
                </div>
                <CardHeader>
                  <CardTitle className="text-2xl">Pro</CardTitle>
                  <CardDescription>Untuk bisnis berkembang</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">Rp 199rb</span>
                    <span className="text-muted-foreground">/bulan</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <PricingItem text="3 Lokasi Toko" />
                    <PricingItem text="Kasir Tak Terbatas" />
                    <PricingItem text="Produk Tak Terbatas" />
                    <PricingItem text="Analitik Lanjutan" />
                    <PricingItem text="Peringatan Stok" />
                    <PricingItem text="Dukungan Prioritas" />
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href="/sign-up" className="w-full">
                    <Button className="w-full h-12">Coba Gratis 14 Hari</Button>
                  </Link>
                </CardFooter>
              </Card>

              {/* Enterprise Plan */}
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <CardTitle className="text-2xl">Enterprise</CardTitle>
                  <CardDescription>Untuk jaringan besar</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">Rp 999rb</span>
                    <span className="text-muted-foreground">/bulan</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <PricingItem text="Lokasi Tak Terbatas" />
                    <PricingItem text="Kasir Tak Terbatas" />
                    <PricingItem text="Akses API" />
                    <PricingItem text="Manajer Akun Khusus" />
                    <PricingItem text="Integrasi Kustom" />
                    <PricingItem text="Jaminan SLA" />
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href="/contact" className="w-full">
                    <Button variant="outline" className="w-full h-12">Hubungi Sales</Button>
                  </Link>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-24">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-6">Pertanyaan Umum (FAQ)</h2>
            </div>

            <div className="space-y-6">
              <FaqItem
                question="Apakah saya butuh alat khusus?"
                answer="Tidak! Awan POS bekerja di perangkat apa pun dengan browser web - laptop, tablet, dan smartphone. Anda bisa menggunakan alat yang sudah ada atau membeli printer struk dan scanner yang kompatibel jika diperlukan."
              />
              <FaqItem
                question="Bisakah digunakan saat offline?"
                answer="Ya, POS kami tetap bekerja meskipun koneksi internet Anda terputus. Penjualan disimpan secara lokal dan disinkronkan otomatis saat Anda kembali online."
              />
              <FaqItem
                question="Apakah data saya aman?"
                answer="Tentu saja. Kami menggunakan enkripsi setingkat bank untuk melindungi data Anda. Backup otomatis memastikan Anda tidak pernah kehilangan data bisnis."
              />
              <FaqItem
                question="Bisakah saya impor produk yang sudah ada?"
                answer="Ya, Anda dapat dengan mudah mengimpor produk menggunakan file CSV. Kami menyediakan template untuk memudahkan prosesnya."
              />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
          <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold mb-8">Siap memodernisasi bisnis Anda?</h2>
            <p className="text-xl text-primary-foreground/80 mb-12 max-w-2xl mx-auto">
              Bergabunglah dengan ribuan pebisnis yang menghemat waktu dan meningkatkan penjualan dengan Awan POS.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/sign-up">
                <Button size="lg" variant="secondary" className="h-14 px-10 text-lg rounded-full shadow-xl hover:shadow-2xl transition-all">
                  Mulai Gratis Sekarang
                </Button>
              </Link>
            </div>
            <p className="mt-8 text-sm text-primary-foreground/60">
              Tanpa kartu kredit • Coba gratis 14 hari • Batalkan kapan saja
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-muted py-16 border-t">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 font-bold text-xl mb-6">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                  <Store className="w-5 h-5" />
                </div>
                Awan POS
              </div>
              <p className="text-muted-foreground max-w-sm mb-6">
                Sistem kasir cloud all-in-one yang dirancang untuk membantu bisnis kecil dan menengah berkembang. Simpel, canggih, dan terjangkau.
              </p>
              <div className="flex gap-4">
                {/* Social Icons Placeholders */}
                <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center border hover:border-primary transition-colors cursor-pointer">
                  <Globe className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center border hover:border-primary transition-colors cursor-pointer">
                  <Users className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-bold mb-6">Produk</h3>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><Link href="#features" className="hover:text-primary transition-colors">Fitur</Link></li>
                <li><Link href="#pricing" className="hover:text-primary transition-colors">Harga</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Pembaruan</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Roadmap</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-6">Perusahaan</h3>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">Tentang Kami</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Karir</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Blog</Link></li>
                <li><Link href="/privacy" className="hover:text-primary transition-colors">Kebijakan Privasi</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Syarat & Ketentuan</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Awan POS. Hak cipta dilindungi undang-undang.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <CheckCircle2 className="w-4 h-4 text-primary" />
      </div>
      <span className="text-lg">{text}</span>
    </div>
  );
}

function PricingItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string, answer: string }) {
  return (
    <div className="border rounded-xl p-6 hover:border-primary/50 transition-colors bg-background">
      <h3 className="font-bold text-lg mb-2">{question}</h3>
      <p className="text-muted-foreground">{answer}</p>
    </div>
  );
}
