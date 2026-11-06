import LibraryPage from './pages/LibraryPage.jsx'
import TeachersPage from './pages/TeachersPage.jsx'
import { useRoute } from './hooks/useRoute.js'

export default function App() {
  const route = useRoute()

  return route === 'teachers' ? <TeachersPage /> : <LibraryPage />
}
