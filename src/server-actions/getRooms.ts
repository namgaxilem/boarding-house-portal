import { Room } from "@/types/Room";

function generateRandomId() {
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var idLength = 8;
  var id = "";
  for (var i = 0; i < idLength; i++) {
    var randomIndex = Math.floor(Math.random() * characters.length);
    id += characters.charAt(randomIndex);
  }
  return id;
}

export default function getRooms(): Room[] {
  const myArray = [];

  for (var i = 0; i < 11; i++) {
    var obj = {
      id: generateRandomId(),
      // Add other properties as needed
    };
    myArray.push(obj);
  }
  return myArray;
}
