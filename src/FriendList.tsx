import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

const FriendList = ({ minAge, maxAge }: { minAge: number, maxAge: number }) => {
    const friends = useLiveQuery(async () => {
        const friends = await db.friends
            .where('age')
            .between(minAge, maxAge, true, true)
            .toArray()
        return friends
    }, [minAge, maxAge])

    if (!friends) return <p className="text-sm text-slate-500">Loading...</p>

    if (friends.length === 0) return <p className="text-sm text-slate-500">No friends found</p>

    console.log(friends)

    return (
        <ul className="space-y-2">
            {friends.map((friend) => (
                <li key={friend.id} className="flex items-center justify-between p-3 bg-slate-50 rounded border">
                    <div className="font-medium">{friend.name}</div>
                    <div className="text-sm text-slate-600">{friend.age}</div>
                </li>
            ))}
        </ul>
    )
}

export default FriendList