import LibraryBrowser from '../components/LibraryBrowser.jsx'
import PinGate from '../components/PinGate.jsx'
import { useAccess } from '../hooks/useAccess.js'

export default function LibraryPage() {
  const { isAuthorized, authorize, lock, sessionExpired } = useAccess()

  if (!isAuthorized) {
    return (
      <PinGate onAuthorize={authorize} sessionExpired={sessionExpired} />
    )
  }

  return <LibraryBrowser onLock={lock} />
}
