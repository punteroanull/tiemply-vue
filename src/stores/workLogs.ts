import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'
import { useToast } from 'vue-toastification'
import { useAuthStore } from './auth'

interface WorkLog {
  id: string
  uuid: string
  employee_id: string
  date: string
  time: string
  type: 'check_in' | 'check_out'
  category?: string
  paired_log_id?: string
  notes?: string
  formatted_duration?: string
}

interface WorkLogPair {
  date: string
  check_in?: WorkLog
  check_out?: WorkLog
  duration?: string
}

interface WorkLogReport {
  days: WorkLogPair[]
  total_duration: string
  total_days: number
}

export const useWorkLogsStore = defineStore('workLogs', () => {
  const toast = useToast()
  const authStore = useAuthStore()
  
  const dailyReport = ref<WorkLogReport | null>(null)
  const weeklyReport = ref<WorkLogReport | null>(null)
  const monthlyReport = ref<WorkLogReport | null>(null)
  const loading = ref(false)

  async function fetchDailyReport(period?: string) {
    if (!authStore.user?.id) return
    
    loading.value = true
    
    try {
      const employeeId = authStore.user.employeeRecords?.[0]?.id
      if (!employeeId) {
        throw new Error('Employee record not found')
      }
      
      const url = period 
        ? `/worklogs/daily-report/${employeeId}/${period}`
        : `/worklogs/daily-report/${employeeId}`
      
      const response = await api.get(url)
      dailyReport.value = response.data
    } catch (error) {
      console.error('Error fetching daily report:', error)
      toast.error('Failed to fetch daily work log report')
    } finally {
      loading.value = false
    }
  }

  async function fetchWeeklyReport(period?: string) {
    if (!authStore.user?.id) return
    
    loading.value = true
    
    try {
      const employeeId = authStore.user.employeeRecords?.[0]?.id
      if (!employeeId) {
        throw new Error('Employee record not found')
      }
      
      const url = period 
        ? `/worklogs/weekly-report/${employeeId}/${period}`
        : `/worklogs/weekly-report/${employeeId}`
      
      const response = await api.get(url)
      weeklyReport.value = response.data
    } catch (error) {
      console.error('Error fetching weekly report:', error)
      toast.error('Failed to fetch weekly work log report')
    } finally {
      loading.value = false
    }
  }

  async function fetchMonthlyReport(year?: number, month?: number) {
    if (!authStore.user?.id) return
    
    loading.value = true
    
    try {
      const employeeId = authStore.user.employeeRecords?.[0]?.id
      if (!employeeId) {
        throw new Error('Employee record not found')
      }
      
      let url = `/worklogs/monthly-report/${employeeId}`
      if (year && month) {
        url += `/${year}/${month}`
      }
      
      const response = await api.get(url)
      monthlyReport.value = response.data
    } catch (error) {
      console.error('Error fetching monthly report:', error)
      toast.error('Failed to fetch monthly work log report')
    } finally {
      loading.value = false
    }
  }

  return {
    dailyReport,
    weeklyReport,
    monthlyReport,
    loading,
    fetchDailyReport,
    fetchWeeklyReport,
    fetchMonthlyReport
  }
})