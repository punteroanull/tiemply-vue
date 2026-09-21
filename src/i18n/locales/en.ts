export default {
  // Navigation
  nav: {
    dashboard: 'Dashboard',
    workLogs: 'Work Logs',
    schedule: 'My Schedule',
    overtime: 'Overtime',
    incidents: 'Incidents',
    absences: 'Absences',
    requests: 'Requests',
    profile: 'Profile',
    signOut: 'Sign out',
    yourProfile: 'Your Profile',
    language: 'Language',
    employee: 'Employee',
    hourPool: 'Hour Pool'
  },

  // Invitation
  invitation: {
    title: 'Complete your registration',
    welcomeMessage: 'You have been invited to join {company}. Complete your registration to get started.',
    firstName: 'First name',
    lastName: 'Last name',
    address: 'Address',
    optionalFields: 'Optional fields - you can complete these later',
    completeButton: 'Complete registration',
    completing: 'Completing...',
    invalidTitle: 'Invalid invitation',
    notFound: 'The invitation does not exist or the link is incorrect.',
    expiredOrUsed: 'This invitation has expired or has already been used.',
    loadError: 'Error loading the invitation. Please try again.',
    completeError: 'Error completing registration. Please try again.',
    goToLogin: 'Go to login'
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
    duration: 'Duration',
    source: 'Source',
    sourceTypes: {
      web: 'Web',
      mobile: 'Mobile',
      nfc: 'NFC',
      manual: 'Manual'
    }
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
    absence: 'Absence',
    vacationAvailable: 'Vacation available',
    daysAvailable: '{remaining}/{total} days available',
    daysUsed: '{count} day(s)',
    pendingRequest: 'Pending request',
    approvedAbsence: 'Approved absence',
    clickToEdit: 'Click to edit',
    thisMonth: 'This month'
  },

  // Requests
  requests: {
    title: 'Absence Requests',
    newRequest: 'New Request',
    all: 'All',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    partialStatus: 'Partial',
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
    actions: 'Actions',
    editRequest: 'Edit Request',
    saveChanges: 'Save Changes',
    saving: 'Saving...',
    requestUpdated: 'Request updated successfully',
    updateError: 'Failed to update request',
    cannotEditApproved: 'Cannot edit approved requests',
    requestNotFound: 'Request not found',
    edit: 'Edit',
    addPeriod: 'Add period',
    removePeriod: 'Remove period',
    period: 'Period',
    periods: 'Periods',
    periodOf: 'Period {current} of {total}',
    approvedDays: 'Approved days',
    pendingDays: 'Pending days',
    exceedsAvailable: 'Exceeds available days',
    exceedsAllowed: 'Exceeds maximum allowed',
    willUseExcess: 'Will use {days} excess days'
  },

  // Team Requests (Managers)
  teamRequests: {
    title: 'Team Requests',
    pendingReview: 'Pending Review',
    reviewed: 'Reviewed',
    employee: 'Employee',
    approve: 'Approve',
    reject: 'Reject',
    approveAll: 'Approve All',
    rejectAll: 'Reject All',
    rejectionReason: 'Rejection reason',
    rejectionReasonPlaceholder: 'Enter reason for rejection...',
    approveSuccess: 'Period approved successfully',
    rejectSuccess: 'Period rejected successfully',
    approveAllSuccess: 'All periods approved',
    rejectAllSuccess: 'All periods rejected',
    noTeamRequests: 'No pending requests from your team',
    reviewedAt: 'Reviewed at',
    approvePeriod: 'Approve period',
    rejectPeriod: 'Reject period',
    confirmReject: 'Confirm Rejection',
    periodStatus: 'Period status',
    accessDenied: 'You do not have permission to review team requests'
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
    offlineActionsWillSync: 'Offline - actions will sync later',
    locationRequiredForCheckout: 'Location is required for check-out but could not be obtained.',
    checkoutNotRecorded: 'Check-out may not have been recorded. Please verify in your work logs.'
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
  },

  // Department
  department: {
    section: 'Department',
    title: 'My Department',
    myDepartment: 'My Department',
    info: 'Department Info',
    name: 'Name',
    description: 'Description',
    supervisor: 'Supervisor',
    noSupervisor: 'No supervisor assigned',
    employeeCount: 'Team Size',
    employees: 'employees',
    colleagues: 'Colleagues',
    noColleagues: 'No colleagues in this department',
    youAreSupervisor: 'You are the supervisor of this department',
    noDepartment: 'You are not assigned to any department',
    noDepartmentDescription: 'Contact your administrator to be assigned to a department.',

    // Supervisor actions
    supervisorActions: 'Supervisor Actions',
    viewAbsences: 'Department Absences',
    viewRequests: 'Pending Requests',
    viewWorkLogs: 'Work Logs',
    registerAbsence: 'Register Absence',

    // Absences view
    absences: 'Absences',
    absencesDescription: 'View and manage department absences',
    employee: 'Employee',
    allEmployees: 'All Employees',
    noAbsences: 'No absences found',
    noAbsencesDescription: 'There are no absences recorded for the selected filters',

    // Requests view
    requests: 'Requests',
    requestsDescription: 'Review and manage absence requests',
    pendingRequests: 'Pending Requests',
    noRequests: 'No pending requests',
    noRequestsDescription: 'There are no absence requests to review',
    approve: 'Approve',
    reject: 'Reject',
    approving: 'Approving...',
    rejecting: 'Rejecting...',
    requestApproved: 'Request approved successfully',
    requestRejected: 'Request rejected successfully',

    // Work logs view
    workLogs: 'Work Logs',
    workLogsDescription: 'View department work logs',
    noWorkLogs: 'No work logs found',
    noWorkLogsDescription: 'There are no work logs for the selected filters',

    // New absence form
    registerAbsenceDescription: 'Register a direct absence for a team member',
    selectEmployee: 'Select an employee',
    absenceCreated: 'Absence registered successfully',
    absenceCreateError: 'Failed to register absence',

    // Calendar
    calendar: 'Department Calendar',
    calendarDescription: 'View team absences calendar',

    // Clock-in indicator
    clockedIn: 'Clocked in today',
    notClockedIn: 'Not clocked in today'
  },

  // Schedules
  schedule: {
    title: 'My Schedule',
    weeklyView: 'Weekly View',
    thisWeek: 'This Week',
    previousWeek: 'Previous Week',
    nextWeek: 'Next Week',
    noSchedule: 'You have no assigned schedule',
    noScheduleDescription: 'Contact your administrator to be assigned a schedule.',
    totalWeeklyHours: 'Total weekly hours',
    totalDailyHours: 'Total daily hours',
    scheduleTypes: {
      normal: 'Normal',
      split: 'Split Shift',
      night: 'Night Shift',
      guard: 'On-Call',
      rotating: 'Rotating'
    },
    block: 'Block',
    startTime: 'Start',
    endTime: 'End',
    todaySchedule: "Today's Schedule",
    weekOf: 'Week of {date}',
    crossesMidnight: 'Crosses midnight',
    nextDay: '(next day)',
    noBlocksToday: 'No schedule blocks today',
    effectiveFrom: 'Effective from',
    effectiveUntil: 'Effective until'
  },

  // Overtime
  overtime: {
    title: 'Overtime',
    summary: 'Annual Summary',
    records: 'Records',
    totalHours: 'Total Hours',
    approved: 'Approved',
    pending: 'Pending',
    rejected: 'Rejected',
    annualLimit: 'Annual Limit',
    remaining: 'Remaining',
    percentageUsed: '{percentage}% used',
    nearLimit: 'Approaching annual limit',
    atLimit: 'Annual limit reached',
    automaticRegistration: 'Automatic registration',
    manualRegistration: 'Manual registration',
    monthlyBreakdown: 'Monthly Breakdown',
    noRecords: 'No overtime records',
    noRecordsDescription: 'You have no overtime hours registered yet.',
    registeredMessage: '{hours} overtime hours have been registered',
    date: 'Date',
    hours: 'Hours',
    status: 'Status',
    approvedBy: 'Approved by',
    approvedAt: 'Approved at',
    filterByStatus: 'Filter by status',
    filterByMonth: 'Filter by month',
    allStatuses: 'All statuses',
    allMonths: 'All months',
    year: 'Year'
  },

  // Incidents
  incidents: {
    title: 'Shift Incidents',
    types: {
      unclosed_shift: 'Unclosed Shift',
      late_arrival: 'Late Arrival',
      early_departure: 'Early Departure',
      missing_checkout: 'Missing Checkout'
    },
    statuses: {
      pending: 'Pending',
      resolved: 'Resolved',
      validated: 'Validated',
      marked_absence: 'Marked as Absence'
    },
    noIncidents: 'No incidents',
    noIncidentsDescription: 'You have no incidents recorded.',
    pendingCount: 'You have {count} pending incident(s)',
    expectedTime: 'Expected time',
    actualTime: 'Actual time',
    resolvedTime: 'Resolution time',
    difference: 'Difference',
    minutes: '{count} min',
    resolvedBy: 'Resolved by',
    resolvedAt: 'Resolved at',
    resolutionNotes: 'Resolution notes',
    filterByType: 'Filter by type',
    filterByStatus: 'Filter by status',
    allTypes: 'All types',
    allStatuses: 'All statuses',
    date: 'Date'
  },

  // Work Log (extended)
  workLog: {
    nightShift: 'Night shift',
    shiftDate: 'Shift date',
    effectiveHours: 'Effective hours',
    overtimeRegistered: 'Overtime registered',
    nightShiftIndicator: 'You are on night shift',
    shiftDateDifferent: 'Shift date: {date}'
  },

  // Hour Pool
  hourPool: {
    title: 'Hour Pool',
    subtitle: 'View your hour balance and entry history',
    netBalance: 'Net Balance',
    credits: 'Credits',
    debits: 'Debits',
    balance: 'Balance',
    credit: 'Credit',
    debit: 'Debit',
    pendingOvertime: 'Pending Overtime',
    potentialBalance: 'Potential balance',
    entries: 'Entries',
    allTypes: 'All types',
    allSources: 'All sources',
    date: 'Date',
    type: 'Type',
    minutes: 'Minutes',
    source: 'Source',
    description: 'Description',
    createdBy: 'Created by',
    actions: 'Actions',
    notAvailable: 'Hour Pool not available',
    notAvailableDescription: 'The hour pool is not available for employees in this company.',
    noEntries: 'No entries',
    noEntriesDescription: 'You have no hour pool entries yet.',
    showing: 'Showing',
    of: 'of',
    status: {
      label: 'Status',
      company_owes: 'Company owes',
      employee_owes: 'Employee owes',
      even: 'Even'
    },
    sourceTypes: {
      overtime_approved: 'Approved overtime',
      late_arrival: 'Late arrival',
      early_departure: 'Early departure',
      incident_reversal: 'Incident reversal',
      manual_adjustment: 'Manual adjustment'
    },
    companySummary: {
      title: 'Hour Pool Summary',
      subtitle: 'Company-wide hour pool overview',
      employees: 'Employees',
      employee: 'Employee',
      employeeBreakdown: 'Employee Breakdown',
      noEmployees: 'No employee data available'
    },
    adjustment: {
      button: 'Adjust',
      title: 'Manual Adjustment',
      descriptionPlaceholder: 'Reason for adjustment...',
      minutesRequired: 'Minutes must be at least 1',
      descriptionRequired: 'Description is required',
      success: 'Adjustment created successfully'
    }
  },

  // Geolocation
  impersonation: {
    banner: {
      viewingAs: 'You are viewing the app as',
      readOnly: 'Read-only',
      writeEnabled: 'You can change data',
      exit: 'Back to my account'
    },
    landing: {
      loading: 'Opening the application…',
      failedTitle: 'The session could not be opened',
      failedBody: 'The link is invalid or has expired. Start it again from the admin panel.'
    }
  },
  geolocation: {
    title: 'Location Services',
    description: 'Manage location tracking for check-in and check-out',
    notSupported: 'Geolocation is not supported by your browser',
    disabledForCompany: 'Geolocation is disabled for your company',
    permissionNeeded: 'Location permission is needed for check-in/check-out',
    locationRequired: 'Location is required for check-in/check-out',
    locationOptional: 'Location will be requested during check-in/check-out',
    permissionFailed: 'Failed to get location permission',
    enabled: 'Location Enabled',
    permissionRequired: 'Permission Required',
    disabled: 'Location Disabled',
    unavailable: 'Location Unavailable',
    grantPermission: 'Grant Permission',
    settings: 'Settings',
    required: 'Required',
    optional: 'Optional',
    usedForBoth: 'Used for both check-in and check-out',
    dataSecure: 'Data is stored securely',
    troubleshooting: 'Troubleshooting',
    lastKnownLocation: 'Last Known Location',
    coordinates: 'Coordinates',
    address: 'Address',
    obtained: 'Obtained',
    troubleshootingIntro: "If you're having trouble with location permissions:",
    troubleshootingStep1: "Click the location icon in your browser's address bar",
    troubleshootingStep2: 'Select "Allow" for location access',
    troubleshootingStep3: 'Refresh the page and try again',
    troubleshootingStep4: 'For mobile: Check your browser location settings',
    locationError: 'Location error',
    locationAvailable: 'Location available',
    locationPending: 'Location pending',
    retry: 'Retry',
    gettingLocation: 'Getting location…',
    errors: {
      notSupported: 'Your browser cannot provide your location. Open the app in an up-to-date Chrome or Safari and check the address starts with https.',
      permissionDenied: 'you have blocked location access. Tap the padlock icon in the address bar and allow location for this site.',
      positionUnavailable: 'your device could not determine your location. Check that system location is turned on and try again.',
      timeout: 'getting your location timed out. Move near a window or step outside and try again.',
      unknown: 'your location could not be obtained.',
      requiredIntro: 'Cannot clock in: {reason}',
      optionalIntro: 'Clocking in without location: {reason}',
      abortedCheckIn: 'Could not clock in because your location was not obtained, and your company requires it.',
      abortedCheckOut: 'Could not clock out because your location was not obtained, and your company requires it.'
    }
  }
}
