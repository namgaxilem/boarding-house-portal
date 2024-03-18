import getRooms from "@/server-actions/getRooms";
import { Room } from "@/types/Room";

export default function RoomsPage() {
  const roomList: Room[] = getRooms();
  return <>RoomsPage</>;
}
