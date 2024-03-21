import getRooms from "@/server-actions/getRooms";
import { Room } from "@/types/Room";
import RoomContainer from "./_views/RoomContainer";

export default function RoomsPage() {
  const roomList: Room[] = getRooms();
  return (
    <>
      <RoomContainer rooms={roomList} />
    </>
  );
}
