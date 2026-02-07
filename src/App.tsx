import AddFriendForm from './AddFriendForm'
import './App.css'
import { FileUploadComponent, UploadedFilesList } from './FileUploadComponent'
import FriendList from './FriendList'
import SyncButton from './SyncButton'

function App() {
  const friendId = "f8752ed6-7168-4685-89fe-d7c10d1c12f6"

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">My simple Dexie app</h1>
          <SyncButton />
        </div>

        <section className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="text-xl font-semibold mb-2">Add Friend</h2>
          <AddFriendForm defaultAge={21} />
        </section>

        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-2">Friend List</h2>
          <FriendList minAge={18} maxAge={65} />
        </section>

        <section className="bg-white rounded-lg shadow p-4 mt-4">
          <h2 className="text-xl font-semibold mb-2">Upload File</h2>
          <FileUploadComponent friendId={friendId} />
        </section>

        <section className="bg-white rounded-lg shadow p-4 mt-4">
          <UploadedFilesList />
        </section>
      </div>
    </div>
  )
}

export default App
