/**
 * i18n — Indonesian (default language)
 * All UI strings go through here. Never hardcode text in components.
 */

const id = {
  // ─── App ───────────────────────────────────────────────────────────────────
  appName: 'SpillTheBill',
  appTagline: 'Patungan per-item, adil & transparan',

  // ─── Landing page ─────────────────────────────────────────────────────────
  landing: {
    heading: 'Patungan Adil, Gak Pake Ribet.',
    subheading: 'Bayar sesuai yang kamu pesan. Itungan adil, no drama.',
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
    itemPriceLabel: 'Harga Satuan',
    itemPricePlaceholder: '0',
    paidByLabel: 'Dibayarkan oleh',
    paidByShort: 'Dibayar',
    sharedByShort: 'Dibebankan',
    perPersonShort: 'orang',
    participantsLabel: 'Dibebankan kepada',
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
    addPersonBtn: 'Tambah Peserta',
    pinModalTitle: 'Akses Edit Terkunci',
    pinModalDesc: 'Masukkan PIN 4 angka untuk mengedit pesanan ini.',
    pinModalPlaceholder: 'PIN (4 angka)',
    pinModalSubmit: 'Buka Kunci',
    pinModalError: 'PIN salah. Coba lagi.',
    documentation: 'Dokumentasi',
    photo: 'Foto',
    addReceiptPhoto: 'Tambah Foto Struk',
    uploadPhotoDesc: 'Klik atau drag & drop · JPG, PNG, HEIC',
    uploading: 'Mengunggah...',
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
    paidLabel: 'Sudah bayar',
    netLabel: 'Selisih Akhir',
    expenseLabel: 'Tanggungan',
    receiveLabel: 'Terima',
    payLabel: 'Keluar',
    settledLabel: '✓ Lunas',
    nPeople: '{n} orang',
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
    home: 'Beranda',
  },

  history: {
    title: 'Patungan Sebelumnya',
    empty: 'Belum ada riwayat patungan.',
    persons: 'peserta',
    items: 'item',
  },

  footer: {
    tagline: 'Gratis · Tanpa akun · Open source',
    madeWith: 'dibuat dengan',
  },
};

export default id;

type DeepString<T> = {
  [K in keyof T]: T[K] extends object ? DeepString<T[K]> : string;
};

export type TranslationKeys = DeepString<typeof id>;
