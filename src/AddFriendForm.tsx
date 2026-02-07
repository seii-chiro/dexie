import { useState } from 'react'
import { db } from '../db'

const AddFriendForm = ({ defaultAge } = { defaultAge: 21 }) => {
    const [name, setName] = useState("")
    const [age, setAge] = useState(defaultAge)
    const [status, setStatus] = useState("")

    async function addFriend() {
        try {
            // Add the new friend!
            const id = crypto.randomUUID()
            await db.friends.add({ id, name, age })

            // Debug: log outbox count after creating a friend
            const outboxCount = await db.outbox.count()
            console.debug('[outbox] count after addFriend', outboxCount)

            setStatus(`Friend ${name} successfully added. Got id ${id}`)
            setName("")
            setAge(defaultAge)
        } catch (error) {
            setStatus(`Failed to add ${name}: ${error}`)
        }
    }

    return (
        <>
            <p className={`${status.startsWith('Failed') ? 'text-red-700' : status ? 'text-green-700' : 'text-slate-500'} text-sm mb-2`}>
                {status}
            </p>

            <div className="flex flex-col gap-3">
                <label className="flex flex-col">
                    <span className="text-sm font-medium">Name</span>
                    <input
                        className="mt-1 px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        type="text"
                        value={name}
                        onChange={(ev) => setName(ev.target.value)}
                    />
                </label>

                <label className="flex flex-col">
                    <span className="text-sm font-medium">Age</span>
                    <input
                        className="mt-1 px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        type="number"
                        value={age}
                        onChange={(ev) => setAge(Number(ev.target.value))}
                    />
                </label>

                <div>
                    <button
                        className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                        onClick={addFriend}
                    >
                        Add
                    </button>
                </div>
            </div>
        </>
    )
}

export default AddFriendForm