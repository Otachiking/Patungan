/**
 * i18n — English (secondary language)
 * Mirrors structure of id.ts exactly.
 */

const en = {
  appName: 'PtPtLah',
  appTagline: 'Item-level bill splitting, fair & transparent',

  landing: {
    heading: 'Split the Bill, Done.',
    subheading: 'Not split equally — who ordered what, calculated from there.',
    createBtn: 'Create New Event',
    eventTitleLabel: 'Event Name',
    eventTitlePlaceholder: 'e.g. Lunch at Pak Budi\'s',
    eventDateLabel: 'Date',
    participantsLabel: 'Who\'s joining?',
    addPersonBtn: 'Add person',
    personNamePlaceholder: 'Participant name',
    taxLabel: 'Tax & Service Charge',
    taxPlaceholder: '0',
    taxHint: 'Enter percentage, e.g. 11 for 11%',
    startBtn: 'Start Calculating',
    minPersonsError: 'At least 2 people needed for splitting.',
    emptyTitleError: 'Event name is required.',
  },

  editor: {
    addItemBtn: 'Add Item',
    itemNameLabel: 'Item Name',
    itemNamePlaceholder: 'e.g. Fried Rice',
    itemPriceLabel: 'Price',
    itemPricePlaceholder: '0',
    paidByLabel: 'Paid by',
    participantsLabel: 'Who shares this?',
    saveItemBtn: 'Save',
    cancelBtn: 'Cancel',
    deleteItemBtn: 'Delete',
    editItemBtn: 'Edit',
    noItemsYet: 'No items yet. Add the first one!',
    seeResultBtn: 'See Summary',
    editPeopleBtn: 'Edit Participants',
    taxRow: 'Tax & Service',
    subtotalRow: 'Subtotal',
    totalRow: 'Total',
    personSectionTitle: 'Participants',
  },

  summary: {
    heading: 'Bill Summary',
    itemsSection: 'Items',
    balanceSection: 'Per Person Bill',
    settlementSection: 'Who Pays Whom',
    youOwe: 'You owe',
    youReceive: 'You\'ll receive',
    settled: 'Settled!',
    transferTo: 'Transfer to',
    via: 'via',
    noSettlementNeeded: 'All settled, no transfers needed!',
    subtotalLabel: 'Expense',
    taxLabel: 'Tax & Service',
    totalExpenseLabel: 'Total Expense',
    paidLabel: 'Paid',
    netLabel: 'Net Balance',
    editBtn: 'Edit Event',
    finalizeBtn: 'Finalize',
    finalizeConfirm: 'Finalize this event? It cannot be edited after this.',
    finalized: 'SETTLED',
    finalizedAt: 'Finalized on',
  },

  common: {
    loading: 'Loading...',
    error: 'Something went wrong. Please try again.',
    notFound: 'Event not found.',
    copyLink: 'Copy Link',
    copied: 'Copied!',
    currency: 'IDR',
    back: 'Back',
    confirm: 'Yes',
    delete: 'Delete',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
  },
} as const;

export default en;
