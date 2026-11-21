import type { Batch, Candidate } from '../types'

const candidates = (names: string[], base: number): Candidate[] => names.map((name, index) => ({
  id: `C-${String(base + index).padStart(4, '0')}`,
  name,
  email: `${name.toLowerCase().replaceAll(' ', '.')}@example.com`,
  phone: `+91 98${String(base + index).padStart(8, '0')}`,
}))

export const initialBatches: Batch[] = [
  {
    id: 'batch-014', batchNumber: 'CF-2026-014', courseName: 'Full Stack Web Development',
    candidateCount: 28, status: 'DRAFT', createdAt: '2026-11-20',
    candidates: candidates(['Aarav Sharma', 'Diya Patel', 'Arjun Mehta', 'Ananya Rao'], 1401),
  },
  {
    id: 'batch-013', batchNumber: 'CF-2026-013', courseName: 'Data Analytics with Python',
    candidateCount: 32, status: 'DISTRICT_REVIEW', createdAt: '2026-11-18',
    candidates: candidates(['Riya Nair', 'Kabir Singh', 'Meera Iyer', 'Vivaan Shah'], 1301),
  },
  {
    id: 'batch-012', batchNumber: 'CF-2026-012', courseName: 'Cloud Computing Fundamentals',
    candidateCount: 24, status: 'QUALITY_REVIEW', createdAt: '2026-11-15',
    candidates: candidates(['Ishaan Gupta', 'Sara Khan', 'Aditya Joshi', 'Myra Desai'], 1201),
  },
  {
    id: 'batch-011', batchNumber: 'CF-2026-011', courseName: 'Digital Marketing & Strategy',
    candidateCount: 30, status: 'STATE_REVIEW', createdAt: '2026-11-12',
    candidates: candidates(['Aanya Menon', 'Reyansh Verma', 'Ira Kulkarni', 'Dev Malhotra'], 1101),
  },
  {
    id: 'batch-010', batchNumber: 'CF-2026-010', courseName: 'UI/UX Design Essentials',
    candidateCount: 18, status: 'APPROVED', createdAt: '2026-11-08',
    candidates: candidates(['Anvi Kapoor', 'Krish Reddy', 'Tara Bose', 'Neil Fernandes'], 1001),
  },
  {
    id: 'batch-009', batchNumber: 'CF-2026-009', courseName: 'Cybersecurity Foundations',
    candidateCount: 26, status: 'ISSUED', createdAt: '2026-11-04',
    candidates: candidates(['Aarav Sharma', 'Saanvi Roy', 'Dhruv Bhat', 'Kiara Thomas'], 901),
  },
  {
    id: 'batch-008', batchNumber: 'CF-2026-008', courseName: 'Business Communication',
    candidateCount: 22, status: 'RETURNED', createdAt: '2026-10-29',
    candidates: candidates(['Aditi Sen', 'Yash Chawla', 'Nisha Pillai', 'Rohan Das'], 801),
  },
  {
    id: 'batch-007', batchNumber: 'CF-2026-007', courseName: 'Advanced Excel & Power BI',
    candidateCount: 34, status: 'ISSUED', createdAt: '2026-10-24',
    candidates: candidates(['Pranav Sethi', 'Mira Sood', 'Om Prakash', 'Zoya Ali'], 701),
  },
]

export const recentActivity = [
  { initials: 'AS', name: 'Ananya Sharma', action: 'created a new batch', target: 'CF-2026-014', time: '2 hours ago', tone: 'blue' },
  { initials: 'DR', name: 'District review', action: 'started for', target: 'CF-2026-013', time: 'Yesterday', tone: 'violet' },
  { initials: 'CE', name: 'Certificates issued', action: 'for', target: 'CF-2026-009', time: '2 days ago', tone: 'green' },
]
