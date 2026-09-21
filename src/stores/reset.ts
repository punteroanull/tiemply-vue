/**
 * Drop every store's cached data.
 *
 * The signed-in identity can change without a full page load: entering or leaving an
 * impersonation, and signing in as someone else in the same tab. Nothing used to clear
 * the stores in those cases, so the previous person's shift state, reports and balances
 * stayed on screen.
 *
 * Stores are imported inside the function on purpose: importing them at module scope
 * would create a cycle with the auth store, which is the main caller.
 */
export async function resetAllStores(): Promise<void> {
  const [
    { useWorkStatusStore },
    { useWorkLogsStore },
    { useAbsencesStore },
    { useDepartmentsStore },
    { useHourPoolStore },
    { useIncidentsStore },
    { useOvertimeStore },
    { useSchedulesStore },
  ] = await Promise.all([
    import("./workStatus"),
    import("./workLogs"),
    import("./absences"),
    import("./departments"),
    import("./hourPool"),
    import("./incidents"),
    import("./overtime"),
    import("./schedules"),
  ]);

  useWorkStatusStore().reset();
  useWorkLogsStore().reset();
  useAbsencesStore().reset();
  useDepartmentsStore().reset();
  useHourPoolStore().reset();
  useIncidentsStore().reset();
  useOvertimeStore().reset();
  useSchedulesStore().reset();
}
