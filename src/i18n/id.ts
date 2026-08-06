/**
 * i18n — Indonesian (default language)
 * All UI strings go through here. Never hardcode text in components.
 */

const id = {
  // ─── App ───────────────────────────────────────────────────────────────────
  appName: 'PtPtLah',
  appTagline: 'Patungan per-item, adil & transparan',

  // ─── Landing page ─────────────────────────────────────────────────────────
  landing: {
    heading: 'Hitung Patungan, Beres.',
    subheading: 'Bukan dibagi rata — siapa pesan apa, dihitung dari situ.',
    createBtn: 'Buat Acara Baru',
    eventTitleLabel: 'Nama Acara',
    eventTitlePlaceholder: 'Contoh: Makan Siang di Warung Pak Budi',
    eventDateLabel: 'Tanggal',
    participantsLabel: 'Siapa aja yang ikut?',
    addPersonBtn: 'Tambah orang',
    personNamePlaceholder: 'Nama peserta',
    taxLabel: 'PPN & Service Charge',
    taxPlaceholder: '0',
    taxHint: 'Masukkan persentase, contoh: 11 untuk 11%',
    startBtn: 'Mulai Hitung',
    minPersonsError: 'Minimal 2 orang untuk patungan.',
    emptyTitleError: 'Nama acara wajib diisi.',
    pinLabel: 'PIN Akses Edit',
    pinPlaceholder: '4 angka, contoh: 1234',
    pinHint: 'PIN ini diperlukan jika kamu atau temanmu ingin mengedit pesanan nantinya.',
    invalidPinError: 'PIN harus 4 angka.',
  },

  // ─── Editor page ──────────────────────────────────────────────────────────
  editor: {
    addItemBtn: 'Tambah Item',
    itemNameLabel: 'Nama Item',
    itemNamePlaceholder: 'Contoh: Nasi Goreng',
    itemPriceLabel: 'Harga',
    itemPricePlaceholder: '0',
    paidByLabel: 'Dibayar oleh',
    participantsLabel: 'Siapa yang menanggung?',
    saveItemBtn: 'Simpan',
    cancelBtn: 'Batal',
    deleteItemBtn: 'Hapus',
    editItemBtn: 'Edit',
    noItemsYet: 'Belum ada item. Tambah item pertama!',
    seeResultBtn: 'Lihat Ringkasan',
    editPeopleBtn: 'Edit Peserta',
    taxRow: 'PPN & Service',
    subtotalRow: 'Subtotal',
    totalRow: 'Total',
    personSectionTitle: 'Peserta',
    pinModalTitle: 'Akses Edit Terkunci',
    pinModalDesc: 'Masukkan PIN 4 angka untuk mengedit pesanan ini.',
    pinModalPlaceholder: 'PIN (4 angka)',
    pinModalSubmit: 'Buka Kunci',
    pinModalError: 'PIN salah. Coba lagi.',
  },

  // ─── Summary / Settlement page ────────────────────────────────────────────
  summary: {
    heading: 'Ringkasan Patungan',
    itemsSection: 'Daftar Item',
    balanceSection: 'Tagihan per Orang',
    settlementSection: 'Siapa Transfer ke Siapa',
    youOwe: 'Kamu harus bayar',
    youReceive: 'Kamu menerima',
    settled: 'Lunas!',
    transferTo: 'Transfer ke',
    via: 'via',
    noSettlementNeeded: 'Semua sudah lunas, tidak perlu transfer!',
    subtotalLabel: 'Pengeluaran',
    taxLabel: 'Pajak & Service',
    totalExpenseLabel: 'Total Tanggungan',
    paidLabel: 'Sudah Dibayar',
    netLabel: 'Selisih Akhir',
    editBtn: 'Edit Acara',
    finalizeBtn: 'Kunci Acara',
    finalizeConfirm: 'Yakin mau mengunci acara ini? Setelah dikunci, tidak bisa diedit lagi.',
    finalized: 'LUNAS',
    finalizedAt: 'Diselesaikan pada',
  },

  // ─── Shared / Common ──────────────────────────────────────────────────────
  common: {
    loading: 'Memuat...',
    error: 'Terjadi kesalahan. Coba lagi.',
    notFound: 'Acara tidak ditemukan.',
    copyLink: 'Salin Link',
    copied: 'Tersalin!',
    currency: 'IDR',
    back: 'Kembali',
    confirm: 'Ya',
    delete: 'Hapus',
    edit: 'Edit',
    save: 'Simpan',
    cancel: 'Batal',
    close: 'Tutup',
  },
};

export default id;

type DeepString<T> = {
  [K in keyof T]: T[K] extends object ? DeepString<T[K]> : string;
};

export type TranslationKeys = DeepString<typeof id>;
