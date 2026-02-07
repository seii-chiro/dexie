import AddFriendForm from './AddFriendForm'
import './App.css'
import { AttachmentsList, FileUploadComponent } from './FileUploadComponent'
import FriendList from './FriendList'
import SyncButton from './SyncButton'

function App() {
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
      </div>

      <FileUploadComponent friendId="9293338c-a720-4d07-b798-8f39d0595aee" />
      <AttachmentsList friendId="9293338c-a720-4d07-b798-8f39d0595aee" />
    </div>
  )
}

export default App
