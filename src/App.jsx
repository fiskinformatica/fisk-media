import LibraryPage from './pages/LibraryPage.jsx'
import TeachersPage from './pages/TeachersPage.jsx'
import StudentsPage from './pages/StudentsPage.jsx'
import { useRoute } from './hooks/useRoute.js'

export default function App() {
  const route = useRoute()

  if (route === 'teachers') return <TeachersPage />
  if (route === 'students') return <StudentsPage />
  return <LibraryPage />
}
