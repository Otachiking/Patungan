# PtPtLah — Project Brief

Aplikasi web untuk menghitung patungan dengan granularitas per-item: setiap item punya pembayar dan daftar kontributor sendiri, sehingga hasil akhir mencerminkan siapa sebenarnya menanggung apa — bukan sekadar dibagi rata ke semua orang.

## 1. Masalah yang diselesaikan

Kompetitor besar (Splitwise, Tricount, Settle Up, fitur split bill di e-wallet lokal seperti DANA/GoPay) menyelesaikan "split rata" atau "split custom nominal manual". Belum ada yang menyelesaikan kasus "siapa pesan item apa, otomatis dihitung dari situ" dengan UX sesimpel checklist. Ini adalah celah dan diferensiasi utama PtPtLah — fokus di sini dulu, jangan buru-buru menyaingi fitur yang sudah crowded (OCR struk, multi-currency).

## 2. User flow

1. **Inisiasi**: user input judul acara + daftar nama orang (bisa diedit/custom kapan saja).
2. **Input item**: nama item, harga, dibayar oleh siapa (1 orang untuk MVP), dan checklist siapa saja yang menanggung item itu.
3. **Kalkulasi otomatis**: setiap tambah/edit item, sistem langsung hitung ulang total expense, kontribusi, dan net balance tiap orang.
4. **Ringkasan akhir**: net balance per orang + daftar transaksi settlement yang sudah disederhanakan (siapa transfer ke siapa, berapa).
5. **Share**: export sebagai gambar atau bagikan link read-only.

## 3. Scope MVP vs Backlog

**MVP (v1):**
- 1 payer per item
- Split rata ke peserta yang di-checklist (belum ada custom quantity/weight)
- Debt simplification (lihat §5)
- PPN & service charge sebagai baris otomatis, proporsional ke subtotal
- Share via link read-only + export gambar
- Tanpa akun/login (edit-token di localStorage device)

**Backlog v2 (sudah didesain data model-nya supaya gampang nambah, tapi TIDAK dikerjakan di MVP):**
- Multi-payer per item
- Custom weight/quantity per participant per item (bukan cuma equal-split)
- Real-time collaborative editing (semua orang bisa checklist bareng)
- Akun/login untuk riwayat project
- OCR scan struk
- Multi-currency

## 4. Data model

```
Project {
  id, title, date, share_slug, edit_token,
  currency (default "IDR"),
  tax_rate (default 0)   // misal 0.11 utk PPN, bisa gabung service charge jadi 1 angka atau dipisah
}

Person {
  id, project_id, name
}

Item {
  id, project_id, name, price,
  paid_by_person_id,          // single value di MVP, gampang jadi array di v2
  participants: [
    { person_id, weight }     // weight default = 1 di MVP (equal split), dibuka utk custom di v2
  ]
}
```

Balance dihitung on-the-fly, tidak disimpan di DB (biar selalu konsisten kalau item diedit):

```
subtotal[person] = Σ ( item.price × (participant.weight / Σ weight semua participant item itu) )
                    untuk setiap item dimana person adalah participant

pajak[person] = (subtotal[person] / Σ subtotal semua orang) × total_pajak

expense[person] = subtotal[person] + pajak[person]

paid[person] = Σ item.price untuk setiap item dimana person = paid_by

net[person] = paid[person] − expense[person]
// net positif = orang ini net-creditor (harus menerima uang)
// net negatif = orang ini net-debtor (harus membayar)
```

**Prinsip arsitektur**: pisahkan calculation engine (`calculateSettlement(project) → { balances, transactions }`) dari layer UI/DB. Fungsi murni, gampang di-unit-test, dan bisa dipakai ulang kalau nanti ada mobile app atau API publik.

## 5. Algoritma settlement — debt simplification (greedy)

Tujuan: minimalkan jumlah transaksi transfer di akhir. Kalau cuma ada 1 net-creditor, hasilnya otomatis sama dengan "semua debtor transfer ke 1 orang itu" (kasus paling sederhana). Bedanya baru kelihatan kalau ada lebih dari 1 net-creditor.

Pseudocode:

```
function calculateSettlement(balances):
  debtors   = [p for p in balances if net[p] < 0], urutkan dari paling negatif
  creditors = [p for p in balances if net[p] > 0], urutkan dari paling positif
  transactions = []

  while debtors not empty and creditors not empty:
    debtor = debtors[0]
    creditor = creditors[0]
    amount = min(abs(debtor.net), creditor.net)

    transactions.add({ from: debtor, to: creditor, amount })

    debtor.net += amount
    creditor.net -= amount

    if debtor.net == 0: debtors.remove(debtor)
    if creditor.net == 0: creditors.remove(creditor)

  return transactions
```

Ini greedy match debtor terbesar ke creditor terbesar — hasilnya jumlah transaksi ≤ (jumlah orang − 1), jauh lebih ringkas daripada naive approach (semua debtor transfer ke semua payer terkait proporsional).

## 6. Rounding

Karena transfer digital (bukan cash fisik), tidak perlu dibulatkan ke kelipatan Rp100/500. Gunakan **largest remainder method**:

1. Hitung share tiap orang sampai desimal penuh.
2. Bulatkan ke Rupiah terdekat per orang (floor).
3. Ada sisa pembulatan dari total item (biasanya beberapa Rupiah) — alokasikan sisa itu satu-satu ke orang dengan desimal sisa terbesar, urutan deterministic (bukan random), sampai sisa habis.
4. Ini menjamin grand total expense selalu pas dengan grand total harga.

## 7. PPN & service charge

Ditampilkan sebagai baris terpisah di ringkasan ("PPN & Service 11% — Rp XXX") supaya transparan, tapi **tidak** di-split rata — di-split **proporsional ke subtotal masing-masing orang** (lihat formula di §4). Orang yang subtotal-nya besar otomatis menanggung pajak lebih besar juga — ini mencerminkan cara kerja pajak resto yang sesungguhnya.

## 8. Sharing model (MVP — tanpa akun)

- Bikin project → generate `project_id` + `edit_token` acak.
- URL edit: `/p/{project_id}/edit?t={edit_token}` — disimpan di localStorage device pembuat, jadi otomatis lanjut edit kalau buka dari device yang sama.
- Tombol "Bagikan hasil" → generate link read-only: `/p/{project_id}` (summary akhir saja, tidak bisa edit).
- Tombol "Export sebagai gambar" (html2canvas) untuk di-screenshot-share ke WhatsApp grup tanpa perlu klik link.

## 9. Tech stack (saran)

- **Next.js + Tailwind** — frontend, deploy gampang di Vercel
- **Supabase** (Postgres) — lebih fleksibel dari Firebase untuk data relasional seperti ini; opsional pakai realtime-nya kalau v2 mau collaborative editing
- Tidak perlu auth wajib — share-slug/edit-token based access
- `html2canvas` untuk export gambar

## 10. Istilah dwibahasa (i18n)

Semua string UI harus lewat translation key dari awal (jangan hardcode Bahasa Indonesia langsung di komponen) — retrofit i18n belakangan jauh lebih mahal.

| English | Indonesia (utama) | Alternatif |
|---|---|---|
| Project / Event | Acara | Kegiatan, Proyek |
| Item | Item | Barang |
| Paid by | Dibayar oleh | Yang bayar |
| Participant | Peserta | Penanggung |
| Split | Bagi rata | Patungan |
| Per person | Per orang | — |
| Total expense | Total pengeluaran | Total tanggungan |
| Contribution (paid) | Sudah dibayar | Kontribusi |
| Net balance | Selisih akhir | Saldo bersih |
| You owe | Kamu harus bayar | Kamu berutang |
| You'll receive | Kamu menerima | Kamu dapat kembalian |
| Settle up | Selesaikan pembayaran | Pelunasan |
| Share link | Bagikan tautan | Bagikan link |
| Tax & service | Pajak & service | PPN & biaya layanan |
| Finalize | Kunci acara | Selesaikan acara |

## 11. Analisis kompetitor (ringkasan)

| App | Kekuatan | Kelemahan | Beda dari PtPtLah |
|---|---|---|---|
| Splitwise | Fitur lengkap, ledger jangka panjang | Free tier dibatasi entry harian + iklan | Gratis, no-login, fokus item-level |
| Tricount | Gratis, no akun, ada OCR | Kurang granular di level kontributor per-item | Lebih detail per-item contributor |
| Settle Up | Custom percentage/fixed amount, ada versi web | UI generic, tidak native handle PPN resto ID | Native handle PPN gaya Indonesia |
| DANA/GoPay/Blu | Terintegrasi e-wallet, ada scan struk (GoPay) | Cuma split rata/manual, terikat 1 e-wallet | Platform-agnostic, solve item-level assignment |

## 12. Design guideline

**Arah desain**: bukan tema "cream + serif + terracotta" generik ala AI, bukan juga dark-mode neon. Konsepnya diangkat dari artefak asli budaya patungan Indonesia: **nota/struk warung** dan **stempel "LUNAS"**.

**Token warna:**
| Nama | Hex | Pemakaian |
|---|---|---|
| Kertas | `#F7F4EC` | Background utama, seperti kertas nota |
| Tinta | `#2A2A25` | Teks utama |
| Tinta pudar | `#6B685D` | Teks sekunder/caption |
| Stempel | `#B23A2E` | Aksen utama/CTA — warna tinta stempel, bukan terracotta `#D97757` yang generik |
| Lunas hijau | `#3F7D5C` | Status "kamu akan menerima" |
| Utang kuning | `#C48A2E` | Status "kamu harus bayar" / pending |

**Tipografi:**
- Display/heading: geometris rounded sans (mis. Space Grotesk) — kesan approachable, cocok suasana nongkrong.
- Body: humanist sans yang enak dibaca Bahasa Indonesia (mis. Plus Jakarta Sans / Inter).
- Angka/currency: monospace (mis. IBM Plex Mono) — meniru font mesin kasir/struk, sekaligus bikin nominal Rupiah gampang di-scan mata dan align rapi di kolom.

**Layout & signature element:**
- Layar ringkasan didesain seperti struk memanjang, dengan garis putus-putus (dashed) sebagai "sobekan" pemisah antar section (daftar item vs ringkasan settlement).
- Nominal selalu rata kanan dalam font monospace, seperti struk kasir asli.
- Signature moment: saat project di-"kunci"/finalize, muncul elemen stempel bundar "LUNAS" (subtle animasi stempel jatuh/nge-tap) — momen penutup yang related banget ke budaya nota Indonesia, dipakai sekali saja supaya tetap berkesan (bukan dipakai berulang jadi dekorasi).

**Prinsip lain:**
- Restraint: satu warna aksen (Stempel) untuk CTA utama, warna hijau/kuning khusus untuk status net balance saja — jangan dipakai di tempat lain.
- Copy: sentence case, active voice, dari sudut pandang user ("Kamu harus bayar Rp82.200", bukan "Sistem mendeteksi hutang sebesar...").
- Mobile-first — mayoritas penggunaan terjadi di HP saat lagi di resto/acara.

## 13. Catatan eksekusi (untuk Antigravity)

Urutan implementasi yang disarankan supaya agen coding tidak bingung prioritas:
1. Data model + calculation engine (§4–§7) sebagai pure functions, lengkap dengan unit test untuk kasus: equal split, multi-creditor settlement, rounding remainder, proporsi pajak.
2. UI input flow (inisiasi project → tambah item → checklist kontributor).
3. UI ringkasan/settlement.
4. Sharing (edit-token + read-only link + export gambar).
5. Terapkan design guideline (§12) di seluruh komponen.

Prompt ke Antigravity sebaiknya dipecah per bagian di atas (jangan satu prompt raksasa), dan lampirkan file ini sebagai context di awal sesi.
