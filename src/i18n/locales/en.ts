export default {
  // Navigation
  nav: {
    dashboard: 'Dashboard',
    workLogs: 'Work Logs',
    absences: 'Absences',
    requests: 'Requests',
    profile: 'Profile',
    signOut: 'Sign out',
    yourProfile: 'Your Profile',
    language: 'Language',
    employee: 'Employee'
  },

  // Authentication
  auth: {
    signIn: 'Sign in to your account',
    createAccount: 'Create an account',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    fullName: 'Full name',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot your password?',
    signInButton: 'Sign in',
    signingIn: 'Signing in...',
    createAccountButton: 'Create account',
    creatingAccount: 'Creating account...',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    register: 'Register',
    login: 'Login',
    validation: {
      emailRequired: 'Email is required',
      passwordRequired: 'Password is required',
      nameRequired: 'Name is required',
      passwordMin: 'Password must be at least 8 characters',
      passwordMismatch: 'Passwords do not match'
    }
  },

  // Dashboard
  dashboard: {
    welcome: 'Welcome, {name}',
    currentStatus: 'Current Status',
    weeklySummary: 'Weekly Summary',
    pendingRequests: 'Pending Requests',
    quickActions: 'Quick Actions',
    viewAll: 'View all',
    totalHours: 'Total hours',
    daysWorked: 'Days worked',
    noWorkLogs: 'No work logs available for this week.',
    noPendingRequests: 'No pending requests.',
    createNewRequest: 'Create new request',
    workingSince: 'Working since',
    duration: 'Duration',
    onBreak: 'On break',
    startedAt: 'Started at',
    breakTime: 'Break time',
    offsite: 'Offsite',
    leftAt: 'Left at',
    timeOffsite: 'Time offsite',
    lastCheckedOut: 'Last checked out',
    notCheckedIn: "You haven't checked in today.",
    pending: 'Pending'
  },

  // Work Status
  workStatus: {
    notWorking: 'Not Working',
    working: 'Working',
    onBreak: 'On Break',
    offsite: 'Offsite',
    startShift: 'Start Shift',
    endShift: 'End Shift',
    startBreak: 'Start Break',
    returnFromBreak: 'Return from Break',
    goOffsite: 'Go Offsite',
    returnToOffice: 'Return to Office',
    takeBreak: 'Take a break',
    startYourShift: 'Start your shift',
    endYourShift: 'End your shift',
    goOffsiteAction: 'Go offsite',
    returnToOfficeAction: 'Return to office'
  },

  // Work Logs
  workLogs: {
    title: 'Work Logs',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    today: 'Today',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    totalDays: 'Total days',
    totalHours: 'Total hours',
    noWorkLogs: 'No work logs found',
    noWorkLogsForPeriod: 'There are no work logs for this period.',
    noLogsForDay: 'No work logs for this day',
    checkIn: 'Check in',
    checkOut: 'Check out',
    time: 'Time',
    type: 'Type',
    category: 'Category',
    notes: 'Notes',
    day: 'Day',
    date: 'Date',
    exportPdf: 'Export PDF',
    exporting: 'Exporting...',
    exportSuccess: 'PDF exported successfully',
    exportError: 'Failed to export PDF',
    duration: 'Duration'
  },

  // Absences
  absences: {
    title: 'Absences',
    viewAndFilter: 'View and filter your absences',
    list: 'List',
    calendar: 'Calendar',
    absenceType: 'Absence Type',
    allTypes: 'All Types',
    from: 'From',
    to: 'To',
    noAbsences: 'No absences found',
    noRecordedAbsences: 'You have no recorded absences.',
    noMatchFilter: 'No absences match your filter criteria.',
    duration: 'Duration',
    status: 'Status',
    fullDay: 'Full day',
    partialDay: 'Partial day',
    absence: 'Absence'
  },

  // Requests
  requests: {
    title: 'Absence Requests',
    newRequest: 'New Request',
    all: 'All',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    noRequests: 'No requests found',
    noRequestsYet: "You haven't submitted any absence requests yet.",
    noFilterResults: 'No {status} requests found.',
    createFirst: 'Create your first request',
    type: 'Type',
    dates: 'Dates',
    days: 'Days',
    daysCount: '{count} day(s)',
    cancel: 'Cancel',
    cancelRequest: 'Cancel request',
    cancelConfirmTitle: 'Cancel Request',
    cancelConfirmMessage: 'Are you sure you want to cancel this absence request? This action cannot be undone.',
    keepRequest: 'Keep Request',
    yesCancelIt: 'Yes, Cancel It',
    cancelling: 'Cancelling...',
    cancelSuccess: 'Request cancelled successfully',
    cancelError: 'Failed to cancel request',
    partial: 'Partial',
    reason: 'Reason',
    actions: 'Actions'
  },

  // New Request
  newRequest: {
    title: 'New Absence Request',
    backToRequests: 'Back to requests',
    absenceType: 'Absence Type',
    selectType: 'Select absence type',
    availableVacation: 'Available vacation days',
    startDate: 'Start Date',
    endDate: 'End Date',
    daysRequested: 'Days requested',
    notEnoughVacation: "You don't have enough vacation days available.",
    partialAbsence: 'Partial day absence',
    partialHint: 'Check this if you only need a few hours off',
    startTime: 'Start Time',
    endTime: 'End Time',
    notes: 'Notes (optional)',
    notesPlaceholder: 'Add any additional information about your request...',
    characters: 'characters',
    requiresApproval: 'This type of absence requires manager approval. Your request will be pending until reviewed.',
    submit: 'Submit Request',
    submitting: 'Submitting...',
    submitSuccess: 'Absence request submitted successfully',
    submitError: 'Failed to submit absence request',
    newAbsenceRequest: 'New absence request',
    viewWorkLogs: 'View work logs'
  },

  // Profile
  profile: {
    title: 'Profile',
    personalInfo: 'Personal Information',
    employmentInfo: 'Employment Information',
    fullName: 'Full Name',
    email: 'Email',
    idNumber: 'ID Number',
    phone: 'Phone',
    birthDate: 'Birth Date',
    role: 'Role',
    workScheduleStart: 'Work Schedule Start',
    workScheduleEnd: 'Work Schedule End',
    remainingVacation: 'Remaining Vacation Days',
    days: 'days',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    notProvided: 'Not provided'
  },

  // Toast messages
  messages: {
    loginSuccess: 'Successfully logged in',
    loginFailed: 'Login failed',
    registerSuccess: 'Registration successful',
    registerFailed: 'Registration failed',
    logoutSuccess: 'Logged out successfully',
    profileUpdated: 'Profile updated successfully',
    profileUpdateFailed: 'Failed to update profile',
    passwordChanged: 'Password changed successfully',
    passwordChangeFailed: 'Failed to change password',
    fetchError: 'Failed to fetch data',
    savedOffline: 'Saved for syncing when connection is restored',
    invalidResponse: 'Invalid response from server',
    locationReady: 'Location ready',
    locationError: 'Location error',
    locationPending: 'Location pending',
    gettingLocation: 'Getting location...',
    offlineActionsWillSync: 'Offline - actions will sync later'
  },

  // Common
  common: {
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    yes: 'Yes',
    no: 'No',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    required: 'required',
    optional: 'optional',
    allRightsReserved: 'All rights reserved'
  },

  // Language selector
  language: {
    english: 'English',
    spanish: 'Spanish',
    changeLanguage: 'Change language',
    languageChanged: 'Language changed successfully'
  }
}
