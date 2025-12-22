export default {
  // Navegacion
  nav: {
    dashboard: 'Panel',
    workLogs: 'Registro de Horas',
    absences: 'Ausencias',
    requests: 'Solicitudes',
    profile: 'Perfil',
    signOut: 'Cerrar sesion',
    yourProfile: 'Tu Perfil',
    language: 'Idioma',
    employee: 'Empleado'
  },

  // Autenticacion
  auth: {
    signIn: 'Inicia sesion en tu cuenta',
    createAccount: 'Crea una cuenta',
    email: 'Correo electronico',
    password: 'Contrasena',
    confirmPassword: 'Confirmar contrasena',
    fullName: 'Nombre completo',
    rememberMe: 'Recordarme',
    forgotPassword: 'Olvidaste tu contrasena?',
    signInButton: 'Iniciar sesion',
    signingIn: 'Iniciando sesion...',
    createAccountButton: 'Crear cuenta',
    creatingAccount: 'Creando cuenta...',
    noAccount: 'No tienes cuenta?',
    hasAccount: 'Ya tienes cuenta?',
    register: 'Registrarse',
    login: 'Iniciar sesion',
    validation: {
      emailRequired: 'El correo es requerido',
      passwordRequired: 'La contrasena es requerida',
      nameRequired: 'El nombre es requerido',
      passwordMin: 'La contrasena debe tener al menos 8 caracteres',
      passwordMismatch: 'Las contrasenas no coinciden'
    }
  },

  // Panel principal
  dashboard: {
    welcome: 'Bienvenido, {name}',
    currentStatus: 'Estado Actual',
    weeklySummary: 'Resumen Semanal',
    pendingRequests: 'Solicitudes Pendientes',
    quickActions: 'Acciones Rapidas',
    viewAll: 'Ver todo',
    totalHours: 'Horas totales',
    daysWorked: 'Dias trabajados',
    noWorkLogs: 'No hay registros de horas para esta semana.',
    noPendingRequests: 'No hay solicitudes pendientes.',
    createNewRequest: 'Crear nueva solicitud',
    workingSince: 'Trabajando desde',
    duration: 'Duracion',
    onBreak: 'En descanso',
    startedAt: 'Inicio a las',
    breakTime: 'Tiempo de descanso',
    offsite: 'Fuera de oficina',
    leftAt: 'Salio a las',
    timeOffsite: 'Tiempo fuera',
    lastCheckedOut: 'Ultima salida',
    notCheckedIn: 'No has registrado entrada hoy.',
    pending: 'Pendiente'
  },

  // Estados de trabajo
  workStatus: {
    notWorking: 'Sin trabajar',
    working: 'Trabajando',
    onBreak: 'En Descanso',
    offsite: 'Fuera de Oficina',
    startShift: 'Iniciar Turno',
    endShift: 'Finalizar Turno',
    startBreak: 'Iniciar Descanso',
    returnFromBreak: 'Volver del Descanso',
    goOffsite: 'Salir de Oficina',
    returnToOffice: 'Volver a Oficina',
    takeBreak: 'Tomar un descanso',
    startYourShift: 'Iniciar tu turno',
    endYourShift: 'Finalizar tu turno',
    goOffsiteAction: 'Salir de oficina',
    returnToOfficeAction: 'Volver a la oficina'
  },

  // Registro de horas
  workLogs: {
    title: 'Registro de Horas',
    daily: 'Diario',
    weekly: 'Semanal',
    monthly: 'Mensual',
    today: 'Hoy',
    thisWeek: 'Esta Semana',
    thisMonth: 'Este Mes',
    totalDays: 'Total dias',
    totalHours: 'Total horas',
    noWorkLogs: 'No se encontraron registros',
    noWorkLogsForPeriod: 'No hay registros de horas para este periodo.',
    noLogsForDay: 'No hay registros para este dia',
    checkIn: 'Entrada',
    checkOut: 'Salida',
    time: 'Hora',
    type: 'Tipo',
    category: 'Categoria',
    notes: 'Notas',
    day: 'Dia',
    date: 'Fecha',
    exportPdf: 'Exportar PDF',
    exporting: 'Exportando...',
    exportSuccess: 'PDF exportado correctamente',
    exportError: 'Error al exportar PDF',
    duration: 'Duracion'
  },

  // Ausencias
  absences: {
    title: 'Ausencias',
    viewAndFilter: 'Ver y filtrar tus ausencias',
    list: 'Lista',
    calendar: 'Calendario',
    absenceType: 'Tipo de Ausencia',
    allTypes: 'Todos los Tipos',
    from: 'Desde',
    to: 'Hasta',
    noAbsences: 'No se encontraron ausencias',
    noRecordedAbsences: 'No tienes ausencias registradas.',
    noMatchFilter: 'No hay ausencias que coincidan con el filtro.',
    duration: 'Duracion',
    status: 'Estado',
    fullDay: 'Dia completo',
    partialDay: 'Dia parcial',
    absence: 'Ausencia'
  },

  // Solicitudes
  requests: {
    title: 'Solicitudes de Ausencia',
    newRequest: 'Nueva Solicitud',
    all: 'Todas',
    pending: 'Pendientes',
    approved: 'Aprobadas',
    rejected: 'Rechazadas',
    noRequests: 'No se encontraron solicitudes',
    noRequestsYet: 'Aun no has enviado ninguna solicitud de ausencia.',
    noFilterResults: 'No se encontraron solicitudes {status}.',
    createFirst: 'Crea tu primera solicitud',
    type: 'Tipo',
    dates: 'Fechas',
    days: 'Dias',
    daysCount: '{count} dia(s)',
    cancel: 'Cancelar',
    cancelRequest: 'Cancelar solicitud',
    cancelConfirmTitle: 'Cancelar Solicitud',
    cancelConfirmMessage: 'Estas seguro de que quieres cancelar esta solicitud de ausencia? Esta accion no se puede deshacer.',
    keepRequest: 'Mantener Solicitud',
    yesCancelIt: 'Si, Cancelar',
    cancelling: 'Cancelando...',
    cancelSuccess: 'Solicitud cancelada correctamente',
    cancelError: 'Error al cancelar la solicitud',
    partial: 'Parcial',
    reason: 'Motivo',
    actions: 'Acciones'
  },

  // Nueva solicitud
  newRequest: {
    title: 'Nueva Solicitud de Ausencia',
    backToRequests: 'Volver a solicitudes',
    absenceType: 'Tipo de Ausencia',
    selectType: 'Seleccionar tipo de ausencia',
    availableVacation: 'Dias de vacaciones disponibles',
    startDate: 'Fecha de Inicio',
    endDate: 'Fecha de Fin',
    daysRequested: 'Dias solicitados',
    notEnoughVacation: 'No tienes suficientes dias de vacaciones disponibles.',
    partialAbsence: 'Ausencia parcial',
    partialHint: 'Marca esto si solo necesitas unas horas libres',
    startTime: 'Hora de Inicio',
    endTime: 'Hora de Fin',
    notes: 'Notas (opcional)',
    notesPlaceholder: 'Anade cualquier informacion adicional sobre tu solicitud...',
    characters: 'caracteres',
    requiresApproval: 'Este tipo de ausencia requiere aprobacion del supervisor. Tu solicitud quedara pendiente hasta ser revisada.',
    submit: 'Enviar Solicitud',
    submitting: 'Enviando...',
    submitSuccess: 'Solicitud de ausencia enviada correctamente',
    submitError: 'Error al enviar la solicitud de ausencia',
    newAbsenceRequest: 'Nueva solicitud de ausencia',
    viewWorkLogs: 'Ver registro de horas'
  },

  // Perfil
  profile: {
    title: 'Perfil',
    personalInfo: 'Informacion Personal',
    employmentInfo: 'Informacion Laboral',
    fullName: 'Nombre Completo',
    email: 'Correo Electronico',
    idNumber: 'Numero de Identificacion',
    phone: 'Telefono',
    birthDate: 'Fecha de Nacimiento',
    role: 'Rol',
    workScheduleStart: 'Inicio de Horario',
    workScheduleEnd: 'Fin de Horario',
    remainingVacation: 'Dias de Vacaciones Restantes',
    days: 'dias',
    status: 'Estado',
    active: 'Activo',
    inactive: 'Inactivo',
    notProvided: 'No proporcionado'
  },

  // Mensajes de notificacion
  messages: {
    loginSuccess: 'Sesion iniciada correctamente',
    loginFailed: 'Error al iniciar sesion',
    registerSuccess: 'Registro exitoso',
    registerFailed: 'Error en el registro',
    logoutSuccess: 'Sesion cerrada correctamente',
    profileUpdated: 'Perfil actualizado correctamente',
    profileUpdateFailed: 'Error al actualizar el perfil',
    passwordChanged: 'Contrasena cambiada correctamente',
    passwordChangeFailed: 'Error al cambiar la contrasena',
    fetchError: 'Error al obtener los datos',
    savedOffline: 'Guardado para sincronizar cuando se restaure la conexion',
    invalidResponse: 'Respuesta invalida del servidor',
    locationReady: 'Ubicacion lista',
    locationError: 'Error de ubicacion',
    locationPending: 'Ubicacion pendiente',
    gettingLocation: 'Obteniendo ubicacion...',
    offlineActionsWillSync: 'Sin conexion - las acciones se sincronizaran despues'
  },

  // Comunes
  common: {
    loading: 'Cargando...',
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    close: 'Cerrar',
    yes: 'Si',
    no: 'No',
    confirm: 'Confirmar',
    back: 'Volver',
    next: 'Siguiente',
    required: 'requerido',
    optional: 'opcional',
    allRightsReserved: 'Todos los derechos reservados'
  },

  // Selector de idioma
  language: {
    english: 'Ingles',
    spanish: 'Espanol',
    changeLanguage: 'Cambiar idioma',
    languageChanged: 'Idioma cambiado correctamente'
  }
}
